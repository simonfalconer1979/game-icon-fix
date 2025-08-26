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
        Write-Host "Creating self-contained release build..." -ForegroundColor Yellow
        
        # Clean previous publish
        if (Test-Path $PublishPath) {
            Remove-Item -Path $PublishPath -Recurse -Force
        }
        New-Item -ItemType Directory -Path $PublishPath -Force | Out-Null
        
        # Single self-contained build (Windows Forms doesn't support trimming)
        Write-Host "Publishing self-contained executable..." -ForegroundColor Yellow
        dotnet publish $ProjectFile -c Release -r $RuntimeIdentifier `
            --self-contained true `
            -p:PublishSingleFile=true `
            -p:PublishReadyToRun=true `
            -p:IncludeNativeLibrariesForSelfExtract=true `
            -p:EnableCompressionInSingleFile=true `
            -p:DebugType=none `
            -p:DebugSymbols=false `
            -o $PublishPath --nologo --verbosity minimal
        
        if ($LASTEXITCODE -eq 0) {
            $exePath = Join-Path $PublishPath "SteamIconFixer.exe"
            if (Test-Path $exePath) {
                $sizeMB = [math]::Round((Get-Item $exePath).Length / 1MB, 2)
                Write-Host ""
                Write-Host "Build completed successfully!" -ForegroundColor Green
                Write-Host "  File: SteamIconFixer.exe" -ForegroundColor Cyan
                Write-Host "  Size: $sizeMB MB" -ForegroundColor Cyan
                Write-Host "  Type: Self-contained (no .NET runtime required)" -ForegroundColor Cyan
                Write-Host "  Path: $exePath" -ForegroundColor Blue
            }
        } else {
            Write-Host "Build failed!" -ForegroundColor Red
            exit 1
        }
    }
    
    "Release" {
        Write-Host "Creating release package..." -ForegroundColor Yellow
        
        # Clean and build
        & $PSCommandPath -Target Clean
        & $PSCommandPath -Target Build
        & $PSCommandPath -Target Publish
        
        # Create release directory
        New-Item -ItemType Directory -Path $ReleasePath -Force | Out-Null
        
        # Get version from project file
        $versionLine = Get-Content $ProjectFile | Select-String '<AssemblyVersion>([0-9.]+)</AssemblyVersion>'
        $version = if ($versionLine) { $versionLine.Matches[0].Groups[1].Value } else { "2.0.0" }
        
        # Copy and rename executable with version
        $sourceExe = Join-Path $PublishPath "SteamIconFixer.exe"
        
        if (Test-Path $sourceExe) {
            $targetName = "SteamIconFixer-v$version.exe"
            Copy-Item $sourceExe -Destination (Join-Path $ReleasePath $targetName) -Force
            $sizeMB = [math]::Round((Get-Item $sourceExe).Length / 1MB, 2)
            Write-Host "Created release: $targetName ($sizeMB MB)" -ForegroundColor Green
        } else {
            Write-Host "Error: Published executable not found!" -ForegroundColor Red
            exit 1
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