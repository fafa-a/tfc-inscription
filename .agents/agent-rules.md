# Agent Rules

From `AGENTS.md`.

## Stack

- Runtime: Bun (not Node.js)
- Frontend: React 19 + TypeScript (strict)
- Styling: Tailwind CSS 3.4
- Forms: `@tanstack/react-form` + `@tanstack/zod-form-adapter`
- Validation: Zod 4
- Backend: Supabase (js client 2.80)
- Lint/Format: Biome 1.9
- Tests: Bun's built-in test runner (`bun:test`) ; Vitest accepted for CI

## Imports

- ESM only
- Group: external → internal → relative

## Types

- strict TS, no implicit any
- prefer interfaces for object shapes

## Naming

- camelCase: vars, functions
- PascalCase: components, classes
- kebab-case: files

## React

- Avoid inline arrow functions in JSX handlers
- Use `useCallback` or named functions
- Error Boundaries where appropriate

## Nullability

- Never use non-null assertions (`!`)
- Handle null/undefined explicitly

## Forbidden

- `.bind()`
- `console.*` in production code

## Agent behavior

- Default mode = review/plan
- Do NOT run Lint/Test/Build unless user explicitly asks
- If verifying: run ONE command (prefer Lint), then stop and report
- Large changes: propose staged plan, do not execute automatically
