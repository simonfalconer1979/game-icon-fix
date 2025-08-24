# Steam Icon Fixer v2.0 - .NET Edition

A powerful Windows application that fixes blank Steam desktop shortcut icons with an authentic retro CGA-style interface.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![.NET](https://img.shields.io/badge/.NET-9.0-purple)
![Platform](https://img.shields.io/badge/platform-Windows-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 🎮 Features

- **Automatic Steam Detection**: Finds Steam installation and all library folders automatically
- **Multi-Library Support**: Full-screen library browser with scrolling support for unlimited libraries
- **Batch Icon Processing**: Fix all desktop and Start Menu shortcuts at once  
- **CDN Selection**: Choose between Akamai and Cloudflare CDNs for icon downloads
- **Icon Cache Management**: Automatic Windows icon cache refresh for immediate results
- **Retro CGA Interface**: Authentic 80x25 text mode with 16-color CGA palette
- **Detailed Reporting**: Shows processing results with success/failure counts

## 📸 Screenshots

```
╔═══════════════════════════════════════════════╗
║  ███████╗████████╗███████╗ █████╗ ███╗   ███╗ ║
║  ██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║ ║
║  ███████╗   ██║   █████╗  ███████║██╔████╔██║ ║
║  ╚════██║   ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║ ║
║  ███████║   ██║   ███████╗██║  ██║██║ ╚═╝ ██║ ║
║  ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ║
║        ICON FIXER v2.0 - .NET Edition          ║
╚═══════════════════════════════════════════════╝
```

### Main Menu
- Detect Steam Installation
- Browse Steam Libraries (Full-Screen View)
- Scan for Installed Games
- Fix Icons on Desktop
- Configuration
- Exit

### Enhanced Library Browser
```
════════════════════════════ STEAM LIBRARY MANAGER ════════════════════════════
Steam Path: c:/program files (x86)/steam                    User: 76561198...
────────────────────────────────────────────────────────────────────────────────
№  Status  Label       Path                              Games  Size
─────────────────────────────────────────────────────────────────────────────
1  [MAIN]  Main        c:/program files (x86)/steam        15    ~150GB
2  [LIB]   Library     D:\SteamLibrary                      8    ~96GB
3  [LIB]   External    E:\Games\Steam                      12    ~120GB
─────────────────────────────────────────────────────────────────────────────
Total: 3 libraries, 35 games installed
────────────────────────────────────────────────────────────────────────────────
↑/↓: Navigate │ ENTER: View Games │ SPACE: Quick Info │ ESC: Back
```

## 🚀 Quick Start

### Download & Run
1. Download `SteamIconFixer.exe` from the [Releases](https://github.com/yourusername/game-icon-fix/releases) page
2. Run as Administrator (recommended for icon cache refresh)
3. Follow the on-screen menu

### From Source
```bash
# Clone repository
git clone https://github.com/yourusername/game-icon-fix.git
cd game-icon-fix

# Build and run
cd SteamIconFixer
dotnet run

# Or use the batch file
run.bat
```

## 🛠️ Building from Source

### Requirements
- Windows 10/11
- .NET 9 SDK
- Visual Studio 2022 or VS Code (optional)

### Build Commands
```bash
# Restore packages
dotnet restore

# Build Debug
dotnet build

# Build Release
dotnet build -c Release

# Create self-contained executable (26MB optimized)
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:PublishTrimmed=true -o ./publish

# Create full executable (69MB, maximum compatibility)
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:PublishTrimmed=false -o ./publish-full
```

## 💡 How It Works

The application uses the proven C++ SteamIconFix methodology:

1. **Steam Detection**: Reads Windows Registry to find Steam installation paths
2. **Library Discovery**: Parses `libraryfolders.vdf` for all game libraries
3. **Shortcut Scanning**: Finds all `.url` files on Desktop and Start Menu
4. **Icon Resolution**: Downloads missing icons from Steam CDN servers
5. **Cache Refresh**: Flushes Windows icon cache for immediate effect

## 🎨 Technical Details

### Architecture
```
SteamIconFixer/
├── Core/
│   ├── SteamDetector.cs     # Steam installation and library detection
│   └── IconProcessor.cs     # Icon download and shortcut processing
├── UI/
│   ├── CGAConsole.cs        # Retro CGA console emulator
│   ├── Menu.cs              # Interactive menu system
│   └── LibraryViewer.cs     # Full-screen library browser
├── Application.cs           # Main application controller
└── Program.cs              # Entry point
```

### CGA Features
- Authentic 16-color palette (Black, Blue, Green, Cyan, Red, Magenta, Brown, etc.)
- 80x25 character display with box-drawing characters
- Double-buffered rendering for flicker-free updates
- ANSI art support with Pastel library
- Windows Console API integration

### Dependencies
- `Microsoft.Win32.Registry` - Windows Registry access
- `Pastel` - ANSI color support for console
- `System.Management` - System information queries

## 🎮 Keyboard Controls

| Key | Action |
|-----|--------|
| ↑/↓ | Navigate menu items |
| Enter | Select option |
| ESC | Go back/Cancel |
| 1-5 | Quick select menu items |
| PgUp/PgDn | Scroll in library view |
| Home/End | Jump to first/last item |
| Space | Show quick info |

## 🔧 Troubleshooting

### Icons Not Updating?
- Press F5 on desktop to refresh
- Restart Windows Explorer
- Reboot computer (most reliable)

### Steam Not Found?
- Ensure Steam has been run at least once
- Check standard installation paths:
  - `C:\Program Files (x86)\Steam`
  - `C:\Program Files\Steam`

### Console Display Issues?
- Run in Windows Terminal or Command Prompt
- Avoid PowerShell ISE
- Ensure console window is at least 80x25 characters

## 📊 Version History

### v2.0.0 (2024)
- Complete .NET 9 rewrite
- Enhanced library viewer with full-screen display
- Improved CGA console emulation
- Better error handling and reporting
- Optimized executable size

### v1.0.0 (Original)
- C++ implementation
- Basic Steam detection
- Simple icon fixing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Credits

- Original C++ SteamIconFix methodology
- Retro CGA interface inspired by 1980s DOS applications
- Built with .NET 9 and modern C# features
- Steam Icon Fixer Team

## 🔗 Links

- [Report Issues](https://github.com/yourusername/game-icon-fix/issues)
- [Steam](https://store.steampowered.com)
- [.NET](https://dotnet.microsoft.com)

---

*Steam Icon Fixer v2.0 - Bringing retro aesthetics to modern Windows*