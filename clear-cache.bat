@echo off
echo ============================================
echo 🧹 COMPREHENSIVE CACHE CLEARING SCRIPT
echo ============================================

echo.
echo 🛑 Stopping all containers...
docker-compose down

echo.
echo 🗑️ Removing Docker containers and images...
docker-compose rm -f
docker system prune -f

echo.
echo 📦 Removing node_modules and rebuilding...
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist
npm install

echo.
echo 🔨 Building TypeScript...
npm run build

echo.
echo 🚀 Starting fresh containers with full rebuild...
docker-compose up --build -d

echo.
echo 📝 DEVELOPMENT WORKFLOW DISCOVERED:
echo For changes to take effect, always use:
echo   docker-compose down
echo   docker-compose up --build -d
echo.
echo ❌ DON'T USE: docker-compose restart app
echo ✅ USE: Full down/up cycle with --build

echo.
echo ⏳ Waiting for services to start...
timeout /t 10

echo.
echo ✅ Cache clearing complete!
echo.
echo 📝 Next steps:
echo 1. Open browser in Private/Incognito mode
echo 2. Visit http://localhost:3000
echo 3. Hard refresh with Ctrl+F5
echo.
pause