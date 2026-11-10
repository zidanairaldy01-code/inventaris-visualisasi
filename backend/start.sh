#!/bin/bash
set -e

echo "========================================="
echo "   Railway Laravel Startup Script v2.1   "
echo "========================================="

# Resolve MySQL variables (supporting standard DB_* and Railway MYSQL* names, and guarding against raw ${{...}} templates)
if [[ "${DB_HOST:-}" == *'${{'* ]] || [ -z "${DB_HOST:-}" ]; then
    RESOLVED_DB_HOST="${MYSQLHOST:-${MYSQL_HOST:-mysql.railway.internal}}"
else
    RESOLVED_DB_HOST="$DB_HOST"
fi

if [[ "${DB_PORT:-}" == *'${{'* ]] || [ -z "${DB_PORT:-}" ]; then
    RESOLVED_DB_PORT="${MYSQLPORT:-${MYSQL_PORT:-3306}}"
else
    RESOLVED_DB_PORT="$DB_PORT"
fi

if [[ "${DB_DATABASE:-}" == *'${{'* ]] || [ -z "${DB_DATABASE:-}" ]; then
    RESOLVED_DB_DATABASE="${MYSQLDATABASE:-${MYSQL_DATABASE:-railway}}"
else
    RESOLVED_DB_DATABASE="$DB_DATABASE"
fi

if [[ "${DB_USERNAME:-}" == *'${{'* ]] || [ -z "${DB_USERNAME:-}" ]; then
    RESOLVED_DB_USERNAME="${MYSQLUSER:-${MYSQL_USER:-root}}"
else
    RESOLVED_DB_USERNAME="$DB_USERNAME"
fi

if [[ "${DB_PASSWORD:-}" == *'${{'* ]] || [ -z "${DB_PASSWORD:-}" ]; then
    RESOLVED_DB_PASSWORD="${MYSQLPASSWORD:-${MYSQL_PASSWORD:-}}"
else
    RESOLVED_DB_PASSWORD="$DB_PASSWORD"
fi

RESOLVED_DB_URL="${DB_URL:-${MYSQL_URL:-${MYSQL_PRIVATE_URL:-${DATABASE_URL:-}}}}"

# Generate .env from Railway environment variables
cat > .env << EOF
APP_NAME=${APP_NAME:-Laravel}
APP_ENV=${APP_ENV:-production}
APP_KEY=${APP_KEY:-}
APP_DEBUG=${APP_DEBUG:-false}
APP_URL=${APP_URL:-http://localhost}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}

DB_CONNECTION=${DB_CONNECTION:-mysql}
DB_HOST=${RESOLVED_DB_HOST}
DB_PORT=${RESOLVED_DB_PORT}
DB_DATABASE=${RESOLVED_DB_DATABASE}
DB_USERNAME=${RESOLVED_DB_USERNAME}
DB_PASSWORD=${RESOLVED_DB_PASSWORD}
DB_URL=${RESOLVED_DB_URL}
MYSQL_URL=${RESOLVED_DB_URL}

SESSION_DRIVER=${SESSION_DRIVER:-database}
SESSION_LIFETIME=${SESSION_LIFETIME:-120}
SESSION_ENCRYPT=${SESSION_ENCRYPT:-false}
SESSION_PATH=${SESSION_PATH:-/}
SESSION_DOMAIN=${SESSION_DOMAIN:-}
SESSION_SECURE_COOKIE=${SESSION_SECURE_COOKIE:-true}
SESSION_HTTP_ONLY=${SESSION_HTTP_ONLY:-true}
SESSION_SAME_SITE=${SESSION_SAME_SITE:-none}

CACHE_STORE=${CACHE_STORE:-database}
QUEUE_CONNECTION=${QUEUE_CONNECTION:-database}
LOG_CHANNEL=${LOG_CHANNEL:-stderr}
FILESYSTEM_DISK=${FILESYSTEM_DISK:-public}

CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-}

SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-}
SUPABASE_STORAGE_BUCKET=${SUPABASE_STORAGE_BUCKET:-inventaris-photo}
EOF

echo "✓ Generated .env file successfully"
echo "APP_URL = ${APP_URL:-http://localhost}"
echo "FRONTEND_URL = ${FRONTEND_URL:-http://localhost:3000}"
echo "DB_HOST = ${RESOLVED_DB_HOST}:${RESOLVED_DB_PORT}"
echo "DB_DATABASE = ${RESOLVED_DB_DATABASE}"
echo "DB_USERNAME = ${RESOLVED_DB_USERNAME}"

# Check APP_KEY
if [ -z "$APP_KEY" ]; then
    echo "⚠️  APP_KEY is not set. Generating key automatically..."
    php artisan key:generate --force
else
    echo "✓ APP_KEY is configured"
fi

# Check DB Password
if [ -z "$RESOLVED_DB_PASSWORD" ] && [ -z "$RESOLVED_DB_URL" ]; then
    echo "⚠️  WARNING: DB_PASSWORD / MYSQLPASSWORD kosong!"
    echo "   Database MySQL di Railway memerlukan password."
    echo "   Silakan tambahkan DB_PASSWORD di tab Variables service Laravel di Railway."
fi

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
php artisan storage:link || echo "⚠ Storage link already exists or skipped"

# Clear old configuration cache
echo "Clearing configuration cache..."
php artisan config:clear

# Run migrations
echo "Running database migrations..."
if php artisan migrate --force; then
    echo "✓ Migrations executed successfully."

    # Auto-seed initial master data and admin accounts
    echo "Ensuring initial master data and default accounts (seeder)..."
    php artisan db:seed --force || echo "⚠ Seeder note: skipped or table already populated"

    # Only cache config after successful setup
    php artisan config:cache || echo "⚠ Config caching failed"
else
    echo "❌ Migration failed! Cek kembali konfigurasi koneksi database Anda di Railway."
    echo "   Pastikan service MySQL aktif dan DB_PASSWORD sudah sesuai."
fi

SERVER_PORT="${PORT:-8080}"
echo "=== Starting Laravel Server on port ${SERVER_PORT} ==="
exec php artisan serve --host=0.0.0.0 --port="${SERVER_PORT}"
