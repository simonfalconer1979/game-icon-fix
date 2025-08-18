@echo off
:: Run the web server with proper permissions

echo Starting Steam Icon Fixer Web Server...
echo.

:: Deno permissions explained:
:: --allow-net=0.0.0.0:5175,localhost:5175  : Allow network access to localhost on port 5175
:: --allow-read                : Read Steam installation, desktop shortcuts, and web files
:: --allow-write               : Write icon files to Steam directory
:: --allow-run                 : Execute reg.exe to read Windows Registry for Steam paths
:: --allow-env                 : Access environment variables like USERPROFILE

deno run ^
  --allow-net=0.0.0.0:5175,localhost:5175 ^
  --allow-read ^
  --allow-write ^
  --allow-run ^
  --allow-env ^
  web_server.ts

pause