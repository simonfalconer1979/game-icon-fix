# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Steam Blank Icon Fixer - A Deno-based tool that fixes blank icons of Steam desktop shortcuts in Windows. Features both CLI and interactive retro ASCII-style UI modes.

## Key Commands

### Development
```bash
# Run in interactive UI mode (default)
deno run -N -R -W --allow-run mod.ts

# Run in CLI mode with arguments
deno run -N -R -W --allow-run mod.ts [paths...]

# Lint code
deno lint

# Format code
deno fmt

# Type check
deno check mod.ts mod_ui.ts
```

### Required Permissions
- `-N` (Network): Download icons from Steam CDN
- `-R` (Read): Read Steam folders and shortcuts
- `-W` (Write): Save icons to Steam directory
- `--allow-run`: Execute reg.exe for Registry access

## Architecture

### Entry Points
- **mod.ts**: Main CLI module - handles command-line arguments and non-interactive processing
- **mod_ui.ts**: UI module - launches interactive menu when no CLI args provided

### Module Structure
- **ui.ts**: Core terminal UI utilities (colors, cursor control, box drawing)
- **menu.ts**: Menu system implementation
- **browser.ts**: Interactive file/directory browser with multi-select
- **processor.ts**: Icon downloading and processing logic
- **steam_detector.ts**: Enhanced Steam detection with VDF parsing and multi-library support
- **gui.ts**: GUI launcher using webview (experimental)

### Key Design Patterns
1. **Dual Mode Operation**: Automatically switches between CLI and UI modes based on arguments
2. **Enhanced Steam Detection**: 
   - Parses `libraryfolders.vdf` to find ALL Steam libraries across multiple drives
   - Reads app manifests (`appmanifest_*.acf`) to verify installed games
   - Falls back to Registry and common paths if config files unavailable
3. **Smart Icon Resolution**: 
   - Checks multiple CDN endpoints (Cloudflare, Akamai, Direct Steam)
   - Tries multiple icon locations (main Steam, library-specific, game directories)
   - Validates icon existence before downloading
4. **Batch Processing**: Handles multiple files/directories in single operation
5. **Error Recovery**: Graceful fallbacks with user-friendly error messages

### Steam Integration
- **Detection Methods**:
  - Primary: Parse `[steam]/config/libraryfolders.vdf` for all library locations
  - Registry: `HKCU\Software\Valve\Steam`, `HKLM\Software\Valve\Steam`
  - Common paths: `C:/Program Files (x86)/Steam`, drive letters with `/Steam` or `/SteamLibrary`
- **VDF Parser**: Custom parser for Steam's Valve Data Format configuration files
- **Game Discovery**: Scans `steamapps/appmanifest_*.acf` files for installed games
- **Icon Storage**: Primary `[steam_path]/steam/games/`, fallback to library-specific paths
- **CDN Sources**: Multiple endpoints for reliability:
  - `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/`
  - `http://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/`
  - `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/`

### UI Components
- ASCII art banner and box drawing
- Keyboard navigation with arrow keys, Enter, ESC
- Color-coded feedback (success/error/warning)
- Progress bars and loading animations
- Multi-select with checkboxes