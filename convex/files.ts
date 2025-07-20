import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper function to check if user is admin
const requireAdmin = async (ctx: any, userEmail: string) => {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", userEmail))
    .unique();
  
  if (!user || !user.isActive || user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  
  return user;
};

// Generate upload URL for file storage (Admin only)
export const generateUploadUrl = mutation({
  args: {
    userEmail: v.string(), // Email of the requesting user
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Check admin permissions
    await requireAdmin(ctx, args.userEmail);
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Delete file from storage (Admin only)
export const deleteFile = mutation({
  args: {
    storageId: v.string(),
    userEmail: v.string(), // Email of the requesting user
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check admin permissions
    await requireAdmin(ctx, args.userEmail);
    
    await ctx.storage.delete(args.storageId);
    return null;
  },
});

// Get file URL (can be accessed by authenticated users)
export const getFileUrl = query({
  args: {
    storageId: v.string(),
  },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Create document record with admin check
export const createDocument = mutation({
  args: {
    userEmail: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    storageId: v.string(),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    // Check admin permissions
    const user = await requireAdmin(ctx, args.userEmail);
    
    const now = new Date().toISOString();
    
    return await ctx.db.insert("documents", {
      userId: user._id,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      storageId: args.storageId,
      status: "UPLOADING",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update document status (internal use)
export const updateDocumentStatus = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("UPLOADING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    errorMessage: v.optional(v.string()),
    extractedTradesCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: args.status,
      errorMessage: args.errorMessage,
      extractedTradesCount: args.extractedTradesCount,
      updatedAt: new Date().toISOString(),
    });
    
    return null;
  },
});
