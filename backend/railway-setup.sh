#!/bin/bash

# Railway Setup Script
echo "=== Railway Environment Setup ==="

# Print current environment for debugging
echo "APP_URL from env: ${APP_URL}"
echo "FILESYSTEM_DISK from env: ${FILESYSTEM_DISK}"

# Create storage link
php artisan storage:link

# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear

echo "=== Setup Complete ==="
