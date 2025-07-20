import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Get or create a user in Convex database synchronized with Xano auth
 */
export const syncUser = mutation({
  args: {
    email: v.string(),
    xanoUserId: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        xanoUserId: args.xanoUserId,
        firstName: args.firstName,
        lastName: args.lastName,
        lastLogin: now,
        loginCount: (existingUser.loginCount || 0) + 1,
        updatedAt: now,
      });
      return existingUser._id;
    }

    // Determine role based on admin email list
    const adminEmails = ['msbaxter@gmail.com']; // Add more admin emails as needed
    const role = adminEmails.includes(args.email.toLowerCase()) ? "ADMIN" : "USER";

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      xanoUserId: args.xanoUserId,
      firstName: args.firstName,
      lastName: args.lastName,
      name: args.firstName && args.lastName 
        ? `${args.firstName} ${args.lastName}` 
        : args.firstName || args.lastName || args.email.split('@')[0],
      role,
      isActive: true,
      lastLogin: now,
      loginCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

/**
 * Get current user by email (used for authentication context)
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  returns: v.union(v.null(), v.object({
    _id: v.id("users"),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.union(v.literal("ADMIN"), v.literal("USER")),
    isActive: v.boolean(),
    lastLogin: v.optional(v.string()),
    preferences: v.optional(v.object({
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
      notifications: v.optional(v.boolean()),
      defaultBroker: v.optional(v.string()),
    })),
    createdAt: v.string(),
  })),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user || !user.isActive) {
      return null;
    }

    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      preferences: user.preferences,
      createdAt: user.createdAt,
    };
  },
});

/**
 * Get user by Convex ID (internal helper)
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), v.object({
    _id: v.id("users"),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.union(v.literal("ADMIN"), v.literal("USER")),
    isActive: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    if (!user || !user.isActive) {
      return null;
    }

    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
  },
});

/**
 * Check if a user is an admin
 */
export const isUserAdmin = query({
  args: { 
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    let user;
    
    if (args.userId) {
      user = await ctx.db.get(args.userId);
    } else if (args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .unique();
    }

    return user?.role === "ADMIN" && user.isActive === true;
  },
});

/**
 * Update user preferences
 */
export const updateUserPreferences = mutation({
  args: {
    userId: v.id("users"),
    preferences: v.object({
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
      notifications: v.optional(v.boolean()),
      defaultBroker: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      preferences: args.preferences,
      updatedAt: new Date().toISOString(),
    });

    return null;
  },
});

/**
 * Internal function to get user ID from email (used by other functions)
 */
export const getUserIdFromEmail = query({
  args: { email: v.string() },
  returns: v.union(v.null(), v.id("users")),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    return user?.isActive ? user._id : null;
  },
});

/**
 * Deactivate user account
 */
export const deactivateUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // TODO: Add admin check here when implementing proper authentication context
    await ctx.db.patch(args.userId, {
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
    
    return null;
  },
});
