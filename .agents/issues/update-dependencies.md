# Issues: update-dependencies

## Issue 1: Mise à jour des dépendances

**Type:** Feature
**Taille:** S (1 cycle TDD)

### Acceptance criteria

- [x] Toutes les dépendances `dependencies` et `devDependencies` mises à jour
- [x] `bun install` réussit
- [x] `bun run build` réussit
- [x] `bun run lint` réussit
- [x] `bun test` réussit

### Fichiers concernés

- `package.json`

### Notes

- Utiliser `bun update` pour les mises à jour automatiques dans les ranges semver
- Vérifier les changements majeurs éventuels via les CHANGELOGs
