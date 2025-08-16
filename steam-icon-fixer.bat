@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title Steam Icon Fixer - Launcher

:: Steam Icon Fixer - Simple Launcher
:: Launch the Steam Icon Fixer with a single click
:: Author: @simonfalconer1979
:: Version: 1.0.0

:: Check if Deno is installed
where deno >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ===============================================
    echo   ERROR: Deno is not installed or not in PATH
    echo  ===============================================
    echo.
    echo  Please install Deno first:
    echo  https://deno.land/manual/getting_started/installation
    echo.
    echo  Quick install: Run this in PowerShell as Admin:
    echo  irm https://deno.land/install.ps1 ^| iex
    echo.
    pause
    exit /b 1
)

:: Handle command line arguments for drag & drop
if not "%~1"=="" goto :process_files

:show_menu
cls
color 0B
echo.
echo   ╔═══════════════════════════════════════════════════════════════╗
echo   ║                                                               ║
echo   ║                    STEAM ICON FIXER 1.0                      ║
echo   ║                 Fix Your Blank Steam Icons                    ║
echo   ║                                                               ║
echo   ╚═══════════════════════════════════════════════════════════════╝
echo.
echo   Select an option:
echo.
echo   [1] Launch Steam Icon Fixer
echo       • Fixed 85x50 character window
echo       • Interactive menu system
echo       • Auto-detects Steam installation
echo       • Beautiful retro ASCII interface
echo.
echo   [Q] Quit
echo.
echo   ═════════════════════════════════════════════════════════════════
echo.
set /p choice="   Enter your choice (1 or Q): "

if /i "%choice%"=="1" goto :ui_mode
if /i "%choice%"=="q" goto :exit

echo.
echo   Invalid choice. Please enter 1 or Q.
timeout /t 2 >nul
goto :show_menu

:ui_mode
cls
color 0E
echo.
echo   +===============================================================+
echo   ^|                  Launching Interactive UI...                  ^|
echo   +===============================================================+
echo.
echo   Features:
echo   * Fixed-size non-resizable console window
echo   * Automatic Steam detection across all libraries
echo   * Directory browser with file selection
echo   * Real-time progress tracking
echo   * Color-coded status updates
echo.
echo   The application will open in a fixed 85x50 character window.
echo   Starting...
echo.
deno run -N -R -W -E --allow-run mod.ts
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo   Error occurred while running the application.
    echo.
)
pause
goto :show_menu

:process_files
:: Process files/folders passed as arguments (drag & drop support)
cls
color 0A
echo.
echo   +===============================================================+
echo   ^|              Processing Dropped Files/Folders                 ^|
echo   +===============================================================+
echo.
echo   Processing %* 
echo.

:: Build the command with all arguments
set args=
:build_args
if "%~1"=="" goto :run_with_args
set args=!args! "%~1"
shift
goto :build_args

:run_with_args
deno run -N -R -W -E --allow-run mod.ts !args!
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo   Error: Failed to process the selected files/folders.
    echo.
)
echo.
pause
exit /b

:exit
cls
color 07
echo.
echo   Thanks for using Steam Icon Fixer!
echo   Made with ♥ by @simonfalconer1979
echo.
echo   GitHub: https://github.com/simonfalconer1979/icon-fixer
echo.
timeout /t 2 >nul
exit /b 0