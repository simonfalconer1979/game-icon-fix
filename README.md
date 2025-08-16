# 🎮 Steam Icon Fixer

[![Deno](https://img.shields.io/badge/deno-2.x-blue?logo=deno)](https://deno.land)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-orange)](https://github.com/simonfalconer1979/game-icon-fix)

Fix blank Steam desktop shortcut icons with an interactive retro ASCII interface. Features automatic Steam detection, multi-library support, and beautiful terminal-based navigation.

## ✨ Features

- **🔍 Auto-Detection** - Automatically finds Steam installation and all libraries
- **📚 Multi-Library Support** - Detects games across all Steam library folders
- **🎨 Interactive UI** - Retro ASCII terminal interface with menu navigation
- **⚡ Batch Processing** - Fix multiple shortcuts at once
- **🔄 Smart Caching** - Skips already-fixed icons to save time
- **🌐 CDN Fallbacks** - Multiple download sources for reliability

## 🚀 Quick Start

### Option 1: Windows Batch File (Easiest)
1. Download `steam-icon-fixer.bat`
2. Double-click to run
3. Navigate through the interactive ASCII menu

### Option 2: Command Line
```bash
# Launch interactive ASCII interface
deno run -N -R -W --allow-run https://raw.githubusercontent.com/simonfalconer1979/game-icon-fix/main/mod.ts
```

## 📋 Requirements

- Windows 10/11
- [Deno](https://deno.land) runtime
- Active internet connection

## 🎮 How It Works

1. **Detects Steam** - Finds Steam installation via registry, config files, or common paths
2. **Scans Libraries** - Reads `libraryfolders.vdf` to find all game libraries
3. **Processes Shortcuts** - Identifies Steam shortcuts (.url files) with `steam://rungameid/`
4. **Downloads Icons** - Fetches missing icons from Steam CDN
5. **Saves Icons** - Places icons in Steam's games folder

## 🖥️ Interactive Menu

```
╔═══════════════════════════════════════════════╗
║           STEAM ICON FIXER 1.0                ║
╠═══════════════════════════════════════════════╣
║  ▶ Interactive UI Mode                        ║
║    Fix Current Directory                      ║
║    Fix Desktop Icons                          ║
║    Browse for Directory...                    ║
║    Refresh ALL Desktop Shortcuts              ║
║    Settings & Options                         ║
║    Exit                                       ║
╚═══════════════════════════════════════════════╝
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


## 🛡️ Permissions

| Permission | Purpose |
|------------|---------|
| `-N` | Download icons from Steam CDN |
| `-R` | Read Steam folders and shortcuts |
| `-W` | Save icon files |
| `--allow-run` | Access Windows Registry |

## 🐛 Troubleshooting

### Icons Still Blank?
1. Restart Windows Explorer: `taskkill /f /im explorer.exe && start explorer.exe`
2. Clear icon cache: Delete `%LOCALAPPDATA%\IconCache.db`
3. Reboot your computer

### Garbled Characters?
- Enable ASCII mode in the Settings menu for better compatibility
- Update to Windows Terminal for full Unicode support

### Steam Not Found?
- Steam path is detected automatically through registry and common locations
- Ensure Steam is installed and has been run at least once
- The app will guide you through Steam detection

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Steam CDN URL pattern discovered by [@Dark-talon](https://github.com/Dark-talon)
- Built with [Deno](https://deno.land) - the modern JavaScript runtime
- ASCII art inspired by classic DOS applications

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/simonfalconer1979">@simonfalconer1979</a>
</p>