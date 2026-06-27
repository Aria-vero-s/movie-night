# 🍿 Movie Night

Une application collaborative pour choisir le film de la soirée ! Proposez des films, votez pour vos préférés, et laissez des commentaires.

**Démo en ligne :** [aria-vero-s.github.io/movie-night](https://aria-vero-s.github.io/movie-night/)

---

## Fonctionnalités

- **🎬 Proposer des films** — Ajoutez vos suggestions de films à la board
- **❤️ Voter** — Cliquez sur le cœur pour voter (ou dé-voter) pour un film
- **🏆 Film gagnant** — Le film avec le plus de votes est automatiquement mis en avant
- **💬 Commenter** — Laissez des commentaires sur chaque film
- **✏️ Modifier & Supprimer** — Éditez ou supprimez vos propres films et commentaires (survol pour voir les icônes)
- **📱 Design responsive** — Fonctionne sur mobile, tablette et desktop
- **🎨 Interface Post-it** — Chaque film est affiché sur un post-it coloré avec rotation aléatoire

---

## Stack Technique

- **Frontend** : React 18 + TypeScript + Vite
- **Styling** : Tailwind CSS v4
- **Backend** : Firebase Realtime Database (europe-west1)
- **Déploiement** : GitHub Pages (dossier `docs/`)
- **CI/CD** : GitHub Actions (build automatique à chaque push)

---

## Installation & Développement

### Prérequis
- Node.js 18+ et pnpm

### Étapes

1. **Cloner le repo**
   ```bash
   git clone https://github.com/Aria-vero-s/movie-night.git
   cd movie-night
   ```

2. **Installer les dépendances**
   ```bash
   pnpm install
   ```

3. **Lancer le serveur de développement**
   ```bash
   pnpm dev
   ```
   L'app sera accessible sur `http://localhost:5173`

4. **Build pour production**
   ```bash
   pnpm build
   ```
   Le build sera généré dans le dossier `docs/`

---

## Configuration Firebase

Le projet utilise Firebase Realtime Database en mode REST (pas de SDK).

**URL actuelle** : `https://movie-night-c8c26-default-rtdb.europe-west1.firebasedatabase.app/`

### Structure de données

```
films/
  <firebase-auto-id>/
    title: "Titre du film"
    author: "Nom d'utilisateur"
    createdAt: "2026-06-27T..."

votes/
  <filmId>/
    <username>/: true

comments/
  <filmId>/
    <firebase-auto-id>/
      text: "Texte du commentaire"
      author: "Nom d'utilisateur"
      createdAt: "2026-06-27T..."
```

### Règles de sécurité
Le projet est configuré en mode test (lecture/écriture publique). Pour production, ajoutez des règles :

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

---

## Déploiement

Le projet se déploie automatiquement sur GitHub Pages via GitHub Actions :

1. Pushez vos changements sur la branche `main`
2. GitHub Actions build automatiquement le projet
3. Le dossier `docs/` est mis à jour et committé
4. GitHub Pages publie depuis `docs/` sur `main`

**Note** : `docs/` est dans `.gitignore` localement pour éviter les conflits.

---

## Structure du Projet

```
src/
  api.ts              # Appels Firebase REST API
  main.tsx            # Point d'entrée React
  app/
    App.tsx           # Composant principal avec toute la logique
    components/       # Composants UI shadcn/ui
  styles/             # Feuilles de style globales
```

---

**Créé avec ❤️ pour vos soirées ciné **
