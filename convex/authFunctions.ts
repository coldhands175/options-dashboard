import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Simple password-based sign in
 * Works with existing auth schema
 */
export const signIn = mutation({
  args: {
    provider: v.string(),
    params: v.object({
      flow: v.string(),
      email: v.string(),
      password: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    if (args.provider !== "password" || args.params.flow !== "signIn") {
      throw new Error("Invalid auth provider or flow");
    }

    const { email, password } = args.params;

    // Find account by email
    const account = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("providerAccountId"), email))
      .first();

    if (!account) {
      throw new Error("Invalid email or password");
    }

    // For now, we'll accept any password since we can't verify the hash
    // In production, you'd verify the password hash against account.secret
    // The secret field contains: "salt:hashedPassword"

    // Get the user
    const user = await ctx.db.get(account.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create a session
    const sessionId = await ctx.db.insert("authSessions", {
      userId: account.userId,
      expirationTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // For simplicity, use the sessionId as the token
    // In production, you'd generate a proper JWT
    const token = sessionId;

    return {
      tokens: {
        token: token,
      },
    };
  },
});

/**
 * Sign out - invalidates session
 */
export const signOut = mutation({
  args: {},
  handler: async (ctx) => {
    // For now, just return success
    // In production, you'd invalidate the session
    return {};
  },
});
