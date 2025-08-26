@echo off
:: Steam Icon Fixer - Build Batch Wrapper
:: Simple wrapper for the PowerShell build script

powershell.exe -ExecutionPolicy Bypass -File "%~dp0build.ps1" %*