@echo off
echo ============================================
echo   CHANCE APP - Fresh Setup
echo ============================================
echo.

REM Force UTF-8 mode in this terminal
chcp 65001 >nul 2>&1

echo [1/4] Fixing file encoding (UTF-8)...

REM Rewrite package.json as guaranteed UTF-8 (no BOM)
powershell -Command "$content = '{\"name\":\"chance-web\",\"version\":\"0.1.0\",\"private\":true,\"scripts\":{\"dev\":\"next dev\",\"build\":\"next build\",\"start\":\"next start\"},\"dependencies\":{\"next\":\"^14.2.0\",\"react\":\"^18.3.0\",\"react-dom\":\"^18.3.0\",\"@supabase/supabase-js\":\"^2.45.0\"}}'; $utf8NoBom = New-Object System.Text.UTF8Encoding $false; [System.IO.File]::WriteAllText('package.json', $content, $utf8NoBom)"
echo    package.json: UTF-8 OK

echo.
echo [2/4] Cleaning old installs...
if exist node_modules rmdir /s /q node_modules
if exist .next rmdir /s /q .next
if exist package-lock.json del package-lock.json

echo.
echo [3/4] Installing dependencies...
call npm install

echo.
echo [4/4] Checking encoding...
powershell -Command "$bytes = [System.IO.File]::ReadAllBytes('package.json'); if ($bytes[0] -eq 0xFF -or $bytes[0] -eq 0xFE) { Write-Host 'ERROR: package.json is UTF-16! Run this script again.' -ForegroundColor Red } else { Write-Host 'package.json encoding: UTF-8 CLEAN' -ForegroundColor Green }"

echo.
echo ============================================
echo   DONE! Now:
echo   1. Edit .env.local with your Supabase keys
echo   2. Run: npm run dev
echo   3. Open: http://localhost:3000
echo ============================================
pause
