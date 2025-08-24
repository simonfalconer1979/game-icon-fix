# Steam Icon Fixer - Makefile
# Cross-platform build automation

.PHONY: all build clean restore test publish release help

# Default target
all: release

# Build the project
build:
	@powershell -ExecutionPolicy Bypass -File build.ps1 Build

# Clean build artifacts
clean:
	@powershell -ExecutionPolicy Bypass -File build.ps1 Clean

# Restore NuGet packages
restore:
	@powershell -ExecutionPolicy Bypass -File build.ps1 Restore

# Run tests
test:
	@powershell -ExecutionPolicy Bypass -File build.ps1 Test

# Create release executables
publish:
	@powershell -ExecutionPolicy Bypass -File build.ps1 Publish

# Create release artifacts
release:
	@powershell -ExecutionPolicy Bypass -File build.ps1 Release

# Run complete pipeline
pipeline:
	@powershell -ExecutionPolicy Bypass -File build.ps1 All

# Quick build and run
run: build
	@cd SteamIconFixer && dotnet run

# Build debug version
debug:
	@powershell -ExecutionPolicy Bypass -File build.ps1 Build -Configuration Debug

# Show help
help:
	@powershell -ExecutionPolicy Bypass -File build.ps1 Help

# Version-specific releases
release-patch:
	@powershell -ExecutionPolicy Bypass -Command "& { $$v = (Get-Content SteamIconFixer/SteamIconFixer.csproj | Select-String '<AssemblyVersion>([0-9.]+)</AssemblyVersion>').Matches[0].Groups[1].Value; $$parts = $$v.Split('.'); $$parts[2] = [int]$$parts[2] + 1; $$newVer = $$parts -join '.'; ./build.ps1 Release -Version $$newVer }"

release-minor:
	@powershell -ExecutionPolicy Bypass -Command "& { $$v = (Get-Content SteamIconFixer/SteamIconFixer.csproj | Select-String '<AssemblyVersion>([0-9.]+)</AssemblyVersion>').Matches[0].Groups[1].Value; $$parts = $$v.Split('.'); $$parts[1] = [int]$$parts[1] + 1; $$parts[2] = '0'; $$newVer = $$parts -join '.'; ./build.ps1 Release -Version $$newVer }"

release-major:
	@powershell -ExecutionPolicy Bypass -Command "& { $$v = (Get-Content SteamIconFixer/SteamIconFixer.csproj | Select-String '<AssemblyVersion>([0-9.]+)</AssemblyVersion>').Matches[0].Groups[1].Value; $$parts = $$v.Split('.'); $$parts[0] = [int]$$parts[0] + 1; $$parts[1] = '0'; $$parts[2] = '0'; $$newVer = $$parts -join '.'; ./build.ps1 Release -Version $$newVer }"