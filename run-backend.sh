#!/bin/bash
# run-backend.sh
# Loads environment variables from .env and starts the Spring Boot backend

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo ".env file not found at $ENV_FILE. Please copy .env.example to .env and fill in your credentials."
    exit 1
fi

echo "Loading environment variables from .env..."

# Export variables from .env, ignoring comments and empty lines
set -a
source "$ENV_FILE"
set +a

echo ""
echo "Starting backend..."

cd backend || exit 1
SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-local}" ./mvnw spring-boot:run
