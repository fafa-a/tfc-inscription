# Agent Guidelines for tfc-inscription

## Build & Test Commands
- **Install**: `bun install`
- **Build**: `bun run build`
- **Lint**: `bun run lint`
- **Test (all)**: `bun test`
- **Test (single file)**: `bun test <path/to/test>`
- **Test (watch)**: `bun test --watch`

## Code Style
- **Runtime**: Bun (not Node.js)
- **Framework**: React with TypeScript
- **Testing**: Vitest (configured in DeepSource)
- **Imports**: Use ESM syntax, group by external → internal → relative
- **Types**: Strict TypeScript - no implicit any, prefer interfaces for objects
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Error Handling**: Use try-catch for async, Error boundaries for React
- **Formatting**: Run lint before commits, fix issues automatically when possible
- **Event Handlers**: Avoid inline arrow functions in JSX event handlers - use useCallback or named functions to prevent unnecessary re-renders
- **Non-null Assertions**: Never use non-null assertions (!) - always handle null/undefined cases explicitly
- **Function Binding**: Never use .bind() - use arrow functions or useCallback instead

## Agent Behavior

- **Always ask the user before running build commands** - Don't run them automatically unless explicitly requested
- Let the user decide when to verify their build

## Notes

## Notes
- CI runs on all PRs and main branch pushes
- DeepSource analyzer enabled for JavaScript/React
