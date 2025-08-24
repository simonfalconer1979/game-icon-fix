using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using SteamIconFixer.Core;

namespace SteamIconFixer.UI
{
    /// <summary>
    /// Enhanced library viewer that makes full use of CGA 80x25 screen
    /// </summary>
    public class LibraryViewer
    {
        private readonly SteamDetector _steamDetector;
        private int _selectedIndex = 0;
        private int _scrollOffset = 0;
        private bool _isActive = true;

        public LibraryViewer(SteamDetector steamDetector)
        {
            _steamDetector = steamDetector;
        }

        /// <summary>
        /// Show the full library browser interface
        /// </summary>
        public async Task Show()
        {
            // Pre-calculate game counts for each library
            var libraryCounts = await CalculateLibraryGameCounts();
            
            while (_isActive)
            {
                DrawLibraryScreen(libraryCounts);
                CGAConsole.Render();
                
                var key = CGAConsole.WaitForKey();
                HandleKeyPress(key);
            }
        }

        /// <summary>
        /// Calculate game counts for each library
        /// </summary>
        private Task<Dictionary<string, int>> CalculateLibraryGameCounts()
        {
            var counts = new Dictionary<string, int>();
            
            foreach (var library in _steamDetector.Libraries)
            {
                int gameCount = 0;
                string steamappsPath = Path.Combine(library.Path, "steamapps");
                
                if (Directory.Exists(steamappsPath))
                {
                    try
                    {
                        var manifestFiles = Directory.GetFiles(steamappsPath, "appmanifest_*.acf");
                        gameCount = manifestFiles.Length;
                    }
                    catch
                    {
                        gameCount = 0;
                    }
                }
                
                counts[library.Path] = gameCount;
            }
            
            return Task.FromResult(counts);
        }

        /// <summary>
        /// Draw the full library screen using all available space
        /// </summary>
        private void DrawLibraryScreen(Dictionary<string, int> libraryCounts)
        {
            CGAConsole.Clear();
            
            // Title bar (lines 0-3)
            DrawTitleBar();
            
            // Main content area (lines 4-20) - Use full width!
            DrawLibraryList(libraryCounts);
            
            // Status bar (lines 21-24)
            DrawStatusBar();
        }

        private void DrawTitleBar()
        {
            // Title bar with gradient effect
            CGAConsole.FillBox(0, 0, CGAConsole.Width, 1, '═', CGAConsole.Colors.Cyan);
            CGAConsole.WriteCentered(0, " STEAM LIBRARY MANAGER ", CGAConsole.Colors.Yellow);
            
            // Steam info summary
            CGAConsole.WriteAt(2, 2, $"Steam Path: {TruncatePath(_steamDetector.InstallPath, 50)}", CGAConsole.Colors.White);
            CGAConsole.WriteAt(CGAConsole.Width - 25, 2, $"User: {_steamDetector.UserId ?? "Unknown"}", CGAConsole.Colors.White);
            
            CGAConsole.DrawHorizontalLine(0, 3, CGAConsole.Width, CGAConsole.Colors.DarkGray);
        }

        private void DrawLibraryList(Dictionary<string, int> libraryCounts)
        {
            // Column headers with visual separators
            int col1 = 2;   // #
            int col2 = 6;   // Status
            int col3 = 14;  // Label
            int col4 = 28;  // Path
            int col5 = 65;  // Games
            int col6 = 72;  // Size
            
            // Header row
            CGAConsole.WriteAt(col1, 5, "№", CGAConsole.Colors.Cyan);
            CGAConsole.WriteAt(col2, 5, "Status", CGAConsole.Colors.Cyan);
            CGAConsole.WriteAt(col3, 5, "Label", CGAConsole.Colors.Cyan);
            CGAConsole.WriteAt(col4, 5, "Path", CGAConsole.Colors.Cyan);
            CGAConsole.WriteAt(col5, 5, "Games", CGAConsole.Colors.Cyan);
            CGAConsole.WriteAt(col6, 5, "Size", CGAConsole.Colors.Cyan);
            
            CGAConsole.DrawHorizontalLine(1, 6, CGAConsole.Width - 2, CGAConsole.Colors.DarkGray);
            
            // Library list (13 visible rows from line 7 to 19)
            int visibleRows = 13;
            int startY = 7;
            
            for (int i = 0; i < Math.Min(visibleRows, _steamDetector.Libraries.Count - _scrollOffset); i++)
            {
                int libIndex = _scrollOffset + i;
                if (libIndex >= _steamDetector.Libraries.Count)
                    break;
                    
                var library = _steamDetector.Libraries[libIndex];
                bool isSelected = (libIndex == _selectedIndex);
                bool isMain = (libIndex == 0); // First library is always main
                
                // Selection highlight
                if (isSelected)
                {
                    CGAConsole.FillBox(1, startY + i, CGAConsole.Width - 2, 1, ' ', CGAConsole.Colors.Blue);
                }
                
                // Row number
                string rowNum = (libIndex + 1).ToString().PadLeft(2);
                CGAConsole.WriteAt(col1, startY + i, rowNum, 
                    isSelected ? CGAConsole.Colors.Yellow : CGAConsole.Colors.DarkGray);
                
                // Status indicator
                string status = isMain ? "[MAIN]" : "[LIB]";
                string statusColor = isMain ? CGAConsole.Colors.LightGreen : CGAConsole.Colors.Cyan;
                if (isSelected) statusColor = CGAConsole.Colors.Yellow;
                CGAConsole.WriteAt(col2, startY + i, status, statusColor);
                
                // Library label
                string label = library.Label ?? "Library";
                if (label.Length > 12) label = label.Substring(0, 11) + "…";
                CGAConsole.WriteAt(col3, startY + i, label, 
                    isSelected ? CGAConsole.Colors.White : CGAConsole.Colors.LightGray);
                
                // Path (with smart truncation)
                string path = GetSmartPath(library.Path, 35);
                CGAConsole.WriteAt(col4, startY + i, path, 
                    isSelected ? CGAConsole.Colors.White : CGAConsole.Colors.LightGray);
                
                // Game count
                int gameCount = libraryCounts.ContainsKey(library.Path) ? libraryCounts[library.Path] : 0;
                string games = gameCount.ToString().PadLeft(3);
                string gameColor = gameCount > 0 ? CGAConsole.Colors.LightGreen : CGAConsole.Colors.DarkGray;
                if (isSelected) gameColor = CGAConsole.Colors.Yellow;
                CGAConsole.WriteAt(col5, startY + i, games, gameColor);
                
                // Size estimate (based on game count)
                string size = GetSizeEstimate(gameCount);
                CGAConsole.WriteAt(col6, startY + i, size, 
                    isSelected ? CGAConsole.Colors.White : CGAConsole.Colors.DarkGray);
            }
            
            // Scroll indicators
            if (_scrollOffset > 0)
            {
                CGAConsole.WriteAt(CGAConsole.Width - 2, startY, "▲", CGAConsole.Colors.Yellow);
            }
            if (_scrollOffset + visibleRows < _steamDetector.Libraries.Count)
            {
                CGAConsole.WriteAt(CGAConsole.Width - 2, startY + visibleRows - 1, "▼", CGAConsole.Colors.Yellow);
            }
            
            // Summary box at bottom of list area
            DrawSummaryBox(libraryCounts);
        }

        private void DrawSummaryBox(Dictionary<string, int> libraryCounts)
        {
            int totalGames = libraryCounts.Values.Sum();
            int totalLibraries = _steamDetector.Libraries.Count;
            
            // Summary line
            CGAConsole.DrawHorizontalLine(1, 20, CGAConsole.Width - 2, CGAConsole.Colors.DarkGray);
            
            string summary = $"Total: {totalLibraries} libraries, {totalGames} games installed";
            CGAConsole.WriteAt(3, 21, summary, CGAConsole.Colors.Cyan);
            
            // Selected library details
            if (_selectedIndex < _steamDetector.Libraries.Count)
            {
                var selected = _steamDetector.Libraries[_selectedIndex];
                string details = $"Selected: {selected.Path}";
                if (details.Length > 75)
                    details = details.Substring(0, 72) + "...";
                CGAConsole.WriteAt(3, 22, details, CGAConsole.Colors.White);
            }
        }

        private void DrawStatusBar()
        {
            CGAConsole.DrawHorizontalLine(0, 23, CGAConsole.Width, CGAConsole.Colors.DarkGray);
            
            string help = "↑/↓: Navigate │ ENTER: View Games │ SPACE: Quick Info │ ESC: Back";
            CGAConsole.WriteCentered(24, help, CGAConsole.Colors.White);
        }

        private void HandleKeyPress(ConsoleKeyInfo key)
        {
            switch (key.Key)
            {
                case ConsoleKey.UpArrow:
                    if (_selectedIndex > 0)
                    {
                        _selectedIndex--;
                        if (_selectedIndex < _scrollOffset)
                            _scrollOffset = _selectedIndex;
                    }
                    break;
                    
                case ConsoleKey.DownArrow:
                    if (_selectedIndex < _steamDetector.Libraries.Count - 1)
                    {
                        _selectedIndex++;
                        if (_selectedIndex >= _scrollOffset + 13)
                            _scrollOffset = _selectedIndex - 12;
                    }
                    break;
                    
                case ConsoleKey.Enter:
                    ShowLibraryGames(_selectedIndex);
                    break;
                    
                case ConsoleKey.Spacebar:
                    ShowLibraryDetails(_selectedIndex);
                    break;
                    
                case ConsoleKey.Escape:
                    _isActive = false;
                    break;
                    
                case ConsoleKey.Home:
                    _selectedIndex = 0;
                    _scrollOffset = 0;
                    break;
                    
                case ConsoleKey.End:
                    _selectedIndex = _steamDetector.Libraries.Count - 1;
                    _scrollOffset = Math.Max(0, _steamDetector.Libraries.Count - 13);
                    break;
                    
                case ConsoleKey.PageUp:
                    _selectedIndex = Math.Max(0, _selectedIndex - 10);
                    _scrollOffset = Math.Max(0, _scrollOffset - 10);
                    break;
                    
                case ConsoleKey.PageDown:
                    _selectedIndex = Math.Min(_steamDetector.Libraries.Count - 1, _selectedIndex + 10);
                    _scrollOffset = Math.Min(Math.Max(0, _steamDetector.Libraries.Count - 13), _scrollOffset + 10);
                    break;
            }
        }

        private void ShowLibraryGames(int libraryIndex)
        {
            if (libraryIndex >= _steamDetector.Libraries.Count)
                return;
                
            var library = _steamDetector.Libraries[libraryIndex];
            var games = GetLibraryGames(library);
            
            // Show games in a popup
            ShowGamesForLibrary(library, games);
        }

        private List<SteamGame> GetLibraryGames(SteamLibrary library)
        {
            var games = new List<SteamGame>();
            string steamappsPath = Path.Combine(library.Path, "steamapps");
            
            if (Directory.Exists(steamappsPath))
            {
                try
                {
                    var manifestFiles = Directory.GetFiles(steamappsPath, "appmanifest_*.acf");
                    foreach (var manifest in manifestFiles)
                    {
                        try
                        {
                            string content = File.ReadAllText(manifest);
                            string appId = Path.GetFileNameWithoutExtension(manifest).Replace("appmanifest_", "");
                            
                            // Simple regex parsing
                            var nameMatch = System.Text.RegularExpressions.Regex.Match(content, @"""name""\s+""([^""]+)""");
                            if (nameMatch.Success)
                            {
                                games.Add(new SteamGame
                                {
                                    AppId = appId,
                                    Name = nameMatch.Groups[1].Value,
                                    LibraryPath = library.Path
                                });
                            }
                        }
                        catch { }
                    }
                }
                catch { }
            }
            
            return games.OrderBy(g => g.Name).ToList();
        }

        private void ShowGamesForLibrary(SteamLibrary library, List<SteamGame> games)
        {
            int scrollOffset = 0;
            int selectedIndex = 0;
            bool showingGames = true;
            
            while (showingGames)
            {
                CGAConsole.Clear();
                
                // Title
                CGAConsole.FillBox(0, 0, CGAConsole.Width, 1, '═', CGAConsole.Colors.Cyan);
                CGAConsole.WriteCentered(0, $" GAMES IN: {library.Label?.ToUpper() ?? "LIBRARY"} ", CGAConsole.Colors.Yellow);
                
                // Library path
                CGAConsole.WriteAt(2, 2, $"Path: {library.Path}", CGAConsole.Colors.DarkGray);
                CGAConsole.WriteAt(2, 3, $"Total Games: {games.Count}", CGAConsole.Colors.Cyan);
                CGAConsole.DrawHorizontalLine(0, 4, CGAConsole.Width, CGAConsole.Colors.DarkGray);
                
                // Game list (16 visible rows)
                int visibleRows = 16;
                int startY = 5;
                
                for (int i = 0; i < Math.Min(visibleRows, games.Count - scrollOffset); i++)
                {
                    int gameIndex = scrollOffset + i;
                    if (gameIndex >= games.Count)
                        break;
                        
                    var game = games[gameIndex];
                    bool isSelected = (gameIndex == selectedIndex);
                    
                    if (isSelected)
                    {
                        CGAConsole.FillBox(1, startY + i, CGAConsole.Width - 2, 1, ' ', CGAConsole.Colors.Blue);
                    }
                    
                    string num = (gameIndex + 1).ToString().PadLeft(3);
                    string name = game.Name.Length > 60 ? game.Name.Substring(0, 57) + "..." : game.Name;
                    string appId = $"[{game.AppId}]";
                    
                    CGAConsole.WriteAt(2, startY + i, num, 
                        isSelected ? CGAConsole.Colors.Yellow : CGAConsole.Colors.DarkGray);
                    CGAConsole.WriteAt(6, startY + i, name, 
                        isSelected ? CGAConsole.Colors.White : CGAConsole.Colors.LightGray);
                    CGAConsole.WriteAt(68, startY + i, appId, 
                        isSelected ? CGAConsole.Colors.Cyan : CGAConsole.Colors.DarkGray);
                }
                
                // Scroll indicators
                if (scrollOffset > 0)
                    CGAConsole.WriteAt(CGAConsole.Width - 2, startY, "▲", CGAConsole.Colors.Yellow);
                if (scrollOffset + visibleRows < games.Count)
                    CGAConsole.WriteAt(CGAConsole.Width - 2, startY + visibleRows - 1, "▼", CGAConsole.Colors.Yellow);
                
                // Help
                CGAConsole.DrawHorizontalLine(0, 22, CGAConsole.Width, CGAConsole.Colors.DarkGray);
                CGAConsole.WriteCentered(23, "↑/↓: Navigate │ ESC: Back to Libraries", CGAConsole.Colors.White);
                
                CGAConsole.Render();
                
                var key = CGAConsole.WaitForKey();
                switch (key.Key)
                {
                    case ConsoleKey.UpArrow:
                        if (selectedIndex > 0)
                        {
                            selectedIndex--;
                            if (selectedIndex < scrollOffset)
                                scrollOffset = selectedIndex;
                        }
                        break;
                    case ConsoleKey.DownArrow:
                        if (selectedIndex < games.Count - 1)
                        {
                            selectedIndex++;
                            if (selectedIndex >= scrollOffset + visibleRows)
                                scrollOffset = selectedIndex - visibleRows + 1;
                        }
                        break;
                    case ConsoleKey.Escape:
                        showingGames = false;
                        break;
                }
            }
        }

        private void ShowLibraryDetails(int libraryIndex)
        {
            if (libraryIndex >= _steamDetector.Libraries.Count)
                return;
                
            var library = _steamDetector.Libraries[libraryIndex];
            
            // Draw popup with library details
            int boxX = 15, boxY = 8, boxWidth = 50, boxHeight = 9;
            
            CGAConsole.FillBox(boxX, boxY, boxWidth, boxHeight, ' ', CGAConsole.Colors.Black);
            CGAConsole.DrawBox(boxX, boxY, boxWidth, boxHeight, CGAConsole.Colors.Yellow);
            
            CGAConsole.WriteCentered(boxY + 1, "LIBRARY DETAILS", CGAConsole.Colors.Yellow);
            CGAConsole.DrawHorizontalLine(boxX + 1, boxY + 2, boxWidth - 2, CGAConsole.Colors.Yellow);
            
            CGAConsole.WriteAt(boxX + 2, boxY + 3, $"Label: {library.Label ?? "N/A"}", CGAConsole.Colors.White);
            CGAConsole.WriteAt(boxX + 2, boxY + 4, $"Path: {TruncatePath(library.Path, 45)}", CGAConsole.Colors.White);
            
            // Check if path exists
            bool exists = Directory.Exists(library.Path);
            CGAConsole.WriteAt(boxX + 2, boxY + 5, $"Status: {(exists ? "Available" : "Not Found")}", 
                exists ? CGAConsole.Colors.LightGreen : CGAConsole.Colors.Red);
            
            CGAConsole.DrawHorizontalLine(boxX + 1, boxY + 6, boxWidth - 2, CGAConsole.Colors.Yellow);
            CGAConsole.WriteCentered(boxY + 7, "[ Press any key to close ]", CGAConsole.Colors.White);
            
            CGAConsole.Render();
            CGAConsole.WaitForKey();
        }

        private string GetSmartPath(string path, int maxLength)
        {
            if (path.Length <= maxLength)
                return path;
                
            // Smart truncation - show drive and last folder
            string? drive = Path.GetPathRoot(path);
            string? lastFolder = Path.GetFileName(path);
            
            if (string.IsNullOrEmpty(lastFolder))
                lastFolder = Path.GetFileName(Path.GetDirectoryName(path)) ?? string.Empty;
                
            string smart = $"{drive}...\\{lastFolder}";
            if (smart.Length > maxLength)
                return path.Substring(0, maxLength - 3) + "...";
                
            return smart;
        }

        private string GetSizeEstimate(int gameCount)
        {
            // Rough estimate based on average game size
            if (gameCount == 0) return "Empty";
            if (gameCount < 5) return "~" + (gameCount * 15) + "GB";
            if (gameCount < 10) return "~" + (gameCount * 12) + "GB";
            return "~" + (gameCount * 10) + "GB";
        }

        private string TruncatePath(string path, int maxLength)
        {
            if (path.Length <= maxLength)
                return path;
            return path.Substring(0, maxLength - 3) + "...";
        }
    }
}