# Contributing to Steam Icon Fixer

Thank you for your interest in contributing to Steam Icon Fixer! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites
- Windows 10/11
- .NET 9 SDK
- Visual Studio 2022 or VS Code
- Git

### Getting Started
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/game-icon-fix.git`
3. Open `SteamIconFixer.sln` in Visual Studio or the folder in VS Code
4. Build: `.\build-simple.ps1 Build`
5. Run: `dotnet run --project SteamIconFixer`

## Code Style

We use EditorConfig for consistent code style. Please ensure your editor supports it.

### Key Guidelines
- Use 4 spaces for indentation
- Opening braces on new lines
- Use `var` when type is apparent
- Prefer explicit types for public APIs
- Add XML documentation for public members

## Project Structure

- `Core/` - Business logic (Steam detection, icon processing)
- `UI/` - Console interface components
- `docs/` - Documentation
- `build/` - Build scripts

## Making Changes

### Workflow
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Build and test: `.\build-simple.ps1 All`
4. Commit with descriptive message
5. Push to your fork
6. Create a Pull Request

### Commit Messages
- Use present tense: "Add feature" not "Added feature"
- Keep first line under 50 characters
- Reference issues: "Fix #123: Description"

## Testing

Currently manual testing only. When adding features:
1. Test on Windows 10 and 11 if possible
2. Test with multiple Steam libraries
3. Test with different console hosts (cmd, Terminal, PowerShell)

## Adding Features

### CGA Console Guidelines
- Maintain 80x25 character limit
- Use only 16 CGA colors
- Preserve retro aesthetic
- Ensure double-buffered rendering

### Steam Integration
- Handle missing Steam gracefully
- Support multiple library locations
- Respect VDF file formats

## Pull Request Process

1. Update README.md if adding features
2. Ensure no build warnings
3. Test thoroughly
4. Update version in `.csproj` if appropriate
5. PR will be reviewed by maintainers

## Reporting Issues

Use GitHub Issues with:
- Clear title
- Steps to reproduce
- Expected vs actual behavior
- System information
- Error messages/screenshots

## Questions?

Open a discussion on GitHub or reach out to maintainers.

Thank you for contributing!