# Plan: refactor-inscription-form

## Mode: Refactor

## Behavior that must not change

- Validation Zod identique
- Détection membre existant par email
- Politique adultes (16+)
- Upload photo vers Supabase Storage
- Upsert membre + création abonnements
- Affichage des modales (underage, form-error, success)
- Affichage du SubscriptionBuilder + Summary

## Safety tests

- `bun test` pour les tests unitaires existants
- `bun run lint` pour vérifier les imports
- Vérification visuelle du build

## Refactor boundary

**Extraire depuis `InscriptionForm.tsx` (1100 lignes) :**

1. `formatDateInput` → `src/utils/formatDateInput.ts`
2. `ModalCloseButton` → `src/components/ModalCloseButton.tsx`
3. `ModalContent` → `src/components/ModalContent.tsx`
4. `InfoModal` → `src/components/InfoModal.tsx`
5. Constantes `temporalityLabels`, `audienceLabels` → import depuis `src/lib/supabase.ts` ou fichier `src/constants/labels.ts`
6. `genderMap` (utilisé 2 fois) → `src/constants/mappings.ts` ou utilitaire
7. Composant `FormFieldWrapper` pour réduire la duplication des `<form.Field>` wrapper avec label + erreur

**Ce qui reste dans `InscriptionForm.tsx` :**
- Logique métier (submit, email blur, birthday change, photo change)
- Rendu du formulaire avec `<form.Field>`
- Appels aux composants extraits

## Rollback risk

Faible — extraction pure, pas de changement de logique.

## TDD issue breakdown

Voir `.agents/issues/refactor-inscription-form.md`
