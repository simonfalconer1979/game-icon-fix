# 🎮 Game Icon Fixer

[![Deno](https://img.shields.io/badge/deno-2.x-blue?logo=deno)](https://deno.land)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-orange)](https://github.com/simonfalconer1979/game-icon-fix)
[![Platform](https://img.shields.io/badge/platform-Windows-blue)](https://www.microsoft.com/windows)

Fix blank desktop shortcut icons for your PC games with an interactive retro ASCII interface. Currently supports Steam games with automatic detection, multi-library support, and beautiful terminal-based navigation.

## 🆕 Recent Updates

- **SVGA Centering**: All dialogs and menus align to the 160×64 SVGA grid with true centering.
- **Centered Helpers**: Added `getCenteredPosition()`, `drawCenteredBoxWithShadow()`, `showCenteredStatus()`, and `showStatusInBox()` in `ui.ts`.
- **Centered Menus**: Main and Settings menus compute centered x,y based on content size.
- **Centered Browser**: `PathBrowser` UI elements (title, path box, list, help, stats, scrollbar) render relative to a centered base.
- **Turbo Pascal Padding**: Consistent inner padding and section spacing for authentic 1990s styling.

## ✨ Features

### Current Support (v1.0)
- **🎮 Steam Games** - Full support for Steam desktop shortcuts
- **🔍 Auto-Detection** - Automatically finds Steam installation and all libraries
- **📚 Multi-Library Support** - Detects games across all Steam library folders
- **🎨 Interactive UI** - Retro ASCII terminal interface with menu navigation
- **⚡ Batch Processing** - Fix multiple shortcuts at once
- **🔄 Smart Caching** - Skips already-fixed icons to save time
- **🌐 CDN Fallbacks** - Multiple download sources for reliability

## 📦 Installation

### Prerequisites
- Windows 10/11
- Active internet connection
- One of the following:
  - [Deno](https://deno.land) runtime (for running from source)
  - Or just download the batch file (includes Deno)

### Option 1: Download Batch File (Easiest)
1. Download [`game-icon-fixer.bat`](https://github.com/simonfalconer1979/game-icon-fix/releases/latest)
2. Save it anywhere on your computer
3. Double-click to run
4. Navigate through the interactive ASCII menu

### Option 2: Install Deno & Run
```bash
# Install Deno (if not already installed)
# Windows (PowerShell):
irm https://deno.land/install.ps1 | iex

# Run the app directly
deno run -N -R -W --allow-run https://raw.githubusercontent.com/simonfalconer1979/game-icon-fix/main/mod.ts
```

### Option 3: Clone & Run Locally
```bash
# Clone the repository
git clone https://github.com/simonfalconer1979/game-icon-fix.git
cd game-icon-fix

# Run the app
deno run -N -R -W --allow-run mod.ts
```

## 🚀 Quick Start

Once installed, launch the app and you'll see the main menu:

1. **Fix Icons in Current Directory** - Process shortcuts in your current folder
2. **Fix Icons on Desktop** - Automatically fix all desktop shortcuts
3. **Browse for Directory** - Navigate to any folder with shortcuts
4. **Select Specific Files** - Choose individual shortcuts to fix
5. **Replace ALL Desktop Shortcuts** - Recreate all Steam shortcuts with correct icons

## 📸 Screenshots

### Main Menu
```
╭──────────────────────────────╮
│     GAME ICON FIXER v1.0     │
│                              │
│        MAIN MENU             │
│ ──────────────────────────── │
│  ▶ Fix Icons in Current Dir │
│    Fix Icons on Desktop     │
│    Browse for Directory...  │
│    Select Specific Files... │
│    Replace ALL Shortcuts    │
│    Settings & Options        │
│    Exit                      │
╰──────────────────────────────╯
```

### Processing Icons
```
Processing: Portal 2.url
✓ Downloaded icon for Portal 2
✓ Fixed icon for Portal 2.url

Summary:
✓ Successfully fixed: 5 icons
✗ Failed: 0 icons
⚠ Skipped: 2 icons (already had icons)
```

### File Browser
```
╭──────────────────────────────╮
│       SELECT FILES           │
│ ──────────────────────────── │
│  [✓] Portal 2.url            │
│  [✓] Half-Life Alyx.url      │
│  [ ] Cyberpunk 2077.url      │
│  [✓] Counter-Strike 2.url    │
│                              │
│ Space: Toggle | Enter: Done  │
╰──────────────────────────────╯
```

## 🎮 How It Works

### Steam Games
1. **Detects Steam** - Finds Steam installation via registry, config files, or common paths
2. **Scans Libraries** - Reads `libraryfolders.vdf` to find all game libraries
3. **Processes Shortcuts** - Identifies Steam shortcuts (.url files) with `steam://rungameid/`
4. **Downloads Icons** - Fetches missing icons from Steam CDN
5. **Saves Icons** - Places icons in Steam's games folder

## 🖥️ Interactive Menu

```
     GAME ICON FIXER
     
     MAIN MENU
 ────────────────────────
  ▶ Fix Icons in Current Directory
    Fix Icons on Desktop
    Browse for Directory...
    Select Specific Files...
    Replace ALL Desktop Shortcuts
    Settings & Options
    Exit
```

### Keyboard Controls
- `↑` `↓` - Navigate menu
- `Enter` - Select option
- `Space` - Toggle selection
- `ESC` - Go back

## 🎨 Interactive Features

- **Menu Navigation** - Use arrow keys to navigate through options
- **File Browser** - Browse and select directories or specific files
- **Batch Processing** - Process multiple shortcuts at once
- **Settings Menu** - Configure display and performance options
- **Real-time Feedback** - Visual progress indicators and status updates


## 🚀 Roadmap

### Version 2.0 (Coming Soon)
- **🎮 Xbox Game Pass Support** - Fix icons for Xbox games installed via Xbox app
- **🎯 Epic Games Support** - Support for Epic Games Store shortcuts
- **🎲 GOG Galaxy Support** - Fix GOG game shortcuts
- **🔧 Auto-Update** - Built-in update checker and installer
- **🌍 Multi-Language** - Support for multiple languages

### Future Features
- **📱 Game Streaming Services** - GeForce NOW, Xbox Cloud Gaming
- **🎮 Other Launchers** - Battle.net, Origin, Ubisoft Connect
- **🖼️ Custom Icons** - Allow users to set custom icons
- **📊 Statistics** - Track fixed icons and processing time
- **🔄 Scheduled Fixes** - Auto-fix on schedule or startup

## 🛡️ Permissions

| Permission | Purpose |
|------------|---------|
| `-N` | Download icons from Steam CDN |
| `-R` | Read Steam folders and shortcuts |
| `-W` | Save icon files |
| `--allow-run` | Access Windows Registry |

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Icons Still Blank After Fixing?
Windows caches icons aggressively. Try these steps in order:
1. **Quick refresh**: Press `F5` on desktop or in folder
2. **Restart Explorer**: 
   ```powershell
   taskkill /f /im explorer.exe && start explorer.exe
   ```
3. **Clear icon cache**:
   ```powershell
   # Run as Administrator
   ie4uinit.exe -show
   del /a /q "%localappdata%\IconCache.db"
   del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\iconcache*"
   ```
4. **Reboot your computer** (most reliable)

#### Garbled or Missing Characters in UI?
- **Quick fix**: Enable ASCII mode in Settings menu
- **Better fix**: Use Windows Terminal (download from Microsoft Store)
- **Alternative**: Run with environment variable:
  ```bash
  set STEAM_FIXER_ASCII=1
  game-icon-fixer.bat
  ```

#### "Steam Not Found" Error?
1. **Verify Steam is installed** and has been run at least once
2. **Check Steam is in standard location**:
   - `C:\Program Files (x86)\Steam`
   - `C:\Program Files\Steam`
3. **Try running as Administrator** if Steam is in Program Files
4. **Manual path**: The app will prompt you to enter Steam path

#### Permission Denied Errors?
- **Run as Administrator** if shortcuts are in protected folders
- **Check file is not read-only**: Right-click → Properties → Uncheck "Read-only"
- **Antivirus blocking**: Add exception for `game-icon-fixer.bat`

#### Icons Download But Don't Apply?
- **Check shortcut target**: Must be `steam://rungameid/[APPID]` format
- **Verify .ico location**: Check `[steam]/steam/games/` folder
- **Try "Replace ALL Desktop Shortcuts"** option for clean recreation

#### Network/Download Issues?
- **Check internet connection**
- **Firewall**: Allow Deno through Windows Firewall
- **Proxy**: Configure proxy settings if behind corporate network
- **CDN blocked**: App tries multiple CDN endpoints automatically

## ❓ FAQ

### General Questions

**Q: Does this work with games from other platforms?**
A: Currently v1.0 only supports Steam games. Support for Xbox Game Pass, Epic Games, GOG, and others is planned for v2.0.

**Q: Will this mess up my existing shortcuts?**
A: No, the app only modifies the icon property of shortcuts. The target and other properties remain unchanged. Use "Replace ALL" option for a complete refresh.

**Q: Do I need to run this as Administrator?**
A: Usually not, unless your shortcuts are in protected folders like Program Files. The app will tell you if admin rights are needed.

**Q: Why do some icons still appear blank?**
A: Windows aggressively caches icons. See the Troubleshooting section for cache clearing steps. A reboot usually fixes this.

**Q: Can I use custom icons instead?**
A: Not in v1.0. Custom icon support is planned for a future release.

### Technical Questions

**Q: Where are the icons downloaded from?**
A: Icons are downloaded from Steam's official CDN servers (Cloudflare, Akamai). The app tries multiple endpoints for reliability.

**Q: Where are icons saved?**
A: Icons are saved to `[Steam]/steam/games/[appid]_icon.ico`, which is Steam's standard location.

**Q: What file formats are supported?**
A: The app works with `.url` (Internet Shortcut) files that point to `steam://rungameid/[appid]`.

**Q: Does this work with portable Steam installations?**
A: Yes! The app detects Steam through multiple methods including config files, so portable installations are supported.

**Q: Can I run this on Linux/Mac?**
A: No, this tool is Windows-only as it relies on Windows shortcut files and Registry. Linux/Mac don't have this icon issue.

### Privacy & Security

**Q: Does this app collect any data?**
A: No. The app is completely offline except for downloading icons from Steam's CDN. No telemetry or data collection.

**Q: Is the source code available?**
A: Yes! This is open source software. Check the [GitHub repository](https://github.com/simonfalconer1979/game-icon-fix).

**Q: What permissions does it need?**
A: Network (download icons), Read (scan folders), Write (save icons), Run (access Registry). See Permissions section for details.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🛠️ Development

### Setting Up Development Environment
```bash
# Clone the repository
git clone https://github.com/simonfalconer1979/game-icon-fix.git
cd game-icon-fix

# Install Deno (if not already installed)
# Windows (PowerShell):
irm https://deno.land/install.ps1 | iex

# Run in development mode
deno run -N -R -W --allow-run mod.ts
```

### Development Commands
```bash
# Run the app
deno run -N -R -W --allow-run mod.ts

# Lint code
deno lint

# Format code
deno fmt

# Type check
deno check mod.ts

# Run tests (when available)
deno test --allow-all
```

### Project Structure
```
game-icon-fix/
├── mod.ts                 # Main entry point
├── ui.ts                  # Terminal UI utilities
├── ui_manager.ts          # Cursor & display management
├── menu.ts                # Menu system
├── browser.ts             # File/directory browser
├── processor.ts           # Icon processing logic
├── steam_detector.ts      # Steam detection & VDF parsing
├── shortcut_manager.ts    # Shortcut creation/management
├── settings.ts            # User preferences
└── console_utils.ts       # Console compatibility
```

### Building for Distribution
```bash
# Create a self-contained executable (coming in v2.0)
deno compile --allow-all --output game-icon-fixer.exe mod.ts

# Create batch launcher
echo @deno run -N -R -W --allow-run %~dp0mod.ts %* > game-icon-fixer.bat
```

## 🤝 Contributing

Contributions are welcome! Areas where you can help:
- Adding support for new game platforms (Xbox, Epic, GOG, etc.)
- Improving icon detection algorithms
- Adding new UI themes and customization options
- Translating to other languages
- Testing on different Windows versions

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow Deno's style guide
- Run `deno fmt` before committing
- Add JSDoc comments for public APIs

## 🙏 Acknowledgments

- Steam CDN URL pattern discovered by [@Dark-talon](https://github.com/Dark-talon)
- Built with [Deno](https://deno.land) - the modern JavaScript runtime
- ASCII art inspired by classic DOS applications

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/simonfalconer1979">@simonfalconer1979</a>
</p>