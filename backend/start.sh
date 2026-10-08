#!/bin/bash
set -e

echo "=== Railway Laravel Startup Script ==="

# Generate .env from Railway environment variables
cat > .env << EOF
APP_NAME=${APP_NAME:-Laravel}
APP_ENV=${APP_ENV:-production}
APP_KEY=${APP_KEY}
APP_DEBUG=${APP_DEBUG:-false}
APP_URL=${APP_URL:-http://localhost}

DB_CONNECTION=${DB_CONNECTION:-mysql}
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE:-laravel}
DB_USERNAME=${DB_USERNAME:-root}
DB_PASSWORD=${DB_PASSWORD}

SESSION_DRIVER=${SESSION_DRIVER:-database}
CACHE_STORE=${CACHE_STORE:-database}
QUEUE_CONNECTION=${QUEUE_CONNECTION:-database}
LOG_CHANNEL=${LOG_CHANNEL:-stderr}
FILESYSTEM_DISK=${FILESYSTEM_DISK:-public}
EOF

echo "✓ Generated .env file"
echo "APP_URL = ${APP_URL}"
echo "FILESYSTEM_DISK = ${FILESYSTEM_DISK}"

# Create storage link
php artisan storage:link || echo "⚠ Storage link already exists or failed"

# Clear caches
php artisan config:clear
php artisan cache:clear

echo "=== Starting Laravel Server ==="
php artisan serve --host=0.0.0.0 --port=${PORT:-8000}
