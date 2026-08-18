# Current Task

**Active plan:** `helloasso-payment`
**Active issue:** Issue 8 — Ne pas faire confiance au client (montant serveur + contrôle d'accès)
**Status:** ready
**Next step:** Implémenter l'Option C (anon auth + rate-limit)
**Do not do:**
- Ne pas ajouter de dépendances
- Ne pas faire confiance au montant envoyé par le client

**Décision prise :**
- Option C = `signInAnonymously()` + vérif JWT + rate-limit par `sub`+IP (5 checkouts / 10 min)

**Historique :**
- Issue 6 (3 bugs spec) : DONE
- Issue 7 (OAuth2 hors frontend) : DONE
