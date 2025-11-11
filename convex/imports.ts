import { v } from "convex/values";
import { action, internalAction, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Enqueue one or more PDF files for processing.
export const enqueuePdfImports = mutation({
  args: { files: v.array(v.object({ fileId: v.id("_storage"), fileName: v.string() })) },
  returns: v.object({ enqueued: v.number(), skipped: v.number(), importIds: v.array(v.id("imports")), batchId: v.string() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    let enqueued = 0, skipped = 0;
    const importIds: Array<Id<"imports">> = [] as any;
    const batchId = `batch_${Date.now()}`;

    for (const f of args.files) {
      const fileId = f.fileId;
      const fileName = f.fileName;
      // read file SHA to avoid duplicate imports of same content
      const meta = await ctx.db.system.get(fileId);
      const sha = (meta as any)?.sha256 as string | undefined;
      if (sha) {
        const dup = await ctx.db
          .query("imports")
          .withIndex("by_user_and_fileSha", (q) => q.eq("userId", userId).eq("fileSha256", sha))
          .first();
        if (dup && (dup.status === "running" || dup.status === "succeeded")) {
          skipped++;
          continue;
        }
      }

      const importId = await ctx.db.insert("imports", {
        userId,
        fileId,
        fileSha256: sha,
        fileName,
        status: "queued" as const,
        // store batch for UI grouping
        batchId,
        createdAt: Date.now(),
      } as any);
      await ctx.scheduler.runAfter(0, internal.imports.processImportJob, { importId });
      importIds.push(importId as any);
      enqueued++;
    }

    return { enqueued, skipped, importIds: importIds as any, batchId };
  }
});

// Retry a failed job
export const retryImport = mutation({
  args: { importId: v.id("imports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const job = await ctx.db.get(args.importId);
    if (!job || job.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.importId, { status: "queued", errorMessage: undefined, startedAt: undefined, finishedAt: undefined, createdCount: undefined });
    await ctx.scheduler.runAfter(0, internal.imports.processImportJob, { importId: args.importId });
    return null;
  }
});

// List recent jobs
export const listMyImports = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("imports"),
    _creationTime: v.number(),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("succeeded"), v.literal("failed")),
    createdCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    fileName: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const limit = Math.min(args.limit ?? 20, 100);
    const rows = await ctx.db
      .query("imports")
      .withIndex("by_user_and_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
    return rows.map((r) => ({
      _id: r._id,
      _creationTime: r._creationTime,
      status: r.status,
      createdCount: r.createdCount,
      errorMessage: r.errorMessage,
      fileName: (r as any).fileName,
    }));
  }
});

// Worker: process a single import job. Safe for retries.
export const processImportJob = internalAction({
  args: { importId: v.id("imports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Atomically claim this job for the user; if another job is running, reschedule
    const claimed = await ctx.runMutation(api.imports._claimIfIdle, { importId: args.importId });
    if (!claimed) {
      await ctx.scheduler.runAfter(2000, internal.imports.processImportJob, { importId: args.importId });
      return null;
    }

    // Fetch minimal job info after claim
    const job = await ctx.runQuery(api.imports._getJob, { importId: args.importId });
    if (!job) return null;

    try {
      // NEW WORKFLOW: Try positional parser first, with heuristic fallback
      let result: { created: number };
      try {
        result = await ctx.runAction(api.pdf.extractTradesToPendingPositional, {
          fileId: job.fileId,
          importId: args.importId,
          userId: job.userId,
        });
      } catch (posError: any) {
        console.log(
          "[IMPORTS] Positional parser failed, falling back to heuristic:",
          posError?.message ?? posError
        );
        result = await ctx.runAction(api.pdf.extractTradesToPendingReview, {
          fileId: job.fileId,
          importId: args.importId,
          userId: job.userId,
        });
      }
      await ctx.runMutation(api.imports._markSucceeded, { importId: args.importId, created: result.created });
    } catch (e: any) {
      await ctx.runMutation(api.imports._markFailed, { importId: args.importId, errorMessage: String(e?.message || e) });
    }

    return null;
  }
});

// Internals for the worker above
export const _getJob = query({
  args: { importId: v.id("imports") },
  returns: v.union(v.null(), v.object({ userId: v.id("users"), fileId: v.id("_storage") })),
  handler: async (ctx, args) => {
    const j = await ctx.db.get(args.importId);
    if (!j) return null;
    return { userId: j.userId, fileId: j.fileId };
  }
});

export const _hasRunningForUser = query({
  args: { userId: v.id("users"), exceptId: v.id("imports") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("imports")
      .withIndex("by_user_and_status", (q) => q.eq("userId", args.userId).eq("status", "running"))
      .first();
    return !!row && row._id !== args.exceptId;
  }
});

// Atomically claim a job if no other job is running for the same user.
export const _claimIfIdle = mutation({
  args: { importId: v.id("imports") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const j = await ctx.db.get(args.importId);
    if (!j) return false;

    // If already running/succeeded/failed, do nothing
    if (j.status !== "queued") return false;

    const running = await ctx.db
      .query("imports")
      .withIndex("by_user_and_status", (q) => q.eq("userId", j.userId).eq("status", "running"))
      .first();

    if (running) return false;

    await ctx.db.patch(args.importId, { status: "running", startedAt: Date.now(), errorMessage: undefined });
    return true;
  }
});

export const _markRunning = mutation({
  args: { importId: v.id("imports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.importId, { status: "running", startedAt: Date.now(), errorMessage: undefined });
    return null;
  }
});

export const _markSucceeded = mutation({
  args: { importId: v.id("imports"), created: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.importId, { status: "succeeded", finishedAt: Date.now(), createdCount: args.created });
    return null;
  }
});

export const _markFailed = mutation({
  args: { importId: v.id("imports"), errorMessage: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.importId, { status: "failed", finishedAt: Date.now(), errorMessage: args.errorMessage });
    return null;
  }
});
