import React, { ReactNode } from "react";
import { ConvexProvider as BaseConvexProvider, ConvexReactClient } from "convex/react";
import { api } from '../../convex/_generated/api';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

interface ConvexClientProviderProps {
  children: ReactNode;
}

export function ConvexProvider({ children }: ConvexClientProviderProps) {
  return (
    <BaseConvexProvider client={convex}>
      {children}
    </BaseConvexProvider>
  );
}

export { convex, api };

// Re-export hooks for easier use
export { useQuery, useMutation } from 'convex/react';
