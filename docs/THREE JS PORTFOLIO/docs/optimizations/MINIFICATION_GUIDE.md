# Guide de Minification

## 📦 Comment minifier vos fichiers pour la production

### Option 1 : Utiliser des outils en ligne (Facile)

#### JavaScript
1. Allez sur https://javascript-minifier.com/
2. Copiez le contenu de `main.js`
3. Cliquez sur "Minify"
4. Sauvegardez le résultat dans `main.min.js`

#### CSS (dans index.html)
1. Allez sur https://cssminifier.com/
2. Copiez tout le CSS entre les balises `<style>`
3. Cliquez sur "Minify"
4. Remplacez le CSS dans votre HTML

### Option 2 : Utiliser Node.js et npm (Recommandé)

#### Installation
```bash
cd "Windsurf carrousel"
npm init -y
npm install --save-dev terser cssnano postcss-cli
```

#### Créer package.json avec scripts
```json
{
  "name": "portfolio-carrousel",
  "version": "1.0.0",
  "scripts": {
    "minify:js": "terser main.js -o main.min.js -c -m",
    "minify:css": "postcss index.html -o index.min.html --use cssnano",
    "minify": "npm run minify:js && npm run minify:css",
    "build": "npm run minify"
  },
  "devDependencies": {
    "terser": "^5.19.0",
    "cssnano": "^6.0.0",
    "postcss-cli": "^10.1.0"
  }
}
```

#### Commandes
```bash
# Minifier JavaScript
npm run minify:js

# Minifier tout
npm run build
```

### Option 3 : Utiliser Vite (Production-ready)

#### Installation
```bash
npm install --save-dev vite
```

#### Créer vite.config.js
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Retire les console.log
      }
    }
  }
});
```

#### Build
```bash
npx vite build
```

---

## 📊 Gains attendus

| Fichier | Taille originale | Taille minifiée | Réduction |
|---------|------------------|-----------------|-----------|
| main.js | ~29 KB | ~15 KB | -48% |
| index.html (CSS) | ~8.5 KB | ~6 KB | -30% |

---

## ⚠️ Important

Après minification :
1. Mettez à jour les références dans `index.html` :
   ```html
   <script type="module" src="./main.min.js"></script>
   ```

2. Gardez les fichiers originaux pour le développement

3. Utilisez les fichiers `.min.js` uniquement en production

---

## 🔧 Automatisation avec GitHub Actions (Avancé)

Créez `.github/workflows/build.yml` :
```yaml
name: Build and Minify

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: minified-files
          path: dist/
```

---

## 📝 Checklist de déploiement

- [ ] Minifier main.js
- [ ] Minifier CSS dans index.html
- [ ] Compresser les images (déjà fait pour image1.webp)
- [ ] Tester le site avec les fichiers minifiés
- [ ] Vérifier que le Service Worker fonctionne
- [ ] Tester sur mobile et desktop
- [ ] Vérifier les performances avec Lighthouse
