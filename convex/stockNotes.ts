import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get notes for a specific stock
 */
export const getNotes = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const { symbol } = args;

    const notes = await ctx.db
      .query("stock_notes")
      .withIndex("by_user_and_symbol", (q) =>
        q.eq("userId", userId).eq("symbol", symbol.toUpperCase())
      )
      .first();

    return notes;
  },
});

/**
 * Create or update notes for a stock
 */
export const saveNotes = mutation({
  args: {
    symbol: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { symbol, content } = args;
    const normalizedSymbol = symbol.toUpperCase();
    const now = Date.now();

    // Check if notes already exist
    const existing = await ctx.db
      .query("stock_notes")
      .withIndex("by_user_and_symbol", (q) =>
        q.eq("userId", userId).eq("symbol", normalizedSymbol)
      )
      .first();

    if (existing) {
      // Update existing notes
      await ctx.db.patch(existing._id, {
        content,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new notes
      const notesId = await ctx.db.insert("stock_notes", {
        userId,
        symbol: normalizedSymbol,
        content,
        createdAt: now,
        updatedAt: now,
      });
      return notesId;
    }
  },
});

/**
 * Delete notes for a stock
 */
export const deleteNotes = mutation({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { symbol } = args;

    const notes = await ctx.db
      .query("stock_notes")
      .withIndex("by_user_and_symbol", (q) =>
        q.eq("userId", userId).eq("symbol", symbol.toUpperCase())
      )
      .first();

    if (notes) {
      await ctx.db.delete(notes._id);
    }
  },
});
