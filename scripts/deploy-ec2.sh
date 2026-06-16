#!/bin/bash

# RefreeG EC2 Deployment Script
# This script handles pulling code, installing dependencies, building, and restarting the service.

set -e # Exit on error

echo "🚀 Starting Deployment..."

# 1. Pull the latest code
echo "📥 Pulling latest code from git..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install --frozen-lockfile

# 3. Build the application
echo "🏗️ Building Next.js application..."
npm run build

# 4. Handle standalone build files
echo "📂 Preparing standalone files..."
# Standalone mode puts everything in .next/standalone
# We need to copy 'public' and '.next/static' into it for it to work
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# 5. Restart the application using PM2
echo "🔄 Restarting application with PM2..."
# If the process isn't running, start it. If it is, reload it.
pm2 start .next/standalone/server.js --name "refreeg-app" || pm2 reload "refreeg-app"

# 6. Save PM2 state
pm2 save

echo "✅ Deployment Complete! App is running on port 3000."

# ---------------------------------------------------------------------
# NGINX CONFIGURATION TEMPLATE (Save to /etc/nginx/sites-available/refreeg)
# ---------------------------------------------------------------------
# server {
#     listen 80;
#     server_name yourdomain.com; # <--- Replace with your domain
#
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }
# ---------------------------------------------------------------------
