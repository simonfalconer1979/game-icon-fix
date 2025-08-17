@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title Game Icon Fixer - Web Launcher

:: Robust launcher for the browser-based UI with ASCII menu, port detection,
:: status checks, and start/stop controls.
:: Author: @simonfalconer1979
:: Version: 2.0.0 (web)

set "WEB_DIR=%~dp0web"
set "BASE_PORT=5173"
set "PID_FILE=%~dp0server.pid"
set "URL_HOST=127.0.0.1"

:: Ensure Deno installed
where deno >nul 2>nul
if %errorlevel% neq 0 (
  color 0C
  echo.
  echo  ╔═══════════════════════════════════════════════════════════════╗
  echo  ║                 ERROR: Deno is not installed                  ║
  echo  ╚═══════════════════════════════════════════════════════════════╝
  echo.
  echo  Install Deno: https://deno.land/manual/getting_started/installation
  echo  Quick (PowerShell as Admin):
  echo    irm https://deno.land/install.ps1 ^| iex
  echo.
  pause
  exit /b 1
)

:: ========================= Helper Labels =========================
:: Check if a process exists by PID -> sets ERRORLEVEL 0 if exists
:_exists_pid
set "_PID=%~1"
if "%_PID%"=="" (exit /b 1)
tasklist /FI "PID eq %_PID%" | findstr /R /C:" %_PID% " >nul 2>&1
exit /b %errorlevel%

:: Check if a TCP port is in use -> ERRORLEVEL 0 if used
:_port_used
set "_PORT=%~1"
netstat -ano | findstr /R ":%_PORT% .*LISTENING" >nul 2>&1
exit /b %errorlevel%

:: Find first free port starting at BASE_PORT -> outputs PORT var
:_find_free_port
set "PORT=%BASE_PORT%"
:_scan_loop
call :_port_used %PORT%
if %errorlevel%==0 (
  set /a PORT=PORT+1
  goto :_scan_loop
)
exit /b 0

:: Read PID file into PID var if valid
:_read_pid
set "PID="
if not exist "%PID_FILE%" exit /b 1
for /f "usebackq delims=" %%p in ("%PID_FILE%") do set "PID=%%p"
if "%PID%"=="" exit /b 1
exit /b 0

:: Write PID var to file
:_write_pid
if "%PID%"=="" exit /b 1
> "%PID_FILE%" echo %PID%
exit /b 0

:: Delete PID file
:_clear_pid
if exist "%PID_FILE%" del /f /q "%PID_FILE%" >nul 2>&1
exit /b 0

:: Ping URL (200 expected) -> ERRORLEVEL 0 if OK
:_check_http
set "_URL=%~1"
powershell -NoProfile -Command "try{(Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%_URL%').StatusCode -eq 200}catch{Exit 1}" >nul 2>&1
exit /b %errorlevel%

:: ============================ Actions ============================
:start_server
call :_read_pid
if not errorlevel 1 (
  call :_exists_pid %PID%
  if %errorlevel%==0 (
    color 0A
    echo.
    echo  Server already running (PID %PID%).
    goto :after_start
  ) else (
    call :_clear_pid
  )
)

call :_find_free_port
set "URL=http://%URL_HOST%:%PORT%"

:: Start Deno server detached and capture PID
powershell -NoProfile -Command "$p=Start-Process -FilePath 'deno' -ArgumentList @('run','-A','https://deno.land/std@0.224.0/http/file_server.ts','%WEB_DIR%','--port','%PORT%','--cors') -PassThru -WindowStyle Minimized; [Console]::Out.Write($p.Id)" > "%PID_FILE%"
call :_read_pid
if errorlevel 1 (
  color 0C
  echo.
  echo  Failed to start server.
  goto :menu
)

:: Wait briefly then health check
timeout /t 1 >nul
call :_check_http %URL%
if %errorlevel%==0 (
  color 0A
  echo.
  echo  ╔═══════════════════════════════════════════════════════════════╗
  echo  ║                        SERVER STARTED                         ║
  echo  ╚═══════════════════════════════════════════════════════════════╝
  echo    PID: %PID%
  echo    URL: %URL%
  echo.
  echo  Click or Ctrl+Click the link above to open in your browser.
) else (
  color 0E
  echo.
  echo  Server process started (PID %PID%), awaiting readiness on %URL% ...
)

:after_start
goto :menu

:open_browser
call :_read_pid >nul 2>&1
if errorlevel 1 (
  set "PORT=%BASE_PORT%"
)
if not defined URL set "URL=http://%URL_HOST%:%PORT%"
start "" %URL%
echo.
echo  Opening: %URL%
goto :menu

:status
set "STATUS=STOPPED"
call :_read_pid >nul 2>&1
if errorlevel 1 goto :_print_status
call :_exists_pid %PID%
if %errorlevel%==0 set "STATUS=RUNNING (PID %PID%)"

:_print_status
color 0B
echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║                            STATUS                              ║
echo  ╚═══════════════════════════════════════════════════════════════╝
echo    Server: %STATUS%
if defined URL echo    URL: %URL%
echo.
goto :menu

:stop_server
call :_read_pid
if errorlevel 1 (
  color 0E
  echo.
  echo  No PID file found; server may not be running.
  goto :menu
)
call :_exists_pid %PID%
if %errorlevel%==0 (
  taskkill /PID %PID% /F >nul 2>&1
  call :_clear_pid
  color 0A
  echo.
  echo  Server stopped.
) else (
  call :_clear_pid
  color 0E
  echo.
  echo  Server process not found. Cleared stale PID file.
)
goto :menu

:: ============================== UI ===============================
:menu
cls
color 0B
echo.
echo   ╔═══════════════════════════════════════════════════════════════╗
echo   ║                                                               ║
echo   ║                    GAME ICON FIXER - WEB                       ║
echo   ║                 Serve ^& Control Local Web UI                  ║
echo   ║                                                               ║
echo   ╚═══════════════════════════════════════════════════════════════╝
echo.
if defined URL (
  echo     URL: %URL%
) else (
  set "PORT=%BASE_PORT%"
  echo     URL: http://%URL_HOST%:%PORT%
)
echo.
echo   [1] Start Server
echo   [2] Open in Browser
echo   [3] Status
echo   [4] Stop Server
echo   [Q] Quit
echo.
set /p choice="   Enter your choice: "
if /i "%choice%"=="1" goto :start_server
if /i "%choice%"=="2" goto :open_browser
if /i "%choice%"=="3" goto :status
if /i "%choice%"=="4" goto :stop_server
if /i "%choice%"=="q" goto :exit
echo.
echo   Invalid choice. Try again.
timeout /t 1 >nul
goto :menu

:exit
color 07
echo.
echo   Goodbye!
echo.
exit /b 0