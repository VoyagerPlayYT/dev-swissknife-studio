@echo off
chcp 65001 > nul
title Dev Swissknife Studio [Port 8016]
echo ========================================================
echo   DEV SWISSKNIFE STUDIO [PORT 8016]
echo ========================================================

if exist "C:\Python313\python.exe" (
    set "PY=C:\Python313\python.exe"
) else (
    set "PY=python"
)

echo [INFO] Проверка и освобождение порта 8016...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8016" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [INFO] Запуск веб-сервера на http://localhost:8016 ...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8016"

cd /d "%~dp0"
"%PY%" -m uvicorn main:app --host 127.0.0.1 --port 8016
pause
