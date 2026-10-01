#!/bin/bash
set -e

echo "Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader

echo "Generating application key..."
php artisan key:generate --force

echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Running migrations..."
php artisan migrate --force

echo "Build complete!"
