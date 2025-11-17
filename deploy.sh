#!/bin/bash

echo "🚀 Déploiement ClubCovoit..."

# Vérifier que nous sommes sur la branche main
if [ "$(git branch --show-current)" != "main" ]; then
    echo "❌ Vous devez être sur la branche main"
    exit 1
fi

# Pousser les changements vers GitHub
echo "📤 Push vers GitHub..."
git push origin main

# Déployer sur le serveur
echo "🔄 Déploiement sur le serveur..."
ssh root@clubcovoit.com << 'EOF'
cd /var/www/vhosts/clubcovoit.com/httpdocs
echo "📥 Récupération du code..."
git pull origin main
echo "📦 Installation des dépendances..."
bundle install
echo "🗄️ Migration de la base de données..."
RAILS_ENV=production bundle exec rails db:migrate
echo "🔄 Redémarrage de l'application..."
touch tmp/restart.txt
echo "✅ Déploiement terminé !"
EOF

echo "🎉 Déploiement réussi ! Vérifiez https://clubcovoit.com"
