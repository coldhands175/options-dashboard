export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface ErrorState {
  message: string;
  action?: () => void;
  actionLabel?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface FormData {
  [key: string]: string | number | boolean | undefined;
}