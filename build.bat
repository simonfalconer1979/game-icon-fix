@echo off
REM Steam Icon Fixer - Build Script Wrapper
REM Simple batch file to run PowerShell build script

powershell.exe -ExecutionPolicy Bypass -File "%~dp0build.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Build failed with error code %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)