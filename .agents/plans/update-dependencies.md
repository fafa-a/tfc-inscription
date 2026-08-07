# Plan: update-dependencies

## Mode: Feature

## What problem?

Mise à jour des dépendances du projet vers leurs versions les plus récentes compatibles.

## Expected behavior

- `bun install` fonctionne sans erreur
- `bun run build` passe (tsc + vite build)
- `bun run lint` passe
- `bun test` passe
- Pas de breaking changes dans le code source

## Non-goals

- Pas de changement de librairie (pas de migration React 19→next, TanStack Form→autre, etc.)
- Pas de changement de comportement applicatif

## Acceptance criteria

- [ ] `package.json` → toutes les dépendances mises à jour aux versions majeures compatibles
- [ ] `bun install` sans erreur
- [ ] `bun run lint` passe
- [ ] `bun run build` passe
- [ ] `bun test` passe

## TDD issue breakdown

Voir `.agents/issues/update-dependencies.md`
