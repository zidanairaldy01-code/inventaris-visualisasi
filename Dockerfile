FROM php:8.2-apache

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
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && a2enmod rewrite

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy backend code
COPY backend/ .

# Set permissions
RUN chmod -R 777 storage bootstrap/cache

# Install composer dependencies (no scripts to avoid dotenv issues at build time)
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Configure Apache
RUN echo '<VirtualHost *:80>\n\
    DocumentRoot /var/www/html/public\n\
    <Directory /var/www/html/public>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

EXPOSE 80

# Create .env at startup from only the known vars, then run migrations
CMD bash -c '\
  echo "APP_NAME=${APP_NAME:-SistemInventarisAset}" > .env && \
  echo "APP_ENV=${APP_ENV:-production}" >> .env && \
  echo "APP_KEY=${APP_KEY}" >> .env && \
  echo "APP_DEBUG=${APP_DEBUG:-false}" >> .env && \
  echo "APP_URL=${APP_URL:-http://localhost}" >> .env && \
  echo "DB_CONNECTION=${DB_CONNECTION:-mysql}" >> .env && \
  echo "DB_URL=${DB_URL}" >> .env && \
  echo "SESSION_DRIVER=${SESSION_DRIVER:-database}" >> .env && \
  echo "SESSION_LIFETIME=${SESSION_LIFETIME:-120}" >> .env && \
  echo "QUEUE_CONNECTION=${QUEUE_CONNECTION:-database}" >> .env && \
  echo "CACHE_STORE=${CACHE_STORE:-database}" >> .env && \
  echo "LOG_CHANNEL=${LOG_CHANNEL:-stack}" >> .env && \
  echo "LOG_LEVEL=${LOG_LEVEL:-error}" >> .env && \
  php artisan config:clear && \
  php artisan migrate --force && \
  apache2-foreground'
