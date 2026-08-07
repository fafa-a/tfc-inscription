# Plan: helloasso-payment

## Mode: Feature (Spike partiel)

## What problem?

Le paiement est actuellement stubbé (`payment_status: 'pending'`, `stripe_customer_id` avec préfixe `fake_`). Il faut intégrer HelloAsso comme solution de paiement réelle.

## Decision

**Widget intégré** — le widget HelloAsso s'affiche dans une modale/section après soumission du formulaire. Pas de redirection.

## Expected behavior

1. L'utilisateur remplit le formulaire → submit
2. Le membre est créé/mis à jour dans Supabase
3. L'abonnement est créé avec `payment_status: 'pending'`
4. Un checkout intent HelloAsso est créé via l'API → retourne l'URL/widget token
5. Le widget HelloAsso s'affiche dans une modale
6. L'utilisateur paie dans le widget (reste sur le site)
7. Callback JS du widget → succès → modale succès + mise à jour `payment_status`
8. Webhook HelloAsso (backend) confirme le paiement côté serveur

## Non-goals

- Redirection externe
- Gestion des remboursements
- Dashboard admin HelloAsso

## Acceptance criteria

- [ ] `stripe_customer_id` remplacé par `helloasso_checkout_intent_id` dans l'interface MemberInsert
- [ ] Client API HelloAsso : OAuth2 + création de checkout intent → `src/lib/helloasso.ts`
- [ ] Composant `HelloAssoWidget` : charge le widget dans une iframe avec callbacks
- [ ] Après submit réussi, le widget s'affiche (modale ou section dédiée)
- [ ] Callback de succès → modale succès + mise à jour statut
- [ ] `VITE_HELLOASSO_CLIENT_ID` et `VITE_HELLOASSO_CLIENT_SECRET` dans `.env.example`
- [ ] `bun run lint` passe

## TDD issue breakdown

Voir `.agents/issues/helloasso-payment.md`
