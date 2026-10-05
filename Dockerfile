FROM php:8.2-cli

# Install system dependencies & PHP extensions
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory to backend
WORKDIR /app/backend

# Copy backend code
COPY backend/ /app/backend/

# Create a blank .env if not exists so artisan commands don't crash
RUN touch /app/backend/.env

# Set permissions for storage and bootstrap/cache
RUN chmod -R 777 /app/backend/storage /app/backend/bootstrap/cache

# Install composer dependencies
RUN composer install --no-dev --optimize-autoloader

EXPOSE 8080

CMD ["sh", "-c", "php artisan storage:link || true && php artisan optimize:clear && php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=${PORT:-8080}"]
