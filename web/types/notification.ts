// This file is kept for backwards compatibility but social notifications have been removed
// New notification types are available in the Convex schema

import type { Id } from "@/convex/_generated/dataModel";

// Placeholder type - no longer actively used but kept to avoid breaking imports
export interface NotificationsResponse {
  notifications: [];
  hasMore?: boolean;
  cursor?: string;
}