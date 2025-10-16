# 🚀 Guide de Déploiement GitHub Pages

## ✅ Préparation effectuée

Les fichiers suivants ont été configurés pour GitHub Pages :
- ✅ `.nojekyll` - Empêche Jekyll de traiter les fichiers
- ✅ Import map Three.js ajouté dans `index.html` et `Windsurf carrousel/index.html`
- ✅ `.gitignore` déjà configuré

---

## 📋 Étapes de Déploiement

### 1️⃣ Vérifier que vous êtes dans le bon dossier

```bash
cd "/Users/enzo/Documents/GitHub/Portfolio-PROJECT-THREEJS/ThreeJS Test Function/THREE JS PORTFOLIO"
```

### 2️⃣ Initialiser Git (si pas déjà fait)

```bash
git init
```

### 3️⃣ Ajouter tous les fichiers

```bash
git add .
```

### 4️⃣ Créer le premier commit

```bash
git commit -m "Initial commit - Portfolio Three.js avec carrousel 3D"
```

### 5️⃣ Créer un repository sur GitHub

1. Allez sur [github.com](https://github.com)
2. Cliquez sur le bouton **"+"** en haut à droite → **"New repository"**
3. **Nom du repository** : `portfolio-threejs` (ou un autre nom)
4. **Description** : "Portfolio 3D interactif avec Three.js"
5. **Visibilité** : Public (obligatoire pour GitHub Pages gratuit)
6. ⚠️ **NE PAS** cocher "Add a README file"
7. ⚠️ **NE PAS** ajouter .gitignore ou license
8. Cliquez sur **"Create repository"**

### 6️⃣ Lier votre projet au repository GitHub

Remplacez `VOTRE-USERNAME` et `VOTRE-REPO` par vos valeurs :

```bash
git remote add origin https://github.com/VOTRE-USERNAME/VOTRE-REPO.git
git branch -M main
git push -u origin main
```

**Exemple :**
```bash
git remote add origin https://github.com/enzodomenger/portfolio-threejs.git
git branch -M main
git push -u origin main
```

### 7️⃣ Activer GitHub Pages

1. Sur GitHub, allez dans votre repository
2. Cliquez sur **"Settings"** (⚙️ Paramètres)
3. Dans le menu de gauche, cliquez sur **"Pages"**
4. Sous **"Source"**, sélectionnez :
   - **Branch** : `main`
   - **Folder** : `/ (root)`
5. Cliquez sur **"Save"**

### 8️⃣ Attendre le déploiement

- ⏱️ Le déploiement prend **2-5 minutes**
- 🔄 Rafraîchissez la page pour voir le statut
- ✅ Une fois terminé, vous verrez : **"Your site is live at..."**
- 🌐 Votre site sera disponible à : `https://VOTRE-USERNAME.github.io/VOTRE-REPO/`

---

## 🔧 Mises à jour futures

Pour mettre à jour votre site après des modifications :

```bash
git add .
git commit -m "Description de vos modifications"
git push
```

Le site se mettra à jour automatiquement en 2-5 minutes.

---

## ⚠️ Points importants

### ✅ Chemins relatifs
Tous vos chemins sont déjà configurés correctement avec des chemins relatifs :
- `./BLENDER_Template.glb`
- `./COMP VIDEO.mp4`
- `./gallery/image1.webp`
- `../assets/logo(180).png`

### ✅ Import Map Three.js
L'import map a été ajouté pour que Three.js fonctionne :
```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }
</script>
```

### ✅ Fichier .nojekyll
Ce fichier empêche GitHub Pages d'utiliser Jekyll, ce qui permet :
- De servir les fichiers commençant par `_`
- D'éviter les problèmes avec les dossiers spéciaux

---

## 🎯 URL finale

Votre portfolio sera accessible à :
```
https://VOTRE-USERNAME.github.io/VOTRE-REPO/
```

**Exemple :**
```
https://enzodomenger.github.io/portfolio-threejs/
```

---

## 🐛 Dépannage

### Le site ne charge pas
1. Vérifiez que GitHub Pages est activé dans Settings → Pages
2. Attendez 5 minutes après le push
3. Videz le cache de votre navigateur (Ctrl+Shift+R ou Cmd+Shift+R)

### Erreur 404
1. Vérifiez que le repository est **Public**
2. Vérifiez que la branche `main` est sélectionnée dans Settings → Pages
3. Vérifiez que le dossier `/ (root)` est sélectionné

### Les vidéos/images ne chargent pas
1. Vérifiez que les fichiers sont bien dans le repository
2. Vérifiez les chemins relatifs dans le code
3. Vérifiez la taille des fichiers (GitHub a une limite de 100 MB par fichier)

### Three.js ne fonctionne pas
1. Vérifiez que l'import map est présent dans le `<head>`
2. Ouvrez la console du navigateur (F12) pour voir les erreurs
3. Vérifiez que les imports utilisent `'three'` et non `'./three.js'`

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Consultez la [documentation GitHub Pages](https://docs.github.com/en/pages)
2. Vérifiez les logs de déploiement dans l'onglet "Actions" de votre repository
3. Ouvrez la console du navigateur (F12) pour voir les erreurs JavaScript

---

## 🎉 Félicitations !

Une fois déployé, votre portfolio 3D interactif sera accessible au monde entier ! 🌍
