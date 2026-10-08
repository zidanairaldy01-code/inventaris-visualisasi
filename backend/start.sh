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
FRONTEND_URL=${FRONTEND_URL}

DB_CONNECTION=${DB_CONNECTION:-mysql}
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE:-laravel}
DB_USERNAME=${DB_USERNAME:-root}
DB_PASSWORD=${DB_PASSWORD}

SESSION_DRIVER=${SESSION_DRIVER:-database}
SESSION_LIFETIME=${SESSION_LIFETIME:-120}
SESSION_ENCRYPT=${SESSION_ENCRYPT:-false}
SESSION_PATH=${SESSION_PATH:-/}
SESSION_DOMAIN=${SESSION_DOMAIN}
SESSION_SECURE_COOKIE=${SESSION_SECURE_COOKIE:-true}
SESSION_HTTP_ONLY=${SESSION_HTTP_ONLY:-true}
SESSION_SAME_SITE=${SESSION_SAME_SITE:-none}

CACHE_STORE=${CACHE_STORE:-database}
QUEUE_CONNECTION=${QUEUE_CONNECTION:-database}
LOG_CHANNEL=${LOG_CHANNEL:-stderr}
FILESYSTEM_DISK=${FILESYSTEM_DISK:-public}

CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS}

SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
SUPABASE_STORAGE_BUCKET=${SUPABASE_STORAGE_BUCKET:-inventaris-photo}
EOF

echo "✓ Generated .env file"
echo "APP_URL = ${APP_URL}"
echo "FRONTEND_URL = ${FRONTEND_URL}"
echo "FILESYSTEM_DISK = ${FILESYSTEM_DISK}"
echo "CORS_ALLOWED_ORIGINS = ${CORS_ALLOWED_ORIGINS}"
echo "SUPABASE_URL = ${SUPABASE_URL}"
echo "SUPABASE_STORAGE_BUCKET = ${SUPABASE_STORAGE_BUCKET}"

# Verify Supabase config
if [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  WARNING: SUPABASE_URL is not set!"
else
    echo "✓ SUPABASE_URL is configured"
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "⚠️  WARNING: SUPABASE_SERVICE_KEY is not set!"
else
    echo "✓ SUPABASE_SERVICE_KEY is configured"
fi

# Create storage link
php artisan storage:link || echo "⚠ Storage link already exists or failed"

# Clear and cache config
echo "Clearing config cache..."
php artisan config:clear
php artisan cache:clear

echo "Caching config..."
php artisan config:cache

# Run migrations
echo "Running migrations..."
php artisan migrate --force

echo "=== Starting Laravel Server ==="
php artisan serve --host=0.0.0.0 --port=${PORT:-8000}
