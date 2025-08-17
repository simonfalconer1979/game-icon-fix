# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Steam Icon Fixer v1.0 - A Deno-based tool that fixes blank icons of Steam desktop shortcuts in Windows. Features an interactive retro ASCII-style UI with automatic Steam detection and multi-library support. Also includes a web-based UI with fixed 160×64 SVGA-style grid.

## Key Commands

### Development
```bash
# Run interactive ASCII UI mode (main application)
deno run -N -R -W --allow-run mod.ts

# Lint code
deno lint

# Format code  
deno fmt

# Type check
deno check mod.ts

# Run web server for browser UI
deno run -A https://deno.land/std@0.224.0/http/file_server.ts ./web --port 5173 --cors

# Quick launch with batch file (Windows)
steam-icon-fixer.bat
```

### Required Permissions
- `-N` (Network): Download icons from Steam CDN
- `-R` (Read): Read Steam folders and shortcuts
- `-W` (Write): Save icons to Steam directory
- `--allow-run`: Execute reg.exe for Registry access

## Architecture

### Project Structure
```
game-icon-fix/
├── mod.ts                 # Main entry point - launches interactive ASCII UI
├── ui.ts                  # Terminal UI utilities (colors, cursor, boxes, centering)
├── ui_manager.ts          # Centralized cursor and display management singleton
├── menu.ts                # Menu system with keyboard navigation
├── browser.ts             # Interactive file/directory browser with multi-select
├── processor.ts           # Icon downloading and processing logic
├── steam_detector.ts      # Steam detection with VDF parsing & multi-library
├── shortcut_manager.ts    # Steam shortcut creation and management
├── settings.ts            # User preferences and display settings singleton
├── console_utils.ts       # Console compatibility and ASCII fallback support
├── image_converter.ts     # Image format conversion utilities
├── fixed_console.ts       # Fixed console setup for consistent display
├── steam-icon-fixer.bat   # Windows batch launcher
└── web/                   # Web-based UI (GitHub Pages deployable)
    ├── index.html         # Main HTML with 160×64 grid canvas
    ├── styles.css         # VT323 font and retro styling
    ├── ui.js              # Text buffer and rendering system
    ├── menu.js            # Menu navigation logic
    └── main.js            # Application entry point

```

### Core Module Responsibilities

#### UI System (`ui.ts`, `ui_manager.ts`)
- **Turbo Pascal Theme**: Cyan/blue color scheme with box drawing characters
- **Centering Helpers**: `getCenteredPosition()`, `drawCenteredBoxWithShadow()`, `showCenteredStatus()`
- **UIManager Singleton**: Manages cursor state, animations, and consistent UI operations
- **Console Abstraction**: Handles both Unicode and ASCII fallback modes

#### Steam Detection (`steam_detector.ts`)
- **VdfParser Class**: Parses Steam's Valve Data Format configuration files
- **SteamDetector Class**: Multi-method Steam installation detection
- **SteamIconResolver Class**: Resolves and downloads icons from multiple CDN endpoints
- **Library Discovery**: Finds all Steam libraries across multiple drives via `libraryfolders.vdf`

#### Processing Pipeline (`processor.ts`)
- **IconProcessor Class**: Manages batch icon downloading and caching
- **CDN Fallback Chain**: Tries Cloudflare → Akamai → Direct Steam endpoints
- **Smart Caching**: Skips already-fixed icons to avoid redundant downloads
- **Error Aggregation**: Collects and reports all failures at the end

#### Interactive Components (`menu.ts`, `browser.ts`)
- **Menu System**: Arrow key navigation, Enter to select, ESC to go back
- **PathBrowser Class**: File/directory selection with checkbox multi-select
- **Keyboard Handling**: Raw mode input processing with proper cleanup

### Key Design Patterns

1. **Singleton Pattern**: `UIManager`, `SettingsManager`, `ConsoleConfig` for global state
2. **Factory Pattern**: Steam detection methods with fallback chain
3. **Strategy Pattern**: Multiple CDN endpoints with automatic failover
4. **Observer Pattern**: Real-time UI updates during processing
5. **Builder Pattern**: Menu and dialog construction with fluent interfaces

### Steam Integration Details

#### Detection Priority
1. Parse `[steam]/config/libraryfolders.vdf` for all library locations
2. Query Windows Registry (`HKCU\Software\Valve\Steam`, `HKLM\Software\Valve\Steam`)
3. Check common installation paths (`C:/Program Files (x86)/Steam`, etc.)
4. Scan all drive letters for `/Steam` or `/SteamLibrary` folders

#### Icon Resolution
1. Extract App ID from shortcut URL (`steam://rungameid/[APPID]`)
2. Try multiple icon filenames: `[appid]_icon.ico`, `icon.ico`, `header.jpg`
3. Check multiple local paths before downloading
4. Download from CDN with automatic format conversion if needed

#### VDF Parsing
- Handles nested structures and quoted values
- Supports both Windows and Unix line endings
- Gracefully handles malformed files with partial data recovery

### Web UI Architecture

#### Fixed Grid System (160×64)
- Character-based rendering like DOS text mode
- VT323 monospace font for authentic retro look
- Double buffering to prevent flicker
- Shadow effects using half-block characters

#### Browser Compatibility
- Pure JavaScript (no build step required)
- Works in all modern browsers
- Responsive scaling while maintaining aspect ratio
- Keyboard and mouse input support

### Error Handling Strategy

1. **User-Friendly Messages**: Technical errors wrapped in helpful explanations
2. **Graceful Degradation**: ASCII fallback for terminals without Unicode
3. **Recovery Options**: Prompts user for manual input when auto-detection fails
4. **Batch Resilience**: Continue processing even if individual items fail

### Performance Considerations

- **Parallel Downloads**: Process multiple icons concurrently
- **Connection Pooling**: Reuse HTTP connections for CDN requests
- **Lazy Loading**: Only load VDF files when needed
- **Progress Throttling**: Update UI at reasonable intervals to avoid flicker

## Development Workflow

### Adding New Features
1. Check existing patterns in similar modules
2. Use TypeScript with JSDoc comments for public APIs
3. Follow Turbo Pascal UI conventions for consistency
4. Add error handling with user-friendly messages
5. Update `showTopMenu()` in `menu.ts` if adding menu items

### Testing Changes
1. Run `deno lint` to check code style
2. Run `deno fmt` to format code
3. Run `deno check mod.ts` for type checking
4. Test both Unicode and ASCII modes (`STEAM_FIXER_ASCII=1`)
5. Verify on different terminal emulators (cmd, PowerShell, Windows Terminal)

### Web UI Development
1. Edit files directly in `web/` directory
2. No build step - refresh browser to see changes
3. Test grid alignment at different zoom levels
4. Verify keyboard navigation works properly

## Important Implementation Notes

- **Always use absolute paths** in file operations (use `join()` from `@std/path`)
- **Check file existence** before operations to provide helpful error messages
- **Handle Windows path separators** - normalize with forward slashes internally
- **Preserve cursor state** - use `UIManager` for consistent show/hide behavior
- **Clean up on exit** - restore terminal settings and show cursor
- **Support ASCII mode** - check `ConsoleConfig` for character set to use
- **Batch operations** - process arrays of files/directories efficiently
- **Registry access** - use `--allow-run` permission for `reg.exe` commands