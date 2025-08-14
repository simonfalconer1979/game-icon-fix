@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title Steam Icon Fixer - Launcher

:: Steam Icon Fixer - Enhanced Launcher
:: Provides multiple modes for running the Steam Icon Fixer
:: Author: @mrsimb
:: Version: 3.1.0

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
echo   +===============================================================+
echo   ^|                                                               ^|
echo   ^|                    STEAM ICON FIXER 3.1                      ^|
echo   ^|                 Enhanced Multi-Library Support                ^|
echo   ^|                                                               ^|
echo   +===============================================================+
echo.
echo   Select an option:
echo.
echo   [1] Interactive UI Mode (Recommended)
echo       Beautiful retro terminal interface with menu navigation
echo.
echo   [2] Fix Current Directory
echo       Process all Steam shortcuts in current folder
echo.
echo   [3] Fix Desktop Icons
echo       Process all Steam shortcuts on your Desktop
echo.
echo   [4] Refresh ALL Desktop Shortcuts
echo       Delete and recreate all Steam shortcuts
echo.
echo   [5] Custom Steam Path
echo       Specify a custom Steam installation path
echo.
echo   [6] Accessibility Mode
echo       Enable screen reader friendly mode
echo.
echo   [7] Show Help
echo       Display command line usage and options
echo.
echo   [8] Exit
echo.
echo   ===============================================================
echo.
set /p choice="   Enter your choice (1-8): "

if "%choice%"=="1" goto :ui_mode
if "%choice%"=="2" goto :current_dir
if "%choice%"=="3" goto :desktop
if "%choice%"=="4" goto :refresh_all
if "%choice%"=="5" goto :custom_path
if "%choice%"=="6" goto :accessibility_mode
if "%choice%"=="7" goto :show_help
if "%choice%"=="8" goto :exit

echo.
echo   Invalid choice. Please try again.
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
echo   * Automatic Steam detection across all libraries
echo   * Directory browser with file selection
echo   * Real-time progress tracking
echo   * Color-coded status updates
echo.
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

:current_dir
cls
color 0A
echo.
echo   +===============================================================+
echo   ^|              Processing Current Directory...                  ^|
echo   +===============================================================+
echo.
echo   Working directory: %CD%
echo.
deno run -N -R -W -E --allow-run mod.ts .
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo   Error: Failed to process current directory.
    echo   Make sure there are Steam shortcuts (.url files) in this folder.
    echo.
)
pause
goto :show_menu

:desktop
cls
color 0A
echo.
echo   +===============================================================+
echo   ^|                Processing Desktop Icons...                    ^|
echo   +===============================================================+
echo.
echo   Desktop path: %USERPROFILE%\Desktop
echo.
deno run -N -R -W -E --allow-run mod.ts "%USERPROFILE%\Desktop"
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo   Error: Failed to process desktop shortcuts.
    echo   Make sure there are Steam shortcuts on your desktop.
    echo.
)
pause
goto :show_menu

:refresh_all
cls
color 0E
echo.
echo   +===============================================================+
echo   ^|           Refresh ALL Desktop Shortcuts                       ^|
echo   +===============================================================+
echo.
echo   ⚠️  WARNING: This will:
echo   • Delete ALL existing Steam shortcuts on your desktop
echo   • Recreate shortcuts for ALL installed Steam games
echo   • Download missing icons automatically
echo.
echo   This is useful when:
echo   • Icons are corrupted or missing
echo   • You want a fresh set of all game shortcuts
echo   • Steam shortcuts are not working properly
echo.
echo   Starting refresh process...
echo.
deno run -N -R -W -E --allow-run mod.ts --refresh-all
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo   Error: Failed to refresh shortcuts.
    echo.
)
pause
goto :show_menu

:custom_path
cls
color 0D
echo.
echo   +===============================================================+
echo   ^|                   Custom Steam Path                           ^|
echo   +===============================================================+
echo.
echo   Enter the path to your Steam installation:
echo   (e.g., D:\Games\Steam or C:\Program Files\Steam)
echo.
set /p steam_path="   Steam path: "

if not exist "%steam_path%" (
    color 0C
    echo.
    echo   Error: Path does not exist!
    echo.
    pause
    goto :show_menu
)

cls
echo.
echo   Processing with custom Steam path: %steam_path%
echo.
set /p target_path="   Enter path to scan for shortcuts (or press Enter for current): "
if "%target_path%"=="" set target_path=.

deno run -N -R -W -E --allow-run mod.ts --steampath="%steam_path%" "%target_path%"
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo   Error: Failed to process with custom Steam path.
    echo.
)
pause
goto :show_menu

:accessibility_mode
cls
color 0F
echo.
echo   +===============================================================+
echo   ^|                   Accessibility Mode                          ^|
echo   +===============================================================+
echo.
echo   This mode enables:
echo   • No animations or spinners
echo   • High contrast colors
echo   • Verbose text descriptions
echo   • Simple ASCII characters
echo   • Screen reader friendly output
echo.
echo   Select accessibility preset:
echo.
echo   [1] Full Accessibility (All features)
echo   [2] Vision Support (High contrast, large text)
echo   [3] Motion Sensitivity (No animations)
echo   [4] Cognitive Support (Simple, clear)
echo   [5] Custom (Configure in app)
echo.
set /p preset="   Enter preset (1-5): "

set accessibility_flag=
if "%preset%"=="1" set accessibility_flag=--accessibility=full
if "%preset%"=="2" set accessibility_flag=--accessibility=vision
if "%preset%"=="3" set accessibility_flag=--accessibility=motion
if "%preset%"=="4" set accessibility_flag=--accessibility=cognitive
if "%preset%"=="5" set accessibility_flag=--accessibility

echo.
echo   Starting in accessibility mode...
echo.
deno run -N -R -W -E --allow-run mod.ts %accessibility_flag%
if %errorlevel% neq 0 (
    echo.
    echo   Error occurred while running in accessibility mode.
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

:show_help
cls
color 0F
echo.
echo   +===============================================================+
echo   ^|                    Steam Icon Fixer - Help                    ^|
echo   +===============================================================+
echo.
echo   USAGE:
echo   ------
echo   steam-icon-fixer.bat                    Launch interactive menu
echo   steam-icon-fixer.bat [paths...]         Process specific paths
echo   steam-icon-fixer.bat --help             Show this help
echo.
echo   DRAG AND DROP:
echo   --------------
echo   You can drag and drop folders or .url files directly onto this
echo   batch file to process them immediately.
echo.
echo   COMMAND LINE OPTIONS:
echo   ---------------------
echo   --steampath="path"    Specify custom Steam installation path
echo   --accessibility       Enable accessibility mode
echo   --accessibility=preset Use preset (full, vision, motion, cognitive)
echo.
echo   EXAMPLES:
echo   ---------
echo   steam-icon-fixer.bat
echo     Launch interactive menu
echo.
echo   steam-icon-fixer.bat "C:\Users\You\Desktop"
echo     Fix all Steam shortcuts on desktop
echo.
echo   steam-icon-fixer.bat --steampath="D:\Steam" .
echo     Use custom Steam path and process current directory
echo.
echo   PERMISSIONS:
echo   ------------
echo   The app requires these Deno permissions:
echo   -N  Network access (download icons from Steam CDN)
echo   -R  Read access (read shortcuts and Steam config)
echo   -W  Write access (save icon files)
echo   --allow-run  Run reg.exe (find Steam in registry)
echo.
echo   FEATURES:
echo   ---------
echo   • Detects all Steam libraries automatically
echo   • Parses Steam configuration files (libraryfolders.vdf)
echo   • Verifies installed games via app manifests
echo   • Tries multiple CDN endpoints for reliability
echo   • Smart icon caching (skips existing icons)
echo   • Beautiful retro ASCII interface
echo   • Full accessibility support
echo   • Customizable UI and performance settings
echo.
pause
goto :show_menu

:exit
cls
color 07
echo.
echo   Thanks for using Steam Icon Fixer!
echo   Made with ♥ in retro style by @mrsimb
echo.
echo   GitHub: https://github.com/mrsimb/steam-blank-icon
echo.
timeout /t 2 >nul
exit /b 0