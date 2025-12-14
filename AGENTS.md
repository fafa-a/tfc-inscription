# Agent Guidelines for tfc-inscription

## Stack

- Runtime: Bun (not Node.js)
- Frontend: React + TypeScript (strict)
- Tests: Vitest (CI/DeepSource)

## Commands (DO NOT run unless user explicitly asks)

- Install: `bun install`
- Build: `bun run build`
- Lint: `bun run lint`
- Test all: `bun test`
- Test single: `bun test <path/to/test>`
- Test watch: `bun test --watch`

## Token / Output Budget (very important)

- Keep responses short and actionable:
  - Summary: max 3 bullets
  - Quick wins: max 5 bullets
- Do NOT paste full command output. If user provides logs:
  - Quote only the most relevant lines (max ~50 lines total).
- Do NOT re-list commands unless asked. Refer to them by name (Install/Build/Lint/Test).

## Code Style Rules

- Imports: ESM; group external → internal → relative
- Types: strict TS; no implicit any; prefer interfaces for object shapes
- Naming: camelCase vars/functions; PascalCase components/classes
- React:
  - Avoid inline arrow functions in JSX handlers
  - Use `useCallback` or named functions to reduce re-renders
  - Use Error Boundaries where appropriate
- Nullability:
  - Never use non-null assertions (`!`)
  - Handle null/undefined explicitly
- Never use `.bind()`
- No console.* in production code (remove all)

## Agent behavior (must follow)

- Default mode = "review/plan":
  - Analyze + propose minimal patches and refactors
  - Do NOT run Lint/Test/Build unless user explicitly requests
- If user asks to verify:
  - Run at most ONE command (prefer Lint first), then stop and report concisely
- If changes are large:
  - Propose a staged plan (small commits), but do not execute commands automatically

## Notes

- CI runs on PRs and pushes to main
- DeepSource analyzer enabled for JavaScript/React
