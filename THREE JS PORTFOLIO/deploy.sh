#!/bin/bash

# 🚀 Script de déploiement GitHub Pages
# Ce script automatise le processus de déploiement

echo "🚀 Déploiement du Portfolio Three.js sur GitHub Pages"
echo "=================================================="
echo ""

# Vérifier si Git est initialisé
if [ ! -d .git ]; then
    echo "📦 Initialisation de Git..."
    git init
    echo "✅ Git initialisé"
else
    echo "✅ Git déjà initialisé"
fi

# Vérifier si un remote origin existe
if git remote | grep -q "^origin$"; then
    echo "✅ Remote origin déjà configuré"
    REMOTE_URL=$(git remote get-url origin)
    echo "   URL: $REMOTE_URL"
else
    echo "⚠️  Aucun remote origin configuré"
    echo ""
    echo "Pour configurer le remote, exécutez :"
    echo "git remote add origin https://github.com/VOTRE-USERNAME/VOTRE-REPO.git"
    echo ""
    read -p "Voulez-vous configurer le remote maintenant ? (o/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        read -p "Entrez l'URL du repository (ex: https://github.com/username/repo.git): " REPO_URL
        git remote add origin "$REPO_URL"
        echo "✅ Remote origin configuré"
    else
        echo "❌ Déploiement annulé. Configurez d'abord le remote."
        exit 1
    fi
fi

# Vérifier les modifications
echo ""
echo "📝 Vérification des modifications..."
if [[ -z $(git status -s) ]]; then
    echo "ℹ️  Aucune modification à commiter"
else
    echo "📋 Fichiers modifiés :"
    git status -s
    echo ""
    
    # Demander un message de commit
    read -p "Message de commit (ou Entrée pour 'Update portfolio'): " COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Update portfolio"
    fi
    
    # Ajouter et commiter
    echo "📦 Ajout des fichiers..."
    git add .
    echo "💾 Commit des modifications..."
    git commit -m "$COMMIT_MSG"
    echo "✅ Modifications commitées"
fi

# Vérifier la branche
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Vous êtes sur la branche '$CURRENT_BRANCH'"
    read -p "Voulez-vous basculer sur 'main' ? (o/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        git checkout -b main 2>/dev/null || git checkout main
        echo "✅ Basculé sur la branche 'main'"
    fi
fi

# Push vers GitHub
echo ""
echo "🚀 Push vers GitHub..."
if git push -u origin main; then
    echo "✅ Push réussi !"
    echo ""
    echo "🎉 Déploiement terminé !"
    echo ""
    echo "📍 Votre site sera disponible dans 2-5 minutes à :"
    
    # Extraire l'URL du repository
    REMOTE_URL=$(git remote get-url origin)
    if [[ $REMOTE_URL =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
        USERNAME="${BASH_REMATCH[1]}"
        REPO="${BASH_REMATCH[2]}"
        echo "   https://$USERNAME.github.io/$REPO/"
    else
        echo "   https://VOTRE-USERNAME.github.io/VOTRE-REPO/"
    fi
    echo ""
    echo "💡 N'oubliez pas d'activer GitHub Pages dans Settings → Pages"
    echo "   (Branch: main, Folder: / (root))"
else
    echo "❌ Erreur lors du push"
    echo ""
    echo "Vérifiez :"
    echo "1. Que vous avez les droits d'accès au repository"
    echo "2. Que l'URL du remote est correcte"
    echo "3. Que vous êtes authentifié avec GitHub"
    exit 1
fi
