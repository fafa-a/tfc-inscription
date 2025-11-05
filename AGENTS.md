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

## Notes
- CI runs on all PRs and main branch pushes
- DeepSource analyzer enabled for JavaScript/React
