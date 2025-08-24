# Steam Icon Fixer - Architecture Documentation

## Project Structure

```
game-icon-fix/
├── src/                        # Source code
│   └── SteamIconFixer/
│       ├── Core/              # Business logic
│       │   ├── IconProcessor.cs
│       │   └── SteamDetector.cs
│       ├── UI/                # User interface
│       │   ├── CGAConsole.cs
│       │   ├── LibraryViewer.cs
│       │   └── Menu.cs
│       ├── Application.cs    # Application controller
│       └── Program.cs         # Entry point
├── docs/                      # Documentation
├── build/                     # Build scripts
├── Release/                   # Compiled releases
└── artifacts/                 # Build artifacts
```

## Architecture Layers

### 1. Core Layer (`Core/`)
- **Purpose**: Business logic and Steam interaction
- **Dependencies**: Windows Registry, File System
- **Key Classes**:
  - `SteamDetector`: Finds Steam installation and libraries
  - `IconProcessor`: Downloads and processes icons

### 2. UI Layer (`UI/`)
- **Purpose**: Console user interface with CGA emulation
- **Dependencies**: Console APIs, Pastel for colors
- **Key Classes**:
  - `CGAConsole`: 80x25 text mode emulator
  - `Menu`: Interactive menu system
  - `LibraryViewer`: Full-screen library browser

### 3. Application Layer
- **Purpose**: Orchestrates UI and Core components
- **Dependencies**: All layers
- **Key Classes**:
  - `Application`: Main controller
  - `Program`: Entry point

## Data Flow

```
User Input → Menu → Application → Core Services → Steam/Files
                ↓                      ↓
           CGAConsole ← Results ← Processing
```

## Key Design Patterns

1. **Separation of Concerns**: Clear layer boundaries
2. **Dependency Injection**: Services passed via constructors
3. **Async/Await**: Non-blocking UI operations
4. **Double Buffering**: Flicker-free console rendering

## Technology Stack

- **.NET 9**: Latest framework features
- **C# 12**: Modern language features
- **Windows-specific**: Registry, P/Invoke
- **NuGet Packages**:
  - Microsoft.Win32.Registry
  - Pastel (ANSI colors)
  - System.Management