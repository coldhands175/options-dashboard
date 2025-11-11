// This file is kept for backwards compatibility but social features have been removed
// The post-related infrastructure has been replaced with a trading dashboard

import type { Id } from "@/convex/_generated/dataModel";

// Placeholder types - no longer actively used but kept to avoid breaking imports
export interface PostsResponse {
  posts: [];
  hasMore?: boolean;
  cursor?: string;
}