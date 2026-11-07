# OrderBoard 1.2.0 — projet source

Projet reconstruit à partir de l'installeur 1.1.0 (source maps) + nouveau board.

## Sur ton PC Windows (Node.js 20+ requis)
    npm install
    npm run dev          # test dans le navigateur : http://localhost:3000
    npm run build        # puis : npm run desktop  (fenêtre Electron)
    npm run dist         # produit l'installeur .exe dans le dossier dist/

Les données restent dans %APPDATA%\OrderBoard\data (compatibles avec la 1.1.0).

## Fait dans cette étape
- Projet reconstruit : tsc et next build passent, toutes les pages répondent.
- Nouveau board : barre d'outils en bas, grille, pinceau / surligneur / flèches
  réglables, cartes de fichiers arrondies (nom + téléchargement), brief client,
  annuler / rétablir, zoom, sauvegarde automatique.

## Refonte de l'interface — Rixx Studio (1.2.1)
Refonte visuelle uniquement : logique métier, base de données, routes et actions inchangées.
- Tokens du design system dans `app/globals.css` (couleurs, rayons, ombres, animations, police Inter embarquée).
- Nouvelle structure : sidebar 240 px repliable, barre supérieure (fil d'Ariane, recherche Ctrl+K, notifications, « Nouvelle commande »), navigation mobile en bas.
- Accueil = Vue d'ensemble (`/overview`). Commandes : filtres, tri, vue Kanban ou Tableau. Planning : vues Jour / Semaine / Mois / Liste. Messages : liste + volet de conversation. Finances : encaissé séparé du reste à encaisser + historique. Paramètres : navigation par sections.
- Dépendance ajoutée : `@fontsource-variable/inter` (police locale, fonctionne hors ligne).
- Pas encore gérés (données absentes) : tâches datées dans le planning, notes internes sur les messages, dépenses/bénéfice, comptes clients multi-plateformes.

## Mises à jour automatiques (1.3.0)
- Paramètres > Mises à jour : « Rechercher », « Télécharger », « Redémarrer et installer » (pastille dans la sidebar quand une version est dispo).
- Chaque push sur `main` lance GitHub Actions (`.github/workflows/release.yml`) : si le numéro de `version` de `package.json` n'a pas encore de release, l'installeur `OrderBoard-Setup-<version>.exe` est construit et publié.
- Pour publier une mise à jour : augmenter `version` dans `package.json`, puis pousser sur `main`.
- Les mises à jour ne fonctionnent qu'avec l'installeur « Setup », pas avec la version portable.

## Kanban orienté production
- Colonnes : Brief → Création active → Révisions client → Finalisation → Livré.
- Règle de passage : une carte avance quand l'étape en cours est terminée (brief validé, version exportée, validation écrite du client, fichiers livrés).
- La finance n'est plus une colonne : le badge sur la carte indique En attente / Acompte / Payé (champ `payment_status`).
- Les anciens statuts (Demande, Devis envoyé, Acompte payé, En cours, Payé) sont convertis automatiquement à la lecture des données.

## Direction artistique (1.3.8)
- Accent unique (violet) réservé à l'action principale, à l'élément actif et au focus ; plus de dégradé ni de glow.
- Surfaces neutres, profondeur par différence de teinte, bordures fines.
- Cartes de commande neutres : seules les échéances en retard ou proches et les badges financiers ressortent.
- Rayons : 6 à 8 px pour les contrôles, 10 à 12 px pour les cartes et fenêtres.
- Animations courtes (120 à 220 ms), sans zoom ni rebond.
- Principes inspirés de Unslop de Damir Sokolovsky (https://github.com/heydamir/unslop), sous licence CC BY 4.0.

## Mises à jour rapides (serveur autonome)
- `next.config.ts` : `output: "standalone"` — Next n'embarque que les fichiers réellement utilisés (~1 700 fichiers) au lieu de tout `node_modules` (~22 700).
- `npm run build` exécute aussi `scripts/prepare-standalone.js` (copie `.next/static` et `public` dans le serveur autonome).
- `package.json` : seul `electron-updater` reste dans `dependencies` (le reste est compilé dans le serveur) ; le serveur est copié dans `resources/server` via `extraResources` ; `asar` activé.
- `desktop/main.js` lance `resources/server/server.js` ; avant « Redémarrer et installer », le serveur interne est arrêté pour que l'installeur ne l'attende pas.
