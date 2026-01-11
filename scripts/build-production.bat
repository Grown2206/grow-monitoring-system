@echo off
REM Grow Monitoring System - Production Build Script (Windows)
REM Builds all Docker images for production deployment

echo ======================================
echo Grow Monitoring System - Production Build
echo ======================================
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker ist nicht installiert!
    echo Bitte installieren: https://docs.docker.com/desktop/install/windows-install/
    exit /b 1
)

REM Check if .env.production exists
if not exist .env.production (
    echo [WARNING] .env.production nicht gefunden
    if exist .env.production.example (
        echo Erstelle .env.production aus .env.production.example...
        copy .env.production.example .env.production
        echo [WARNING] Bitte .env.production bearbeiten und Passwoerter setzen!
        pause
        exit /b 1
    ) else (
        echo [ERROR] .env.production.example nicht gefunden!
        exit /b 1
    )
)

echo [%TIME%] Building Frontend...
docker build -t grow-frontend:latest ./frontend
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed
    exit /b 1
)
echo [OK] Frontend build successful
echo.

echo [%TIME%] Building Backend...
docker build -t grow-backend:latest ./backend
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend build failed
    exit /b 1
)
echo [OK] Backend build successful
echo.

echo [%TIME%] Building Nginx...
docker build -t grow-nginx:latest ./nginx
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Nginx build failed
    exit /b 1
)
echo [OK] Nginx build successful
echo.

echo [%TIME%] Building Mosquitto...
docker build -t grow-mosquitto:latest ./mosquitto
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Mosquitto build failed
    exit /b 1
)
echo [OK] Mosquitto build successful
echo.

echo [%TIME%] Pulling external images...
docker pull mongo:7.0
docker pull grafana/grafana:latest
docker pull prom/prometheus:latest

echo.
echo ======================================
echo Build Summary
echo ======================================
docker images | findstr /I "grow- mongo grafana prometheus"

echo.
echo ======================================
echo Build completed successfully!
echo ======================================
echo.
echo Next steps:
echo 1. Review .env.production and set all passwords
echo 2. Start containers: docker-compose -f docker-compose.production.yml up -d
echo 3. Check logs: docker-compose -f docker-compose.production.yml logs -f
echo 4. Open Web UI: http://localhost:8080
echo.
pause
