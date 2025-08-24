# Steam Icon Fixer - Comprehensive Build Script
# Handles complete build, test, and release lifecycle

param(
    [Parameter(Position=0)]
    [ValidateSet('Build', 'Clean', 'Restore', 'Test', 'Publish', 'Release', 'All', 'Help')]
    [string]$Action = 'Build',
    
    [Parameter()]
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Release',
    
    [Parameter()]
    [string]$Version = '',
    
    [Parameter()]
    [switch]$NoBanner,
    
    [Parameter()]
    [switch]$Verbose
)

# Script configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

# Project paths
$RootPath = $PSScriptRoot
$ProjectPath = Join-Path $RootPath "SteamIconFixer"
$ProjectFile = Join-Path $ProjectPath "SteamIconFixer.csproj"
$PublishPath = Join-Path $ProjectPath "publish"
$PublishOptimizedPath = Join-Path $ProjectPath "publish-optimized"
$ReleasePath = Join-Path $RootPath "Release"
$ArtifactsPath = Join-Path $RootPath "artifacts"

# Build configuration
$Runtime = "win-x64"
$Framework = "net9.0-windows"

# Colors for output
function Write-Header {
    param([string]$Message)
    if (-not $NoBanner) {
        Write-Host "`n$("="*60)" -ForegroundColor Cyan
        Write-Host $Message -ForegroundColor White
        Write-Host "$("="*60)" -ForegroundColor Cyan
    }
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n► $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Gray
}

# Show banner
function Show-Banner {
    if (-not $NoBanner) {
        Clear-Host
        Write-Host @"

╔═══════════════════════════════════════════════╗
║  ███████╗████████╗███████╗ █████╗ ███╗   ███╗ ║
║  ██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║ ║
║  ███████╗   ██║   █████╗  ███████║██╔████╔██║ ║
║  ╚════██║   ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║ ║
║  ███████║   ██║   ███████╗██║  ██║██║ ╚═╝ ██║ ║
║  ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ║
║        ICON FIXER - BUILD SYSTEM               ║
╚═══════════════════════════════════════════════╝

"@ -ForegroundColor Cyan
    }
}

# Check prerequisites
function Test-Prerequisites {
    Write-Step "Checking prerequisites"
    
    # Check for .NET SDK
    try {
        $dotnetVersion = dotnet --version
        Write-Success ".NET SDK found: $dotnetVersion"
    }
    catch {
        Write-Error ".NET SDK not found! Please install from: https://dotnet.microsoft.com/download"
        exit 1
    }
    
    # Check for Git (optional)
    try {
        $gitVersion = git --version
        Write-Success "Git found: $gitVersion"
        $script:GitAvailable = $true
    }
    catch {
        Write-Info "Git not found (optional)"
        $script:GitAvailable = $false
    }
    
    # Check project file exists
    if (-not (Test-Path $ProjectFile)) {
        Write-Error "Project file not found: $ProjectFile"
        exit 1
    }
    Write-Success "Project file found"
}

# Clean build artifacts
function Invoke-Clean {
    Write-Header "CLEAN BUILD ARTIFACTS"
    
    Write-Step "Cleaning build directories..."
    
    $dirsToClean = @(
        (Join-Path $ProjectPath "bin"),
        (Join-Path $ProjectPath "obj"),
        $PublishPath,
        $PublishOptimizedPath,
        $ReleasePath,
        $ArtifactsPath
    )
    
    foreach ($dir in $dirsToClean) {
        if (Test-Path $dir) {
            Remove-Item -Path $dir -Recurse -Force
            Write-Info "Removed: $dir"
        }
    }
    
    Write-Success "Clean completed"
}

# Restore NuGet packages
function Invoke-Restore {
    Write-Header "RESTORE NUGET PACKAGES"
    
    Write-Step "Restoring packages..."
    $output = dotnet restore $ProjectFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Packages restored successfully"
        if ($Verbose) {
            Write-Info $output
        }
    }
    else {
        Write-Error "Package restore failed"
        Write-Host $output
        exit 1
    }
}

# Build the project
function Invoke-Build {
    Write-Header "BUILD PROJECT"
    
    Write-Step "Building $Configuration configuration..."
    
    $buildArgs = @(
        "build",
        $ProjectFile,
        "-c", $Configuration,
        "--nologo"
    )
    
    if ($Version) {
        $buildArgs += "-p:Version=$Version"
        $buildArgs += "-p:AssemblyVersion=$Version"
        $buildArgs += "-p:FileVersion=$Version"
    }
    
    $output = & dotnet $buildArgs 2>&1
    $buildSuccess = $LASTEXITCODE -eq 0
    
    # Parse output for warnings and errors
    $warnings = ($output | Select-String -Pattern "warning" -AllMatches).Count
    $errors = ($output | Select-String -Pattern "error" -AllMatches).Count
    
    if ($buildSuccess) {
        Write-Success "Build completed successfully"
        Write-Info "Warnings: $warnings | Errors: $errors"
        
        if ($Verbose -or $warnings -gt 0) {
            Write-Info "Build output:"
            $output | ForEach-Object { Write-Info $_ }
        }
    }
    else {
        Write-Error "Build failed with $errors errors"
        $output | ForEach-Object { Write-Host $_ }
        exit 1
    }
}

# Run tests (if any exist)
function Invoke-Test {
    Write-Header "RUN TESTS"
    
    Write-Step "Looking for test projects..."
    
    $testProjects = Get-ChildItem -Path $RootPath -Filter "*.Tests.csproj" -Recurse
    
    if ($testProjects.Count -eq 0) {
        Write-Info "No test projects found"
        return
    }
    
    foreach ($testProject in $testProjects) {
        Write-Step "Running tests in $($testProject.Name)..."
        
        $output = dotnet test $testProject.FullName -c $Configuration --nologo --no-build 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Tests passed"
        }
        else {
            Write-Error "Tests failed"
            $output | ForEach-Object { Write-Host $_ }
            exit 1
        }
    }
}

# Publish the application
function Invoke-Publish {
    Write-Header "PUBLISH APPLICATION"
    
    # Create release directory
    if (-not (Test-Path $ReleasePath)) {
        New-Item -ItemType Directory -Path $ReleasePath -Force | Out-Null
    }
    
    # Publish optimized version
    Write-Step "Publishing optimized build (trimmed)..."
    
    $publishArgs = @(
        "publish",
        $ProjectFile,
        "-c", $Configuration,
        "-r", $Runtime,
        "--self-contained",
        "-p:PublishSingleFile=true",
        "-p:PublishTrimmed=true",
        "-p:TrimMode=partial",
        "-p:PublishReadyToRun=true",
        "-p:DebugType=none",
        "-p:DebugSymbols=false",
        "-o", $PublishOptimizedPath,
        "--nologo"
    )
    
    if ($Version) {
        $publishArgs += "-p:Version=$Version"
    }
    
    $output = & dotnet $publishArgs 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $exePath = Join-Path $PublishOptimizedPath "SteamIconFixer.exe"
        if (Test-Path $exePath) {
            $fileInfo = Get-Item $exePath
            $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
            Write-Success "Optimized build published: $sizeMB MB"
            
            # Copy to release folder
            Copy-Item $exePath -Destination (Join-Path $ReleasePath "SteamIconFixer.exe") -Force
        }
    }
    else {
        Write-Error "Optimized publish failed"
        $output | ForEach-Object { Write-Host $_ }
        exit 1
    }
    
    # Publish full version
    Write-Step "Publishing full build (untrimmed)..."
    
    $publishArgs = @(
        "publish",
        $ProjectFile,
        "-c", $Configuration,
        "-r", $Runtime,
        "--self-contained",
        "-p:PublishSingleFile=true",
        "-p:PublishTrimmed=false",
        "-p:PublishReadyToRun=true",
        "-p:DebugType=none",
        "-p:DebugSymbols=false",
        "-o", $PublishPath,
        "--nologo"
    )
    
    if ($Version) {
        $publishArgs += "-p:Version=$Version"
    }
    
    $output = & dotnet $publishArgs 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $exePath = Join-Path $PublishPath "SteamIconFixer.exe"
        if (Test-Path $exePath) {
            $fileInfo = Get-Item $exePath
            $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
            Write-Success "Full build published: $sizeMB MB"
            
            # Copy to release folder
            Copy-Item $exePath -Destination (Join-Path $ReleasePath "SteamIconFixer-full.exe") -Force
        }
    }
    else {
        Write-Error "Full publish failed"
        $output | ForEach-Object { Write-Host $_ }
        exit 1
    }
    
    Write-Success "Both versions published to: $ReleasePath"
}

# Create release artifacts
function Invoke-Release {
    Write-Header "CREATE RELEASE ARTIFACTS"
    
    if (-not (Test-Path $ReleasePath)) {
        Write-Error "No release files found. Run 'Publish' first."
        exit 1
    }
    
    # Create artifacts directory
    if (-not (Test-Path $ArtifactsPath)) {
        New-Item -ItemType Directory -Path $ArtifactsPath -Force | Out-Null
    }
    
    # Determine version
    if (-not $Version) {
        if ($GitAvailable) {
            $Version = git describe --tags --abbrev=0 2>$null
            if (-not $Version) {
                $Version = "v2.0.0"
            }
        }
        else {
            $Version = "v2.0.0"
        }
    }
    
    $releaseName = "SteamIconFixer-$Version"
    
    # Create ZIP archive
    Write-Step "Creating ZIP archive..."
    
    $zipPath = Join-Path $ArtifactsPath "$releaseName.zip"
    
    # Create temporary directory for release files
    $tempDir = Join-Path $env:TEMP $releaseName
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    # Copy files to temp directory
    Copy-Item (Join-Path $ReleasePath "SteamIconFixer.exe") -Destination $tempDir
    Copy-Item (Join-Path $ReleasePath "SteamIconFixer-full.exe") -Destination $tempDir
    Copy-Item (Join-Path $RootPath "README.md") -Destination $tempDir
    Copy-Item (Join-Path $RootPath "LICENSE") -Destination $tempDir
    
    # Create version info file
    $versionInfo = @"
Steam Icon Fixer $Version
========================
Release Date: $(Get-Date -Format "yyyy-MM-dd")
Build Configuration: $Configuration
Target Framework: $Framework
Runtime: $Runtime

Files:
  SteamIconFixer.exe       : Optimized build (smaller size, ~26MB)
  SteamIconFixer-full.exe  : Full build (maximum compatibility, ~69MB)
  README.md                : Documentation
  LICENSE                  : MIT License

For issues and updates, visit:
https://github.com/simonfalconer1979/game-icon-fix
"@
    $versionInfo | Out-File -FilePath (Join-Path $tempDir "VERSION.txt") -Encoding UTF8
    
    # Compress files
    Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
    
    # Clean up temp directory
    Remove-Item $tempDir -Recurse -Force
    
    $zipInfo = Get-Item $zipPath
    $sizeMB = [math]::Round($zipInfo.Length / 1MB, 2)
    Write-Success "Release archive created: $($zipInfo.Name) ($sizeMB MB)"
    
    # Create checksums
    Write-Step "Generating checksums..."
    
    $checksumPath = Join-Path $ArtifactsPath "$releaseName-checksums.txt"
    
    @"
SHA256 Checksums for $releaseName
=====================================
"@ | Out-File -FilePath $checksumPath -Encoding UTF8
    
    Get-ChildItem $ReleasePath -Filter "*.exe" | ForEach-Object {
        $hash = Get-FileHash $_.FullName -Algorithm SHA256
        "$($hash.Hash)  $($_.Name)" | Out-File -FilePath $checksumPath -Append -Encoding UTF8
    }
    
    $hash = Get-FileHash $zipPath -Algorithm SHA256
    "$($hash.Hash)  $($zipInfo.Name)" | Out-File -FilePath $checksumPath -Append -Encoding UTF8
    
    Write-Success "Checksums generated: $checksumPath"
    
    # Show summary
    Write-Header "RELEASE SUMMARY"
    Write-Info "Version: $Version"
    Write-Info "Artifacts directory: $ArtifactsPath"
    Write-Info ""
    Write-Info "Release files:"
    Get-ChildItem $ArtifactsPath | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Info "  - $($_.Name) ($sizeMB MB)"
    }
    
    if ($GitAvailable) {
        Write-Info ""
        Write-Info "To create GitHub release:"
        Write-Info "  1. git tag -a $Version -m 'Release $Version'"
        Write-Info "  2. git push origin $Version"
        Write-Info "  3. Upload files from: $ArtifactsPath"
    }
}

# Show help
function Show-Help {
    Write-Host @"

Steam Icon Fixer - Build Script
================================

USAGE:
    .\build.ps1 [Action] [-Configuration <Config>] [-Version <Version>] [-NoBanner] [-Verbose]

ACTIONS:
    Build      - Build the project (default)
    Clean      - Clean all build artifacts
    Restore    - Restore NuGet packages
    Test       - Run unit tests
    Publish    - Create release executables
    Release    - Create release artifacts (ZIP, checksums)
    All        - Run complete build pipeline
    Help       - Show this help message

PARAMETERS:
    -Configuration  Debug|Release  Build configuration (default: Release)
    -Version        string         Version number (e.g., "2.0.1")
    -NoBanner                      Hide the banner
    -Verbose                       Show detailed output

EXAMPLES:
    .\build.ps1                    # Build project in Release mode
    .\build.ps1 All                # Run complete pipeline
    .\build.ps1 Clean              # Clean build artifacts
    .\build.ps1 Publish            # Create release executables
    .\build.ps1 Release -Version 2.0.1  # Create v2.0.1 release

WORKFLOW:
    1. Clean      - Remove old artifacts
    2. Restore    - Restore packages
    3. Build      - Compile project
    4. Test       - Run tests
    5. Publish    - Create executables
    6. Release    - Package for distribution

"@ -ForegroundColor Cyan
}

# Main execution
function Main {
    Show-Banner
    
    switch ($Action) {
        'Help' {
            Show-Help
        }
        'Clean' {
            Test-Prerequisites
            Invoke-Clean
        }
        'Restore' {
            Test-Prerequisites
            Invoke-Restore
        }
        'Build' {
            Test-Prerequisites
            Invoke-Restore
            Invoke-Build
        }
        'Test' {
            Test-Prerequisites
            Invoke-Restore
            Invoke-Build
            Invoke-Test
        }
        'Publish' {
            Test-Prerequisites
            Invoke-Restore
            Invoke-Build
            Invoke-Test
            Invoke-Publish
        }
        'Release' {
            Test-Prerequisites
            Invoke-Restore
            Invoke-Build
            Invoke-Test
            Invoke-Publish
            Invoke-Release
        }
        'All' {
            Test-Prerequisites
            Invoke-Clean
            Invoke-Restore
            Invoke-Build
            Invoke-Test
            Invoke-Publish
            Invoke-Release
        }
    }
    
    Write-Host "`n✨ Done!`n" -ForegroundColor Green
}

# Run main function
Main