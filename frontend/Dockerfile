# ==============================
# FRONTEND DOCKERFILE (Multi-Stage Build)
# React + Vite Frontend für Grow Monitoring System
# ==============================

# ===== BUILD STAGE =====
FROM node:18-alpine AS builder

WORKDIR /app

# Kopiere package.json
COPY package*.json ./

# Installiere Dependencies
RUN npm ci

# Kopiere Anwendungscode
COPY . .

# Build für Production
RUN npm run build

# ===== PRODUCTION STAGE =====
FROM nginx:alpine

# Kopiere Build-Artefakte von Builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Kopiere Nginx-Konfiguration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponiere Port 80
EXPOSE 80

# Starte Nginx
CMD ["nginx", "-g", "daemon off;"]
