import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Shared helper functions for Convex backend operations
 */

/**
 * Enriches a single profile with current image URLs from storage
 */
export async function enrichProfileWithUrls(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"profiles"> | null
): Promise<Doc<"profiles"> | null> {
  if (!profile) return null;

  let currentAvatarUrl = profile.avatarUrl;
  let currentBannerUrl = profile.bannerUrl;

  if (profile.avatarStorageId) {
    currentAvatarUrl = (await ctx.storage.getUrl(profile.avatarStorageId)) ?? undefined;
  }

  if (profile.bannerStorageId) {
    currentBannerUrl = (await ctx.storage.getUrl(profile.bannerStorageId)) ?? undefined;
  }

  return {
    ...profile,
    avatarUrl: currentAvatarUrl,
    bannerUrl: currentBannerUrl,
  };
}

/**
 * Enriches multiple profiles with current image URLs from storage
 */
export async function enrichProfilesWithUrls(
  ctx: QueryCtx | MutationCtx,
  profiles: (Doc<"profiles"> | null)[]
): Promise<(Doc<"profiles"> | null)[]> {
  return Promise.all(profiles.map((p) => enrichProfileWithUrls(ctx, p)));
}

/**
 * Batch fetch profiles by user IDs and return as a Map
 */
export async function batchFetchProfilesByUserIds(
  ctx: QueryCtx | MutationCtx,
  userIds: Id<"users">[]
): Promise<Map<Id<"users">, Doc<"profiles">>> {
  const profiles = await Promise.all(
    userIds.map((userId) =>
      ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first()
    )
  );

  const map = new Map<Id<"users">, Doc<"profiles">>();
  userIds.forEach((userId, idx) => {
    if (profiles[idx]) {
      map.set(userId, profiles[idx]!);
    }
  });
  return map;
}
