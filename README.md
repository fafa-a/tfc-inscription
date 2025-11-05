# TFC Inscription

A modern React + TypeScript front-end project built with Vite, Bun, Biome, and Tailwind CSS.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Bun** - Fast package manager and runtime
- **Biome** - Fast linting and formatting
- **Tailwind CSS 3.4** - Utility-first CSS framework

## Project Structure

```
tfc-inscription/
├── src/
│   ├── components/     # React components
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main App component
│   ├── main.tsx        # Entry point
│   └── index.css       # Tailwind directives
├── public/             # Static assets
├── biome.json          # Biome configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies and scripts
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your system

### Installation

```bash
# Install dependencies
bun install
```

### Development

```bash
# Start dev server (opens at http://localhost:3000)
bun run dev
```

### Build

```bash
# Type check
bun run type-check

# Build for production
bun run build

# Preview production build
bun run preview
```

### Code Quality

```bash
# Run linter
bun run lint

# Fix linting issues automatically
bun run lint:fix

# Format code
bun run format
```

## Features

- Fast HMR (Hot Module Replacement) with Vite
- Strict TypeScript configuration
- Path aliases (@/* for src/*)
- Modern Biome linting rules for React
- Automatic import organization
- Tailwind CSS with dark mode support
- Production-ready build configuration

## Code Style

This project follows modern React and TypeScript best practices:

- Use ESM imports (group: external → internal → relative)
- Strict TypeScript (no implicit any)
- Prefer interfaces for object types
- camelCase for variables/functions, PascalCase for components
- Use functional components with hooks
- Error boundaries for React error handling