@echo off
chcp 65001 > nul
title Dev Swissknife Studio [Port 8016]
echo ========================================================
echo   DEV SWISSKNIFE // REGEX, JSON, SQL & CRYPTO STUDIO
echo ========================================================
echo [INFO] Проверка и установка зависимостей...
python -m pip install -r requirements.txt --quiet
echo [INFO] Запуск FastAPI веб-сервера на http://localhost:8016 ...
start http://localhost:8016
python -m uvicorn main:app --host 0.0.0.0 --port 8016
pause
