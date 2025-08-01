FROM php:8.3-fpm-alpine

# Installe les dépendances nécessaires pour mysqli, pdo_mysql et Xdebug
RUN apk add --no-cache \
    autoconf \
    g++ \
    make \
    mysql-dev \
    # Ajoute les dépendances pour Xdebug
    # Xdebug n'a pas de dépendances apk supplémentaires spécifiques pour 'docker-php-ext-install'
    # mais 'g++', 'make', 'autoconf' sont nécessaires pour la compilation en général.
    && rm -rf /var/cache/apk/* # Nettoie le cache après installation

# Installe les extensions PHP (mysqli, pdo_mysql et Xdebug)
RUN docker-php-ext-install \
    mysqli \
    pdo_mysql

# Définir le répertoire de travail
WORKDIR /var/www/html

# Expose le port par défaut de PHP-FPM
EXPOSE 9000