# 📁 Structure du Projet - Portfolio 3D

## 🎯 Organisation des Fichiers

```
THREE JS PORTFOLIO/
│
├── 📄 README.md                    # Documentation principale du projet
├── 📄 STRUCTURE.md                 # Ce fichier - Structure détaillée
│
├── 🌐 FICHIERS WEB PRINCIPAUX
│   ├── index.html                  # Page d'accueil (scène 3D)
│   ├── main.js                     # Script principal page d'accueil
│   ├── manifest.json               # PWA manifest
│   ├── robots.txt                  # Instructions robots SEO ✅ Mis à jour
│   ├── sitemap.xml                 # Plan du site ✅ Mis à jour
│   ├── .htaccess                   # Configuration serveur Apache
│   └── preview.png                 # Image preview Open Graph (1200x630px)
│
├── 📂 assets/                      # Ressources statiques
│   ├── logo.png                    # Logo du portfolio
│   └── ...                         # Autres assets
│
├── 📂 Windsurf carrousel/          # Page projets (carrousel 3D)
│   ├── index.html                  # Page carrousel ✅ SEO optimisé
│   ├── main.js                     # Script carrousel ✅ Optimisé
│   ├── sw.js                       # Service Worker (cache)
│   └── gallery/                    # Images de la galerie
│       ├── image1.webp             # ✅ Optimisé WebP
│       ├── image2.gif              # ⚠️ À convertir en WebP
│       ├── image3.gif              # ⚠️ À convertir en WebP
│       └── image4.gif              # ⚠️ À convertir en WebP
│
└── 📂 docs/                        # 📚 DOCUMENTATION (NOUVEAU)
    ├── README.md                   # Index de la documentation
    │
    ├── 📂 seo/                     # Documentation SEO
    │   ├── SEO_GUIDE.md            # Guide complet SEO (15 pages)
    │   ├── SEO_SUMMARY.md          # Résumé et checklist
    │   ├── KEYWORDS_SUMMARY.md     # 50+ mots-clés implémentés
    │   └── ALT_TEXTS_GUIDE.md      # Guide des alt texts
    │
    ├── 📂 optimizations/           # Documentation optimisations
    │   ├── OPTIMIZATIONS.md        # Optimisations page principale
    │   ├── OPTIMIZATIONS_SUMMARY.md # Optimisations carrousel
    │   └── MINIFICATION_GUIDE.md   # Guide minification JS/CSS
    │
    └── 📂 guides/                  # Autres guides (vide pour l'instant)
```

---

## 📊 Statistiques

### Fichiers par Type
- **HTML** : 2 fichiers (index.html, carrousel/index.html)
- **JavaScript** : 3 fichiers (main.js x2, sw.js)
- **Documentation** : 8 fichiers Markdown
- **Configuration** : 4 fichiers (.htaccess, robots.txt, sitemap.xml, manifest.json)
- **Images** : 5+ fichiers (logo, preview, gallery)

### Taille Totale
- **Code source** : ~50 KB
- **Documentation** : ~100 KB
- **Images** : ~6 MB (avant optimisation WebP)
- **Total** : ~6.15 MB

---

## 🗂️ Organisation par Fonction

### 🌐 Frontend (Utilisateur)
```
/
├── index.html              → Page d'accueil
├── Windsurf carrousel/     → Page projets
└── assets/                 → Ressources visuelles
```

### 🔍 SEO (Moteurs de Recherche)
```
/
├── robots.txt              → Instructions robots
├── sitemap.xml             → Plan du site
├── manifest.json           → PWA manifest
├── preview.png             → Image Open Graph
└── .htaccess               → Configuration serveur
```

### 📚 Documentation (Développeur)
```
/docs/
├── README.md               → Index documentation
├── seo/                    → Guides SEO
├── optimizations/          → Guides performance
└── guides/                 → Autres guides
```

---

## 🎯 Fichiers Clés

### Pour le SEO
1. **robots.txt** - Autorise l'indexation
2. **sitemap.xml** - Liste toutes les pages
3. **index.html** - Meta tags page d'accueil
4. **carrousel/index.html** - Meta tags + Schema.org
5. **preview.png** - Image réseaux sociaux

### Pour les Performances
1. **sw.js** - Service Worker (cache)
2. **main.js** - Code optimisé (FPS limité)
3. **.htaccess** - Compression GZIP, cache
4. **gallery/image1.webp** - Format optimisé

### Pour la Documentation
1. **README.md** - Vue d'ensemble projet
2. **docs/README.md** - Index documentation
3. **docs/seo/SEO_SUMMARY.md** - Checklist SEO
4. **docs/optimizations/OPTIMIZATIONS_SUMMARY.md** - Checklist perfs

---

## ✅ Changements Récents

### Réorganisation (16 octobre 2025)
- ✅ Création du dossier `/docs/`
- ✅ Création du sous-dossier `/docs/seo/`
- ✅ Création du sous-dossier `/docs/optimizations/`
- ✅ Création du sous-dossier `/docs/guides/`
- ✅ Déplacement de 7 fichiers Markdown vers `/docs/`
- ✅ Création de `README.md` principal
- ✅ Création de `docs/README.md`
- ✅ Création de `STRUCTURE.md` (ce fichier)
- ✅ Mise à jour `robots.txt` (domaine)
- ✅ Mise à jour `sitemap.xml` (domaine + dates)

### Fichiers Déplacés
```
AVANT                           →  APRÈS
─────────────────────────────────────────────────────────────
/SEO_GUIDE.md                   →  /docs/seo/SEO_GUIDE.md
/SEO_SUMMARY.md                 →  /docs/seo/SEO_SUMMARY.md
/KEYWORDS_SUMMARY.md            →  /docs/seo/KEYWORDS_SUMMARY.md
/ALT_TEXTS_GUIDE.md             →  /docs/seo/ALT_TEXTS_GUIDE.md
/OPTIMIZATIONS.md               →  /docs/optimizations/OPTIMIZATIONS.md
/Windsurf carrousel/            →  /docs/optimizations/
  OPTIMIZATIONS_SUMMARY.md          OPTIMIZATIONS_SUMMARY.md
/Windsurf carrousel/            →  /docs/optimizations/
  MINIFICATION_GUIDE.md             MINIFICATION_GUIDE.md
```

---

## 🔗 Navigation Rapide

### Démarrage
1. Lire **[README.md](README.md)**
2. Consulter **[docs/README.md](docs/README.md)**
3. Suivre les checklists dans `/docs/seo/` et `/docs/optimizations/`

### SEO
- **Guide complet** : [docs/seo/SEO_GUIDE.md](docs/seo/SEO_GUIDE.md)
- **Checklist** : [docs/seo/SEO_SUMMARY.md](docs/seo/SEO_SUMMARY.md)
- **Mots-clés** : [docs/seo/KEYWORDS_SUMMARY.md](docs/seo/KEYWORDS_SUMMARY.md)

### Optimisations
- **Page principale** : [docs/optimizations/OPTIMIZATIONS.md](docs/optimizations/OPTIMIZATIONS.md)
- **Page carrousel** : [docs/optimizations/OPTIMIZATIONS_SUMMARY.md](docs/optimizations/OPTIMIZATIONS_SUMMARY.md)
- **Minification** : [docs/optimizations/MINIFICATION_GUIDE.md](docs/optimizations/MINIFICATION_GUIDE.md)

---

## 📝 Conventions de Nommage

### Fichiers Markdown
- **MAJUSCULES.md** - Fichiers importants (README, STRUCTURE)
- **CamelCase.md** - Documentation technique
- **snake_case.md** - Scripts et configs

### Dossiers
- **lowercase** - Dossiers web (assets, gallery)
- **CamelCase** - Dossiers spéciaux (Windsurf carrousel)
- **lowercase** - Dossiers documentation (docs, seo, optimizations)

---

## 🚀 Prochaines Étapes

### À Faire
- [ ] Convertir image2-4.gif en WebP
- [ ] Minifier main.js
- [ ] Créer page About/Contact
- [ ] Ajouter plus de guides dans `/docs/guides/`

### Structure Future
```
/docs/
├── guides/
│   ├── DEPLOYMENT_GUIDE.md     # Guide déploiement
│   ├── MAINTENANCE_GUIDE.md    # Guide maintenance
│   └── TROUBLESHOOTING.md      # Résolution problèmes
```

---

**Structure organisée et documentée ! 🎉**

Dernière mise à jour : 16 octobre 2025
