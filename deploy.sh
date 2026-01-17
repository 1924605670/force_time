#!/bin/bash
# Auto-deployment script for Server 8.152.223.130

# Exit immediately if a command exits with a non-zero status
set -e

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
LOG_FILE="deploy.log"

echo "[$TIMESTAMP] Starting deployment..." | tee -a $LOG_FILE

# 1. Pull latest code
echo "[$TIMESTAMP] Pulling latest code from git..." | tee -a $LOG_FILE
git pull origin main

# 2. Rebuild and restart containers
echo "[$TIMESTAMP] Building and starting services..." | tee -a $LOG_FILE
docker compose up -d --build

# 3. Verify services
echo "[$TIMESTAMP] Verifying service health..." | tee -a $LOG_FILE
sleep 5 # Wait for services to initialize

if docker compose ps | grep -q "Up"; then
    echo "[$TIMESTAMP] Services are up and running!" | tee -a $LOG_FILE
else
    echo "[$TIMESTAMP] Error: Some services failed to start." | tee -a $LOG_FILE
    docker compose logs --tail=50
    exit 1
fi

# 4. Clean up
echo "[$TIMESTAMP] Cleaning up unused images..." | tee -a $LOG_FILE
docker image prune -f

echo "[$TIMESTAMP] Deployment completed successfully." | tee -a $LOG_FILE
