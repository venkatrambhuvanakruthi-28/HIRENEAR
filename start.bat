@echo off
title HireNear - Local Job Marketplace
echo ========================================================
echo   Starting HireNear - Local Job Marketplace & AI Engine
echo   "Find Jobs. Find People. Hire Near."
echo ========================================================
echo.

cd /d "%~dp0backend"

echo Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo You can also run HireNear by simply opening index.html in any browser!
    pause
    exit /b 1
)

echo Starting FastAPI & AI Recommendation Server on http://localhost:8000...
echo Opening browser...
start http://localhost:8000

python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0

pause
