# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Steam Icon Fixer v2.0 - A Windows Forms application that fixes blank Steam desktop shortcut icons with a retro SVGA-style console interface. Written in C#/.NET 9, it detects Steam installations, scans libraries, downloads missing icons from Steam CDN, and refreshes Windows icon cache. The interface uses SVGA graphics mode (100x37 text mode) with extended 256-color palette support.

## Commands

### Build Commands
```bash
# PowerShell build script (recommended)
.\build.ps1 Build              # Build project
.\build.ps1 Clean              # Remove all build artifacts
.\build.ps1 Run                # Build and run application
.\build.ps1 Test               # Run unit tests  
.\build.ps1 Publish            # Create optimized and full builds
.\build.ps1 Release            # Create complete release package
.\build.ps1 Help               # Show all options

# Batch wrapper (calls PowerShell script)
build.bat [Target]

# Direct dotnet CLI
dotnet restore
dotnet build -c Release
dotnet run --project SteamIconFixer\SteamIconFixer.csproj

# Create self-contained executables
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:PublishTrimmed=true -o ./publish    # ~26MB optimized
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:PublishTrimmed=false -o ./publish   # ~69MB full
```

## Architecture

### Project Structure
```
SteamIconFixer/
├── Core/                      # Business logic layer
│   ├── SteamDetector.cs      # Steam installation/library detection via Registry
│   └── IconProcessor.cs      # Icon downloading from CDN, shortcut processing
├── UI/                        # Console UI layer  
│   ├── SVGAConsole.cs        # SVGA text mode emulator (100x37)
│   ├── SVGAFormConsole.cs    # Windows Forms-based SVGA console
│   ├── ConsoleForm.cs        # Windows Forms implementation
│   ├── LibraryViewer.cs      # Full-screen library browser
│   └── Menu.cs               # Interactive menu system
├── Application.cs            # Main controller orchestrating UI/Core
└── Program.cs               # Entry point
```

### Key Design Patterns
- **Separation of Concerns**: Clear Core/UI/Application layers
- **Dependency Injection**: Services passed via constructors  
- **Double Buffering**: Flicker-free console rendering
- **Async/Await**: Non-blocking UI operations

### Console UI Implementation
The application uses a custom SVGA console emulator with:
- 100x37 character grid (SVGA 800x600 with 8x16 font)
- Extended 256-color palette (web-safe colors + legacy CGA compatibility)
- Box-drawing characters for UI borders
- ANSI color support via Pastel library
- Windows Forms backend for reliable rendering (SVGAFormConsole)
- Keyboard navigation with arrow keys, Enter, ESC
- Enhanced library viewer with up to 25 visible items

## Dependencies

NuGet packages (defined in SteamIconFixer.csproj):
- `Microsoft.Win32.Registry` (5.0.0) - Windows Registry access
- `Pastel` (5.0.0) - ANSI color console output
- `System.Management` (9.0.0) - System information queries

## Configuration

- **Target Framework**: net9.0-windows
- **Output Type**: WinExe (Windows executable)
- **Platform**: Windows-only (uses Windows Forms, Registry, shortcuts)
- **Assembly Version**: 2.0.0.0
- **Icon**: steamfix.ico

Shared build properties in Directory.Build.props:
- Nullable reference types enabled
- Implicit usings enabled  
- Warning level 5 with all analyzers
- Deterministic builds

## Steam Integration

The application interacts with Steam by:
1. Reading Windows Registry keys to find Steam installation path
2. Parsing `libraryfolders.vdf` to discover all game libraries
3. Scanning Desktop and Start Menu for `.url` shortcut files
4. Downloading icons from Steam CDN (Akamai/Cloudflare)
5. Refreshing Windows icon cache via shell commands

## Development Notes

- Application requires Windows 10/11 with .NET 9 runtime
- Run as Administrator recommended for icon cache refresh
- Console window must be at least 80x25 characters
- All file paths use absolute paths internally
- Error handling continues on partial failures for robustness