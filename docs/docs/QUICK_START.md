# 🚀 Quick Start - Portfolio 3D

Guide de démarrage rapide pour utiliser et déployer le portfolio.

---

## ⚡ Démarrage en 3 Minutes

### 1️⃣ Cloner et Ouvrir
```bash
# Cloner le repository
git clone https://github.com/votre-username/portfolio-3d.git
cd portfolio-3d

# Lancer un serveur local
python3 -m http.server 8000
# Ou
npx http-server -p 8000
```

### 2️⃣ Ouvrir dans le Navigateur
- **Page d'accueil** : http://localhost:8000/
- **Page projets** : http://localhost:8000/portfolio/

### 3️⃣ C'est Prêt ! 🎉
Le portfolio fonctionne immédiatement en local.

---

## 📋 Checklist Avant Déploiement

### 🔴 Obligatoire
- [ ] Remplacer "votre-site.com" par votre domaine dans :
  - `portfolio/index.html` (lignes 13, 16, 20, 23)
  - `sitemap.xml` ✅ Déjà fait
  - `robots.txt` ✅ Déjà fait
  
- [ ] Créer `preview.png` (1200x630px)
  - Screenshot de votre portfolio
  - Placer à la racine : `/preview.png`
  
- [ ] Créer les favicons
  - Outil : https://realfavicongenerator.net/
  - Fichiers : favicon.ico, favicon.png, apple-touch-icon.png
  - Placer dans `/assets/`

### 🟡 Recommandé
- [ ] Convertir image2-4.gif en WebP
  - Outil : https://ezgif.com/gif-to-webp
  - Gain : -90% de poids (~5 MB économisés)
  
- [ ] Minifier main.js
  - Suivre le guide : [docs/optimizations/MINIFICATION_GUIDE.md](optimizations/MINIFICATION_GUIDE.md)
  - Gain : -40% de taille
  
- [ ] Tester avec Lighthouse
  - Chrome DevTools > Lighthouse
  - Objectif : Score > 90 partout

### 🟢 Optionnel
- [ ] Ajouter Google Analytics
- [ ] Créer page About/Contact
- [ ] Soumettre à Google Search Console

---

## 🌐 Déploiement

### Option 1 : Netlify (Recommandé)
```bash
# 1. Créer compte sur netlify.com
# 2. Drag & drop le dossier du projet
# 3. C'est déployé ! 🚀
```

**Avantages** :
- ✅ Gratuit
- ✅ HTTPS automatique
- ✅ CDN global
- ✅ Déploiement en 1 clic

### Option 2 : Vercel
```bash
# 1. Installer Vercel CLI
npm i -g vercel

# 2. Déployer
vercel

# 3. Suivre les instructions
```

### Option 3 : GitHub Pages
```bash
# 1. Créer un repo GitHub
# 2. Pousser le code
git add .
git commit -m "Initial commit"
git push origin main

# 3. Activer GitHub Pages dans Settings
# Pages > Source > main branch
```

---

## 📚 Documentation

### Pour Démarrer
1. **[README.md](../README.md)** - Vue d'ensemble
2. **[STRUCTURE.md](../STRUCTURE.md)** - Organisation fichiers
3. **[docs/README.md](README.md)** - Index documentation

### SEO
- **[SEO_SUMMARY.md](seo/SEO_SUMMARY.md)** - Checklist SEO
- **[KEYWORDS_SUMMARY.md](seo/KEYWORDS_SUMMARY.md)** - Mots-clés
- **[SEO_GUIDE.md](seo/SEO_GUIDE.md)** - Guide complet (15 pages)

### Optimisations
- **[OPTIMIZATIONS_SUMMARY.md](optimizations/OPTIMIZATIONS_SUMMARY.md)** - Résumé
- **[MINIFICATION_GUIDE.md](optimizations/MINIFICATION_GUIDE.md)** - Minification
- **[OPTIMIZATIONS.md](optimizations/OPTIMIZATIONS.md)** - Détails techniques

---

## 🛠️ Commandes Utiles

### Serveur Local
```bash
# Python
python3 -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

### Tests
```bash
# Lighthouse (Chrome DevTools)
# F12 > Lighthouse > Generate report

# Vérifier les liens cassés
npx broken-link-checker http://localhost:8000

# Tester le Service Worker
# F12 > Application > Service Workers
```

### Optimisations
```bash
# Minifier JavaScript
npx terser main.js -o main.min.js -c -m

# Convertir images en WebP
# Utiliser https://squoosh.app/

# Compresser images
npx imagemin gallery/*.{jpg,png} --out-dir=gallery/optimized
```

---

## 🎯 Objectifs de Performance

### Lighthouse Scores
- **Performance** : > 90 ✅
- **SEO** : > 90 ✅
- **Accessibility** : > 90 ✅
- **Best Practices** : 100 ✅

### Temps de Chargement
- **1ère visite** : < 2s ✅
- **2e visite** : < 1s ✅ (avec Service Worker)

### Taille des Fichiers
- **HTML** : < 10 KB ✅
- **JavaScript** : < 30 KB ✅
- **Images** : < 1 MB ⚠️ (après conversion WebP)

---

## 🐛 Résolution de Problèmes

### Le Service Worker ne fonctionne pas
```bash
# Le Service Worker nécessite HTTPS ou localhost
# Solution : Tester en local ou déployer sur HTTPS
```

### Les images ne chargent pas
```bash
# Vérifier les chemins relatifs
# Ouvrir la console (F12) pour voir les erreurs
```

### Le carrousel 3D est lent
```bash
# Vérifier que le FPS est limité à 60
# Ligne 804-827 dans portfolio/main.js
```

### Lighthouse score bas
```bash
# 1. Minifier le JavaScript
# 2. Convertir images en WebP
# 3. Activer le Service Worker
# 4. Vérifier les meta tags
```

---

## 📞 Support

### Ressources
- **Documentation** : [docs/README.md](README.md)
- **Structure** : [STRUCTURE.md](../STRUCTURE.md)
- **Issues** : GitHub Issues (si public)

### Outils Utiles
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Meta Tags Checker](https://metatags.io/)
- [Schema Validator](https://validator.schema.org/)

---

## ✅ Checklist Complète

### Développement
- [x] Code fonctionnel
- [x] Responsive design
- [x] Curseur personnalisé
- [x] Animations fluides

### Optimisations
- [x] FPS limité à 60
- [x] Service Worker
- [x] Lazy loading
- [x] Textures optimisées
- [ ] Images WebP (3/4)
- [ ] Code minifié

### SEO
- [x] Meta tags
- [x] Open Graph
- [x] Schema.org
- [x] Sitemap.xml
- [x] Robots.txt
- [x] Alt texts
- [ ] Preview.png
- [ ] Favicons

### Déploiement
- [ ] Domaine configuré
- [ ] HTTPS activé
- [ ] Google Analytics
- [ ] Search Console
- [ ] Tests mobile

---

**Prêt à déployer ! 🚀**

Temps estimé : 30 minutes pour tout finaliser
