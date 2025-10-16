# ✅ Checklist de Déploiement GitHub Pages

## 📦 Fichiers de Configuration

- [x] `.nojekyll` créé (empêche Jekyll)
- [x] `.gitignore` configuré
- [x] Import map Three.js ajouté dans `index.html`
- [x] Import map Three.js ajouté dans `Windsurf carrousel/index.html`
- [x] `main.js` mis à jour pour utiliser l'import map
- [x] Script de déploiement `deploy.sh` créé

## 🎯 Avant de Déployer

### 1. Créer un Repository GitHub

- [ ] Aller sur [github.com](https://github.com)
- [ ] Créer un nouveau repository
- [ ] Nom : `portfolio-threejs` (ou autre)
- [ ] Visibilité : **Public** (obligatoire pour GitHub Pages gratuit)
- [ ] **NE PAS** cocher "Add README", ".gitignore" ou "license"

### 2. Récupérer l'URL du Repository

Format : `https://github.com/USERNAME/REPO.git`

Exemple : `https://github.com/enzodomenger/portfolio-threejs.git`

## 🚀 Déploiement

### Option A : Script Automatique (Recommandé)

```bash
./deploy.sh
```

### Option B : Commandes Manuelles

```bash
# 1. Initialiser Git (si pas déjà fait)
git init

# 2. Ajouter tous les fichiers
git add .

# 3. Premier commit
git commit -m "Initial commit - Portfolio Three.js"

# 4. Lier au repository (remplacez USERNAME et REPO)
git remote add origin https://github.com/USERNAME/REPO.git

# 5. Push
git branch -M main
git push -u origin main
```

## ⚙️ Configuration GitHub Pages

- [ ] Aller sur le repository GitHub
- [ ] Cliquer sur **Settings** (⚙️)
- [ ] Cliquer sur **Pages** dans le menu de gauche
- [ ] Sous **Source** :
  - [ ] Sélectionner **Branch** : `main`
  - [ ] Sélectionner **Folder** : `/ (root)`
- [ ] Cliquer sur **Save**
- [ ] Attendre 2-5 minutes

## 🌐 Vérification

- [ ] Le site est accessible à : `https://USERNAME.github.io/REPO/`
- [ ] Le carrousel 3D se charge correctement
- [ ] Les vidéos YouTube s'affichent dans les modales
- [ ] La galerie d'images fonctionne
- [ ] Le site est responsive (mobile/tablette/desktop)

## 🔧 Mises à Jour Futures

Pour mettre à jour le site après des modifications :

```bash
git add .
git commit -m "Description des modifications"
git push
```

Ou utilisez le script :

```bash
./deploy.sh
```

## 📊 Statistiques du Projet

### Fichiers Principaux
- `index.html` - Page d'accueil avec animation de chargement
- `main.js` - Script de la page d'accueil
- `Windsurf carrousel/index.html` - Page du carrousel 3D
- `Windsurf carrousel/main.js` - Script du carrousel Three.js

### Assets
- `BLENDER_Template.glb` - Modèle 3D Blender
- `COMP VIDEO.mp4` - Vidéo de fond
- `gallery/` - Images de la galerie
- `assets/` - Logos et icônes

### Technologies
- Three.js v0.160.0
- WebGL
- ES6 Modules
- Import Maps
- Service Workers (désactivé temporairement)

## 🐛 Dépannage

### Le site ne charge pas
1. Vérifier que GitHub Pages est activé
2. Attendre 5 minutes après le push
3. Vider le cache du navigateur (Ctrl+Shift+R)

### Erreur 404
1. Vérifier que le repository est **Public**
2. Vérifier que la branche `main` est sélectionnée
3. Vérifier que le dossier `/ (root)` est sélectionné

### Three.js ne fonctionne pas
1. Vérifier que l'import map est dans le `<head>`
2. Ouvrir la console (F12) pour voir les erreurs
3. Vérifier la connexion internet (CDN jsdelivr)

### Les vidéos ne chargent pas
1. Vérifier que les fichiers sont dans le repository
2. Vérifier les chemins relatifs
3. Vérifier la taille (limite : 100 MB par fichier)

## 📞 Ressources

- [Documentation GitHub Pages](https://docs.github.com/en/pages)
- [Documentation Three.js](https://threejs.org/docs/)
- [Guide complet](./DEPLOIEMENT_GITHUB_PAGES.md)
- [Guide rapide](./DEPLOIEMENT_RAPIDE.md)

## 🎉 Félicitations !

Votre portfolio 3D est maintenant prêt à être déployé sur GitHub Pages ! 🚀
