#!/bin/bash

# Script d'optimisation des images pour améliorer PageSpeed Insights
# Convertit les images en WebP et optimise les JPG/PNG

echo "🚀 Optimisation des images en cours..."

# Vérifier si cwebp est installé
if ! command -v cwebp &> /dev/null; then
    echo "⚠️  cwebp n'est pas installé. Installation via Homebrew..."
    brew install webp
fi

# Vérifier si jpegoptim est installé
if ! command -v jpegoptim &> /dev/null; then
    echo "⚠️  jpegoptim n'est pas installé. Installation via Homebrew..."
    brew install jpegoptim
fi

# Vérifier si optipng est installé
if ! command -v optipng &> /dev/null; then
    echo "⚠️  optipng n'est pas installé. Installation via Homebrew..."
    brew install optipng
fi

cd "$(dirname "$0")"

# Optimiser et convertir grass.jpg
echo "📸 Optimisation de grass.jpg..."
if [ -f "assets/grass.jpg" ]; then
    cp assets/grass.jpg assets/grass.jpg.backup
    jpegoptim --max=85 --strip-all assets/grass.jpg
    cwebp -q 85 assets/grass.jpg -o assets/grass.webp
    echo "✅ grass.jpg optimisé et converti en WebP"
fi

# Optimiser et convertir cloud.jpg
echo "📸 Optimisation de cloud.jpg..."
if [ -f "assets/cloud.jpg" ]; then
    cp assets/cloud.jpg assets/cloud.jpg.backup
    jpegoptim --max=85 --strip-all assets/cloud.jpg
    cwebp -q 85 assets/cloud.jpg -o assets/cloud.webp
    echo "✅ cloud.jpg optimisé et converti en WebP"
fi

# Optimiser et convertir le PNG de texture
echo "📸 Optimisation de UV_Polaroid_frame_Template_TEST_NORMAL_V2.png..."
if [ -f "Windsurf carrousel/Textures/UV_Polaroid_frame_Template_TEST_NORMAL_V2.png" ]; then
    cp "Windsurf carrousel/Textures/UV_Polaroid_frame_Template_TEST_NORMAL_V2.png" "Windsurf carrousel/Textures/UV_Polaroid_frame_Template_TEST_NORMAL_V2.png.backup"
    optipng -o7 "Windsurf carrousel/Textures/UV_Polaroid_frame_Template_TEST_NORMAL_V2.png"
    cwebp -q 90 "Windsurf carrousel/Textures/UV_Polaroid_frame_Template_TEST_NORMAL_V2.png" -o "Windsurf carrousel/Textures/UV_Polaroid_frame_Template_TEST_NORMAL_V2.webp"
    echo "✅ PNG optimisé et converti en WebP"
fi

# Optimiser les images Polaroid
echo "📸 Optimisation des images Polaroid..."
for file in "Windsurf carrousel/Textures"/Polaroid_*.jpg; do
    if [ -f "$file" ]; then
        cp "$file" "$file.backup"
        jpegoptim --max=85 --strip-all "$file"
        cwebp -q 85 "$file" -o "${file%.jpg}.webp"
        echo "✅ $(basename "$file") optimisé"
    fi
done

echo "✨ Optimisation terminée!"
echo ""
echo "📊 Résumé:"
echo "- Images JPG optimisées avec jpegoptim (qualité 85%)"
echo "- Images PNG optimisées avec optipng"
echo "- Versions WebP créées pour tous les formats"
echo "- Backups créés avec extension .backup"
echo ""
echo "💡 Prochaine étape: Mettre à jour le code pour utiliser les images WebP"
