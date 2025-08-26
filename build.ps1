# Steam Icon Fixer - Build Script
# A comprehensive build system for the Steam Icon Fixer application

param(
    [Parameter(Position = 0)]
    [ValidateSet("Build", "Clean", "Run", "Test", "Publish", "Release", "All", "Help")]
    [string]$Target = "Build",
    
    [Parameter()]
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release"
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Paths
$ProjectRoot = $PSScriptRoot
$ProjectPath = Join-Path $ProjectRoot "SteamIconFixer"
$ProjectFile = Join-Path $ProjectPath "SteamIconFixer.csproj"
$SolutionFile = Join-Path $ProjectRoot "SteamIconFixer.sln"
$ReleasePath = Join-Path $ProjectRoot "Release"
$PublishPath = Join-Path $ProjectPath "publish"

# Build properties
$RuntimeIdentifier = "win-x64"
$TargetFramework = "net9.0-windows"

Write-Host ""
Write-Host "Steam Icon Fixer Build System" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

switch ($Target) {
    "Clean" {
        Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
        dotnet clean $ProjectFile --nologo --verbosity minimal
        Remove-Item -Path (Join-Path $ProjectPath "bin") -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path (Join-Path $ProjectPath "obj") -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $PublishPath -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $ReleasePath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Clean completed" -ForegroundColor Green
    }
    
    "Build" {
        Write-Host "Building project..." -ForegroundColor Yellow
        dotnet restore $ProjectFile --nologo --verbosity minimal
        dotnet build $ProjectFile -c $Configuration --nologo --verbosity minimal
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Build completed successfully" -ForegroundColor Green
        } else {
            Write-Host "Build failed" -ForegroundColor Red
            exit 1
        }
    }
    
    "Run" {
        Write-Host "Running application..." -ForegroundColor Yellow
        $exePath = Join-Path $ProjectPath "bin\$Configuration\$TargetFramework\SteamIconFixer.exe"
        if (-not (Test-Path $exePath)) {
            Write-Host "Building project first..." -ForegroundColor Yellow
            dotnet build $ProjectFile -c $Configuration --nologo --verbosity minimal
        }
        Write-Host "Starting Steam Icon Fixer..." -ForegroundColor Cyan
        & $exePath
    }
    
    "Test" {
        Write-Host "Running tests..." -ForegroundColor Yellow
        dotnet test $SolutionFile -c $Configuration --nologo --verbosity minimal
        if ($LASTEXITCODE -eq 0) {
            Write-Host "All tests passed" -ForegroundColor Green
        } else {
            Write-Host "Tests failed" -ForegroundColor Red
            exit 1
        }
    }
    
    "Publish" {
        Write-Host "Creating release builds..." -ForegroundColor Yellow
        
        # Create publish directory
        New-Item -ItemType Directory -Path $PublishPath -Force | Out-Null
        
        # Optimized build
        Write-Host "Publishing optimized build (smaller size)..." -ForegroundColor Yellow
        $optimizedPath = Join-Path $PublishPath "optimized"
        dotnet publish $ProjectFile -c Release -r $RuntimeIdentifier --self-contained -p:PublishSingleFile=true -p:PublishTrimmed=true -p:TrimMode=partial -p:PublishReadyToRun=true -p:DebugType=none -p:DebugSymbols=false -o $optimizedPath --nologo --verbosity minimal
        
        if ($LASTEXITCODE -eq 0) {
            $exePath = Join-Path $optimizedPath "SteamIconFixer.exe"
            if (Test-Path $exePath) {
                $sizeMB = [math]::Round((Get-Item $exePath).Length / 1MB, 2)
                Write-Host "Optimized build: $sizeMB MB" -ForegroundColor Green
            }
        }
        
        # Full build
        Write-Host "Publishing full build (better compatibility)..." -ForegroundColor Yellow
        $fullPath = Join-Path $PublishPath "full"
        dotnet publish $ProjectFile -c Release -r $RuntimeIdentifier --self-contained -p:PublishSingleFile=true -p:PublishTrimmed=false -p:PublishReadyToRun=true -p:DebugType=none -p:DebugSymbols=false -o $fullPath --nologo --verbosity minimal
        
        if ($LASTEXITCODE -eq 0) {
            $exePath = Join-Path $fullPath "SteamIconFixer.exe"
            if (Test-Path $exePath) {
                $sizeMB = [math]::Round((Get-Item $exePath).Length / 1MB, 2)
                Write-Host "Full build: $sizeMB MB" -ForegroundColor Green
            }
        }
        
        Write-Host "Publish completed" -ForegroundColor Green
        Write-Host "Output: $PublishPath" -ForegroundColor Blue
    }
    
    "Release" {
        Write-Host "Creating release package..." -ForegroundColor Yellow
        
        # Clean and build
        & $PSCommandPath -Target Clean
        & $PSCommandPath -Target Build
        & $PSCommandPath -Target Publish
        
        # Create release directory
        New-Item -ItemType Directory -Path $ReleasePath -Force | Out-Null
        
        # Copy files
        $optimizedExe = Join-Path $PublishPath "optimized\SteamIconFixer.exe"
        $fullExe = Join-Path $PublishPath "full\SteamIconFixer.exe"
        
        if (Test-Path $optimizedExe) {
            Copy-Item $optimizedExe -Destination (Join-Path $ReleasePath "SteamIconFixer.exe") -Force
            Write-Host "Copied optimized build" -ForegroundColor Green
        }
        
        if (Test-Path $fullExe) {
            Copy-Item $fullExe -Destination (Join-Path $ReleasePath "SteamIconFixer-full.exe") -Force
            Write-Host "Copied full build" -ForegroundColor Green
        }
        
        # Copy documentation
        $docsToInclude = @("README.md", "LICENSE")
        foreach ($doc in $docsToInclude) {
            $docPath = Join-Path $ProjectRoot $doc
            if (Test-Path $docPath) {
                Copy-Item $docPath -Destination $ReleasePath -Force
                Write-Host "Copied $doc" -ForegroundColor Green
            }
        }
        
        Write-Host "Release completed" -ForegroundColor Green
        Write-Host "Release files: $ReleasePath" -ForegroundColor Blue
    }
    
    "All" {
        & $PSCommandPath -Target Clean
        & $PSCommandPath -Target Build
        & $PSCommandPath -Target Test
        & $PSCommandPath -Target Publish
    }
    
    "Help" {
        Write-Host "Usage: .\build.ps1 [Target] [Options]"
        Write-Host ""
        Write-Host "Targets:" -ForegroundColor Cyan
        Write-Host "  Build    - Build the project (default)"
        Write-Host "  Clean    - Remove all build artifacts"
        Write-Host "  Run      - Build and run the application"
        Write-Host "  Test     - Run unit tests"
        Write-Host "  Publish  - Create optimized and full builds"
        Write-Host "  Release  - Create a complete release package"
        Write-Host "  All      - Run clean, build, test, and publish"
        Write-Host "  Help     - Show this help message"
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Cyan
        Write-Host "  -Configuration  - Build configuration (Debug/Release, default: Release)"
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Cyan
        Write-Host "  .\build.ps1"
        Write-Host "  .\build.ps1 Build"
        Write-Host "  .\build.ps1 Run -Configuration Debug"
        Write-Host "  .\build.ps1 Release"
    }
    
    default {
        & $PSCommandPath -Target Build
    }
}

Write-Host ""