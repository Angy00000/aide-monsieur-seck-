# Aide pour Monsieur Seck

Cotisation libre des anciens élèves du Centre Saint Jean Baptiste pour soutenir Monsieur Seck.

En ligne : https://aide-monsieur-seck.vercel.app

- `index.html`, `app.js`, `style.css` : page publique (total, paiements, registre, mots pour Monsieur Seck)
- `api/data.js` : données publiques (montants masqués si l'option est désactivée)
- `api/admin.js` : espace organisateur protégé par mot de passe
- Base : Neon Postgres (tables `contributions`, `settings`)

Variables d'environnement Vercel : `DATABASE_URL`, `ADMIN_PASSWORD_SHA256`. Aucun secret dans ce dépôt.
