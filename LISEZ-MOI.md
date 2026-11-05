# OrderBoard 1.2.0 — projet source

Projet reconstruit à partir de l'installeur 1.1.0 (source maps) + nouveau board.

## Sur ton PC Windows (Node.js 20+ requis)
    npm install
    npm run dev          # test dans le navigateur : http://localhost:3000
    npm run build        # puis : npm run desktop  (fenêtre Electron)
    npm run dist         # produit l'installeur .exe dans le dossier dist/

Les données restent dans %APPDATA%\OrderBoard\data (compatibles avec la 1.1.0).

## Workflow créatif du Kanban
Le Kanban suit désormais la production visuelle plutôt que le paiement :

- **À cadrer** : brief, fichiers et périmètre à clarifier.
- **Prêt à produire** : commande validée et prête à démarrer.
- **En création** : production visuelle active.
- **En retours** : version envoyée au client, corrections et validations.
- **Livré** : livrable final transmis.

Le paiement reste indépendant sous forme de badge sur chaque commande : **À régler**, **Acompte** ou **Payé**.

Les anciennes valeurs de statut sont conservées dans le type de données afin de ne pas casser les données locales existantes. Les statistiques financières continuent d'utiliser `payment_status`.

## Mises à jour automatiques (1.3.0)
- Paramètres > Mises à jour : « Rechercher », « Télécharger », « Redémarrer et installer » (pastille dans la sidebar quand une version est dispo).
- Chaque push sur `main` lance GitHub Actions (`.github/workflows/release.yml`) : si le numéro de `version` de `package.json` n'a pas encore de release, l'installeur `OrderBoard-Setup-<version>.exe` est construit et publié.
- Pour publier une mise à jour : augmenter `version` dans `package.json`, puis pousser sur `main`.
- Les mises à jour ne fonctionnent qu'avec l'installeur « Setup », pas avec la version portable.
