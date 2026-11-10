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

# Create a blank .env if not exists so artisan commands don't crash during build
RUN touch /app/backend/.env

# Normalize line endings and set execution permissions on startup script
RUN sed -i 's/\r$//' /app/backend/start.sh && chmod +x /app/backend/start.sh

# Set permissions for storage and bootstrap/cache
RUN chmod -R 777 /app/backend/storage /app/backend/bootstrap/cache

# Install composer dependencies
RUN composer install --no-dev --optimize-autoloader

EXPOSE 8080

CMD ["/bin/bash", "/app/backend/start.sh"]
