import type { Id } from "@/convex/_generated/dataModel";

export interface UserProfile {
  _id: Id<"profiles">;
  _creationTime: number;
  userId: Id<"users">;
  username: string;
  displayName: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  avatarStorageId?: Id<"_storage">;
  bannerStorageId?: Id<"_storage">;
  email?: string;
  verified?: boolean;
  createdAt: number;
  isOwnProfile?: boolean;
}

export interface AuthUser {
  _id: Id<"users">;
  _creationTime: number;
  name?: string;
  email: string;
  emailVerificationTime?: number;
  phone?: string;
  phoneVerificationTime?: number;
  image?: string;
  isAnonymous?: boolean;
}