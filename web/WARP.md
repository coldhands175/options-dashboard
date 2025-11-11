# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- Stack: Next.js (App Router) + Convex backend + Tailwind CSS v4 + Convex Auth
- Key folders: app/ (routes and UI), convex/ (database schema and server functions), components/ (UI), lib/ (utilities)

Common commands
- Install dependencies
```bash path=null start=null
npm install
```
- Start local development (runs Next.js and Convex together)
```bash path=null start=null
npm run dev
```
  - This invokes Next.js dev server and `convex dev`. On first run, a setup script may prompt to configure Convex Auth and open the Convex dashboard.
- Start frontend only
```bash path=null start=null
npm run dev:frontend
```
- Start backend (Convex) only
```bash path=null start=null
npm run dev:backend
```
- Build production assets (Next.js)
```bash path=null start=null
npm run build
```
- Run production server (after build)
```bash path=null start=null
npm run start
```
- Lint (ESLint with Next.js config)
```bash path=null start=null
npm run lint
```
- Tests
  - No test runner is configured in this repo at the moment (no Jest/Vitest scripts or configs present).

Environment and tooling
- Environment variables
  - NEXT_PUBLIC_CONVEX_URL must be available in the browser (Convex React client is created from it). Typically written to .env.local by Convex during `convex dev`.
  - The first run of `npm run dev` triggers a setup script (setup.mjs) that runs `npx @convex-dev/auth` to help configure Convex Auth.
- Tailwind CSS v4
  - Configured via PostCSS plugin (`postcss.config.mjs` uses `@tailwindcss/postcss`). Global styles live in `app/globals.css`.
- ESLint
  - Flat config at `eslint.config.mjs` extends `next/core-web-vitals` and `next/typescript`.

High-level architecture
- Next.js App Router (app/)
  - Routes: `app/page.tsx` (marketing/auth landing), `app/feed`, `app/explore`, `app/messages`, `app/notifications`, `app/bookmarks`, `app/profile/[username]`, `app/post/[id]`, `app/settings/profile`, `app/signin`, plus an example server route under `app/server`.
  - Global layout `app/layout.tsx` wraps the app with Convex providers: `ConvexAuthNextjsServerProvider` on the server and a client-side `ConvexClientProvider` that creates a `ConvexReactClient` from `process.env.NEXT_PUBLIC_CONVEX_URL`. Vercel Analytics is included.
  - UI components under `components/` (e.g., `Sidebar`, `RightPanel`, post components, shared UI like `components/ui/button.tsx`) and utilities under `lib/` (`lib/utils.ts` provides the `cn` helper via clsx + tailwind-merge).
  - Styling
    - Tailwind v4 is imported in `app/globals.css`. The theme uses CSS custom properties and `@theme inline` for color/font tokens.

- Convex backend (convex/)
  - Entry points and wiring
    - `convex/http.ts` registers HTTP routes from Convex Auth via `auth.addHttpRoutes(http)` and exports the router. Public HTTP endpoints should be added here using `httpAction`.
    - `convex/auth.ts` configures Convex Auth with the Password provider and implements an `afterUserCreatedOrUpdated` callback that provisions a default user profile with a unique username.
    - `convex/auth.config.ts` defines an auth provider referencing `process.env.CONVEX_SITE_URL`.
  - Data model (convex/schema.ts)
    - Includes `authTables` and custom tables for:
      - profiles: user profile and media fields; indexes for lookup by user and username; search indexes for username and displayName.
      - posts: content with relations to reply/quote posts; indexes by author and createdAt.
      - follows, likes, reposts, bookmarks: relational/engagement data with supporting indexes.
      - notifications: user notifications with indexes for unread and by user.
      - conversations, messages: direct messaging with conversation/message indexes.
      - numbers: demo table used by example functions.
  - Domain modules
    - `profiles.ts`: create/update/get/search profiles; follow/unfollow; followers/following lists; suggested users. Media URLs are resolved at read-time via `ctx.storage.getUrl` when storageIds are present.
    - `posts.ts`: create/get/feed/replies/like/unlike/repost/bookmark/unbookmark/search/trending; updates denormalized counts; mention and reply notifications are created.
    - `messages.ts`: conversations (create/find), send messages, list conversations/messages with pagination and unread counts; mark messages read; search users to message.
    - `notifications.ts`: list/mark read/unread count/delete; helper mutations to create notifications (single or in bulk for mentions).
    - `files.ts`: storage helpers for generating upload URLs, getting/deleting files.
    - `myFunctions.ts`: example query/mutation/action operating on the `numbers` table; also shows `ctx.runQuery`/`ctx.runMutation` usage.

How things fit together
- Auth flow
  - Client uses `@convex-dev/auth` hooks (`useAuthActions`, `useConvexAuth`) in client components (e.g., `app/page.tsx`) for sign-in/sign-out. The server layout uses `ConvexAuthNextjsServerProvider` to make auth/server context available.
  - After a user is created, a corresponding profile document is created automatically (`convex/auth.ts`).
- Posting and engagement
  - Creating a post writes to `posts`, updates the author’s profile `postsCount`, and may generate notifications for replies and mentions.
  - Likes/reposts/bookmarks are separate tables with indexes to support quick lookups and to compute engagement flags when reading posts.
- Messaging
  - Conversations are between two users. Sending a message writes to `messages` and updates the conversation’s `lastMessage*` fields. Unread counts are derived by querying unread messages not sent by the current user.
- Media and avatars
  - Profile avatar/banner URLs are computed dynamically with `ctx.storage.getUrl` based on stored IDs to ensure clients get up-to-date signed URLs.

Local rules to respect (from .cursor/rules/convex_rules.mdc)
- Always use the new Convex function syntax (query/mutation/action/internal* with args and returns validators). Use `v.null()` when returning nothing.
- Register HTTP endpoints in `convex/http.ts` using `httpAction`.
- Use validators for all args and returns. Keep types strict (prefer `Id<'table'>` over string where applicable).
- Call other Convex functions via `ctx.runQuery`, `ctx.runMutation`, or `ctx.runAction` with function references from `convex/_generated/api` (`api.*` for public, `internal.*` for internal).
- Prefer `withIndex`/`withSearchIndex` over unindexed `.filter` to avoid table scans. Use `.unique()` when a single row is expected.
- Actions must not use `ctx.db`; only queries/mutations do. Use actions when calling external services.

Notes for future changes
- There is currently no test setup in this repository. If you add one, also add npm scripts (e.g., `test`, `test:watch`) so agents can run the suite and a single-file/spec command.
- If you add additional Convex HTTP endpoints, ensure they’re registered in `convex/http.ts` and adhere to the validators/returns guidelines above.

