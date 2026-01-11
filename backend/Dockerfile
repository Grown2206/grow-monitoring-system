# ==============================
# BACKEND DOCKERFILE
# Node.js + Express Backend für Grow Monitoring System
# ==============================

FROM node:18-alpine

# Installiere FFmpeg für Timelapse-Video-Generierung
RUN apk add --no-cache ffmpeg

# Setze Arbeitsverzeichnis
WORKDIR /app

# Kopiere package.json und package-lock.json
COPY package*.json ./

# Installiere Dependencies
RUN npm ci --only=production

# Kopiere Anwendungscode
COPY . .

# Erstelle Verzeichnisse für Uploads
RUN mkdir -p uploads/captures uploads/videos uploads/plants

# Exponiere Port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Starte Server
CMD ["npm", "start"]
