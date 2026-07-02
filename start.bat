@echo off
title CERP - Starting...
echo.
echo  Starting CERP Emergency Platform
echo  ==================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Docker services (DB + Redis only)...
docker compose up -d postgres redis
if %errorlevel% neq 0 (
  echo  ERROR: Docker failed. Is Docker Desktop running?
  pause
  exit /b 1
)

echo.
echo [2/2] Starting API + Web...
echo.
echo  API  ^>  http://localhost:4000
echo  Web  ^>  http://localhost:3000
echo.
pnpm dev
