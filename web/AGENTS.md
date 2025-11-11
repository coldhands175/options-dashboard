# Repository Guidelines

## Project Structure & Module Organization
- `app/` houses the Next.js 15 App Router routes, layouts, and loading states for dashboards, trades, and watchlists.
- `components/` contains domain components (dashboard, positions, trades, watchlist) plus shared primitives under `components/ui`.
- `convex/` is the Convex backend: `schema.ts` for data models, `auth*.ts` for access control, domain logic in files such as `trades.ts`, and `_generated/` (do not edit) for client stubs.
- Shared helpers live in `lib/`, `utils/`, and `hooks/`; TypeScript contracts are centralized in `types/`. Static assets stay in `public/`, and reference material lives in `docs/`.

## Build, Test, and Development Commands
- `npm install` syncs dependencies (target Node 20.x).
- `npm run dev` launches Next.js and Convex dev servers together. Use `npm run dev:frontend` or `npm run dev:backend` to isolate issues.
- `npm run lint` runs ESLint + Next lint rules, enforcing formatting and type safety.
- `npm run build` compiles the production bundle; follow with `npm start` for a production smoke test.
- `node test-positional-parser.mjs "./Q1 Trades-1 2025.pdf"` exercises the PDF ingestion pipeline with bundled samples.

## Coding Style & Naming Conventions
- TypeScript-first: keep `.ts`/`.tsx` files strict, leverage the `@/` path alias, and avoid default exports unless a file exposes a single primitive.
- Adhere to the existing Prettier profile (2-space indentation, no trailing semicolons) and Tailwind utility sequencing.
- Use PascalCase for React components and Convex functions, camelCase for hooks/utilities, and UPPER_SNAKE_CASE for shared constants.
- Reuse UI primitives from `components/ui` and shared helpers from `lib/utils.ts` to keep variants consistent.

## Testing Guidelines
- There is no formal test harness yet—document manual verification in PRs and script reproduction steps.
- For Convex mutations and actions, add optimistic guards via `hooks/useOptimisticAction.ts` and validate payloads with helpers in `utils/validation.ts`.
- Use the PDF parser script for ingestion changes, and create temporary preview routes under `app/` when visual validation is required (remove before merging).
- Strengthen coverage with TypeScript refinements and runtime assertions whenever adding calculations or external API calls.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(trades):`, `fix(pdf):`, `docs:`) as shown in recent history (`git log --oneline`).
- Keep commits focused; separate formatting churn from feature work whenever possible.
- PRs should include a concise summary, screenshots or console output for manual tests, linked issues/docs, and notes on required follow-up work.
- Update supporting docs (`docs/`, `README.md`, `AGENTS.md`) whenever behavior, setup, or API contracts change.
