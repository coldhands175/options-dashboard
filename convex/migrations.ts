import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

async function removeMultiplier(ctx: any) {
  let scanned = 0;
  let updated = 0;
  const rows = await ctx.db.query("option_trades").collect();
  for (const t of rows as any[]) {
    scanned++;
    if (t.multiplier !== undefined) {
      const { _id, multiplier, ...rest } = t;
      await ctx.db.replace(_id, rest);
      updated++;
    }
  }
  return { scanned, updated };
}

export const removeMultiplierFromOptionTrades = internalMutation({
  args: {},
  returns: v.object({ scanned: v.number(), updated: v.number() }),
  handler: async (ctx) => {
    return await removeMultiplier(ctx);
  },
});

export const runRemoveMultiplierFromOptionTrades = mutation({
  args: {},
  returns: v.object({ scanned: v.number(), updated: v.number() }),
  handler: async (ctx) => {
    return await removeMultiplier(ctx);
  },
});

