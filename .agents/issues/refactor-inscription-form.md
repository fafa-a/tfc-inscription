# Issues: refactor-inscription-form

## Issue 1: Extraire `formatDateInput` dans un utilitaire partagé

**Type:** Refactor
**Taille:** XS

### Acceptance criteria

- [x] `src/utils/formatDateInput.ts` créé
- [x] `InscriptionForm.tsx` importe depuis le nouvel utilitaire
- [x] `formatDateInput.test.ts` importe depuis le nouvel utilitaire (supprime la copie inline)
- [x] `bun test` passe
- [x] `bun run lint` passe

### Fichiers

- `src/utils/formatDateInput.ts` (nouveau)
- `src/InscriptionForm.tsx` (modifié)
- `src/utils/formatDateInput.test.ts` (modifié)

---

## Issue 2: Extraire `ModalCloseButton` et `ModalContent`

**Type:** Refactor
**Taille:** XS

### Acceptance criteria

- [x] `src/components/ModalCloseButton.tsx` créé
- [x] `src/components/ModalContent.tsx` créé
- [x] `InscriptionForm.tsx` importe depuis les nouveaux composants
- [x] `bun run lint` passe

### Fichiers

- `src/components/ModalCloseButton.tsx` (nouveau)
- `src/components/ModalContent.tsx` (nouveau)
- `src/InscriptionForm.tsx` (modifié)

---

## Issue 3: Extraire `InfoModal`

**Type:** Refactor
**Taille:** XS

### Acceptance criteria

- [x] `src/components/InfoModal.tsx` créé
- [x] `InscriptionForm.tsx` importe `InfoModal`
- [x] `bun run lint` passe

### Fichiers

- `src/components/InfoModal.tsx` (nouveau)
- `src/InscriptionForm.tsx` (modifié)

---

## Issue 4: Extraire les constantes et mappings dupliqués

**Type:** Refactor
**Taille:** XS

### Acceptance criteria

- [x] `src/constants/labels.ts` créé avec `temporalityLabels` et `audienceLabels`
- [x] `src/constants/mappings.ts` créé avec `genderMap` (homme↔male, femme↔female)
- [x] `InscriptionForm.tsx` et autres fichiers importent depuis les constantes
- [x] `bun run lint` passe

### Fichiers

- `src/constants/labels.ts` (nouveau)
- `src/constants/mappings.ts` (nouveau)
- `src/InscriptionForm.tsx` (modifié)

---

## Issue 5: Remplacer `document.querySelector` par des refs React

**Type:** Refactor
**Taille:** S

### Acceptance criteria

- [x] `focusFirstErrorField` utilise des refs au lieu de `document.querySelector`
- [x] La logique de validation dans `handleFormSubmit` (`setTimeout` 100ms) est remplacée par le mécanisme natif de TanStack Form (`onSubmitInvalid`)
- [x] `bun run lint` passe

### Fichiers

- `src/InscriptionForm.tsx` (modifié)
- `src/utils/formErrorHandler.ts` (modifié)

### Notes

- TanStack Form's `form.handleSubmit()` already validates. Le `setTimeout(100ms)` + `getFieldMeta` est redondant. On peut utiliser `form.validate()` ou le retour de `handleSubmit`.
