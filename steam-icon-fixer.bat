@echo off
chcp 65001 >nul 2>&1
title Game Icon Fixer - Web App

:: Web launcher for Game Icon Fixer
:: Version: 3.0.1 (Web-only)

:: Check for Deno
where deno >nul 2>&1
if errorlevel 1 (
  color 0C
  echo.
  echo  ╔═══════════════════════════════════════════════════════════════╗
  echo  ║                 ERROR: Deno is not installed                  ║
  echo  ╚═══════════════════════════════════════════════════════════════╝
  echo.
  echo  Install Deno from: https://deno.land
  echo  Quick install - Run PowerShell as Admin:
  echo    irm https://deno.land/install.ps1 -useb ^| iex
  echo.
  pause
  exit /b 1
)

:: Start server immediately
cls
color 0A
echo.
echo   ╔═══════════════════════════════════════════════════════════════╗
echo   ║                                                               ║
echo   ║                   GAME ICON FIXER - WEB                      ║
echo   ║                   Fix Steam Desktop Icons                    ║
echo   ║                                                               ║
echo   ╚═══════════════════════════════════════════════════════════════╝
echo.
echo   Starting web server at: http://localhost:5174
echo.
echo   Opening browser...
start "" http://localhost:5174
echo.
echo   ──────────────────────────────────────────────────────────────
echo   Press Ctrl+C to stop the server and exit
echo   ──────────────────────────────────────────────────────────────
echo.
deno run -N -R -W --allow-run --allow-env web_server.ts
echo.
echo   Server stopped.
echo.
pause
exit /b 0