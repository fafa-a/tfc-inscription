# Project Context

## What

Combat sports club membership registration web app (TFC).
Single-page form — no routing.

## How

```
main.tsx → App → InscriptionForm
```

State: local `useState`/`useRef` only. No global store.
3 custom hooks: `useFormUIState`, `useSubscriptionBuilder`, `useUnderagePolicy`.

Data flow:
1. User fills form → Zod validates on-change per field
2. Email blur → `checkMemberByEmail()` → Supabase `members` table → pre-fill if found
3. Birthday change → `calculateAge()` → underage check (16+ only)
4. Discipline + Duration → filter plans by age/audience → price summary
5. Submit → Zod parse → upload photo (Supabase Storage `avatars` bucket) → upsert member + insert subscriptions

## Modules

| Path | Role |
|---|---|
| `src/lib/supabase.ts` | Supabase client, DB queries, interfaces |
| `src/utils/uploadPhoto.ts` | Photo validation + upload |
| `src/utils/ageUtils.ts` | Age calculation, age group |
| `src/utils/formErrorHandler.ts` | Zod vs generic error dispatch |
| `src/components/FormStatusBanner.tsx` | Info/success/error/returning banners |
| `src/components/SubscriptionBuilderSection.tsx` | Discipline + duration radios |
| `src/components/SubscriptionSummary.tsx` | Selected plan + price card |
| `src/hooks/useFormUIState.ts` | UI flags, submission state, computed booleans |
| `src/hooks/useSubscriptionBuilder.ts` | Plan selection + age filtering |
| `src/hooks/useUnderagePolicy.ts` | Age check + modal |

## Known debts

- `InscriptionForm.tsx` is 1100 lines — inline modals, `formatDateInput` should be extracted
- `formatDateInput` duplicated in test file
- `setTimeout(100ms)` race for TanStack Form async validation
- `document.querySelector` instead of refs for focus/scroll
- `supabase.auth.signOut()` on mount (suspect)
- `bun:test` + `vitest` mixed
- Stripe IDs stubbed (`fake_` prefix)
- No component/integration tests
