"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  const convex = useMemo(() => (url ? new ConvexReactClient(url) : null), [url]);

  if (!convex) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h2 className="text-lg font-semibold">Convex not configured</h2>
          <p className="text-sm opacity-80">
            Missing environment variable <code>NEXT_PUBLIC_CONVEX_URL</code>.
          </p>
          <ol className="text-left text-sm opacity-80 list-decimal list-inside space-y-1">
            <li>Open a new terminal and run <code>npm run dev:backend</code>.</li>
            <li>Follow the prompts to sign in and link your Convex project.</li>
            <li>Restart the Next.js dev server after <code>.env.local</code> is updated.</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}
