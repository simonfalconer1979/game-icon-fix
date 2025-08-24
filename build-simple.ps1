# Steam Icon Fixer - Simple Build Script
param(
    [string]$Target = "Build"
)

$ErrorActionPreference = "Stop"
$ProjectPath = "$PSScriptRoot\SteamIconFixer"
$ProjectFile = "$ProjectPath\SteamIconFixer.csproj"

Write-Host ""
Write-Host "Steam Icon Fixer - Build System" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

switch ($Target) {
    "Clean" {
        Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
        dotnet clean $ProjectFile --nologo
        Remove-Item -Path "$ProjectPath\bin" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$ProjectPath\obj" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$ProjectPath\publish*" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "$PSScriptRoot\Release" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Clean completed" -ForegroundColor Green
    }
    
    "Build" {
        Write-Host "Building project..." -ForegroundColor Yellow
        dotnet build $ProjectFile -c Release --nologo
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Build completed successfully" -ForegroundColor Green
        }
    }
    
    "Publish" {
        Write-Host "Creating release builds..." -ForegroundColor Yellow
        
        # Create Release directory
        $ReleasePath = "$PSScriptRoot\Release"
        New-Item -ItemType Directory -Path $ReleasePath -Force | Out-Null
        
        # Optimized build
        Write-Host "Publishing optimized build..." -ForegroundColor Yellow
        dotnet publish $ProjectFile -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:PublishTrimmed=true -p:TrimMode=partial -p:PublishReadyToRun=true -p:DebugType=none -o "$ProjectPath\publish-optimized" --nologo
        
        if ($LASTEXITCODE -eq 0) {
            Copy-Item "$ProjectPath\publish-optimized\SteamIconFixer.exe" -Destination "$ReleasePath\SteamIconFixer.exe" -Force
            $size = [math]::Round((Get-Item "$ReleasePath\SteamIconFixer.exe").Length / 1MB, 2)
            Write-Host "Optimized build: $size MB" -ForegroundColor Green
        }
        
        # Full build
        Write-Host "Publishing full build..." -ForegroundColor Yellow
        dotnet publish $ProjectFile -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:PublishTrimmed=false -p:PublishReadyToRun=true -p:DebugType=none -o "$ProjectPath\publish-full" --nologo
        
        if ($LASTEXITCODE -eq 0) {
            Copy-Item "$ProjectPath\publish-full\SteamIconFixer.exe" -Destination "$ReleasePath\SteamIconFixer-full.exe" -Force
            $size = [math]::Round((Get-Item "$ReleasePath\SteamIconFixer-full.exe").Length / 1MB, 2)
            Write-Host "Full build: $size MB" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "Release files created in: $ReleasePath" -ForegroundColor Green
    }
    
    "All" {
        & $PSCommandPath -Target Clean
        & $PSCommandPath -Target Build
        & $PSCommandPath -Target Publish
    }
    
    default {
        Write-Host "Usage: .\build-simple.ps1 [Clean|Build|Publish|All]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Targets:" -ForegroundColor Cyan
        Write-Host "  Clean    - Remove build artifacts"
        Write-Host "  Build    - Build the project"
        Write-Host "  Publish  - Create release executables"
        Write-Host "  All      - Run complete pipeline"
    }
}

Write-Host ""