#!/bin/bash

echo "🧪 Test de connexion au serveur..."

# Test de connexion SSH et vérification du répertoire
ssh root@clubcovoit.com << 'EOF'
echo "✅ Connexion SSH réussie !"
echo "📍 Répertoire actuel : $(pwd)"
echo "📂 Vérification du répertoire de l'app..."

if [ -d "/var/www/vhosts/clubcovoit.com/httpdocs" ]; then
    echo "✅ Répertoire trouvé : /var/www/vhosts/clubcovoit.com/httpdocs"
    cd /var/www/vhosts/clubcovoit.com/httpdocs
    echo "📍 Dans le répertoire : $(pwd)"
    echo "📋 Contenu du répertoire :"
    ls -la | head -10
    echo "🔍 Statut Git :"
    git status --porcelain
    echo "🌿 Branche actuelle :"
    git branch --show-current
else
    echo "❌ Répertoire non trouvé, recherche..."
    find /var -name "*clubcovoit*" -type d 2>/dev/null | head -5
fi

echo "🧪 Test terminé - AUCUNE modification effectuée"
EOF
