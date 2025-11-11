import { internalMutation } from "../_generated/server";

/**
 * Migration to remove old social feature fields from profiles table
 * Removes: followersCount, followingCount, postsCount
 */
export const cleanProfilesSchema = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all profiles
    const profiles = await ctx.db.query("profiles").collect();

    let updated = 0;

    for (const profile of profiles) {
      // Check if profile has any of the old fields
      const hasOldFields =
        'followersCount' in profile ||
        'followingCount' in profile ||
        'postsCount' in profile;

      if (hasOldFields) {
        // Create a clean copy without the old fields
        const { followersCount, followingCount, postsCount, ...cleanProfile } = profile as any;

        // Replace the document with the clean version
        await ctx.db.replace(profile._id, cleanProfile);
        updated++;
      }
    }

    return {
      success: true,
      totalProfiles: profiles.length,
      updatedProfiles: updated
    };
  },
});
