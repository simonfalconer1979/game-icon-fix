@echo off
:: Development server with full permissions for testing

echo Starting Development Server with Full Permissions...
echo.
echo WARNING: This script runs with ALL permissions enabled.
echo Only use for development and testing!
echo.

:: Full permissions for development:
:: -A : Allow all permissions (shorthand)
:: Equivalent to: --allow-all

deno run -A web_server.ts

pause