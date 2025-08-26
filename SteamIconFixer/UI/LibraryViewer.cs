using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using SteamIconFixer.Core;

namespace SteamIconFixer.UI
{
    /// <summary>
    /// Enhanced library viewer that makes full use of SVGA 100x37 screen
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
                SVGAFormConsole.Render();
                
                var key = SVGAFormConsole.WaitForKey();
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
            SVGAFormConsole.Clear();
            
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
            SVGAFormConsole.FillBox(0, 0, SVGAFormConsole.Width, 1, '═', SVGAFormConsole.Colors.Cyan);
            SVGAFormConsole.WriteCentered(0, " STEAM LIBRARY MANAGER ", SVGAFormConsole.Colors.Yellow);
            
            // Steam info summary
            SVGAFormConsole.WriteAt(2, 2, $"Steam Path: {TruncatePath(_steamDetector.InstallPath, 50)}", SVGAFormConsole.Colors.White);
            SVGAFormConsole.WriteAt(SVGAFormConsole.Width - 25, 2, $"User: {_steamDetector.UserId ?? "Unknown"}", SVGAFormConsole.Colors.White);
            
            SVGAFormConsole.DrawHorizontalLine(0, 3, SVGAFormConsole.Width, SVGAFormConsole.Colors.DarkGray);
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
            SVGAFormConsole.WriteAt(col1, 5, "№", SVGAFormConsole.Colors.Cyan);
            SVGAFormConsole.WriteAt(col2, 5, "Status", SVGAFormConsole.Colors.Cyan);
            SVGAFormConsole.WriteAt(col3, 5, "Label", SVGAFormConsole.Colors.Cyan);
            SVGAFormConsole.WriteAt(col4, 5, "Path", SVGAFormConsole.Colors.Cyan);
            SVGAFormConsole.WriteAt(col5, 5, "Games", SVGAFormConsole.Colors.Cyan);
            SVGAFormConsole.WriteAt(col6, 5, "Size", SVGAFormConsole.Colors.Cyan);
            
            SVGAFormConsole.DrawHorizontalLine(1, 6, SVGAFormConsole.Width - 2, SVGAFormConsole.Colors.DarkGray);
            
            // Library list (25 visible rows from line 7 to 31 in SVGA)
            int visibleRows = 25;
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
                    SVGAFormConsole.FillBox(1, startY + i, SVGAFormConsole.Width - 2, 1, ' ', SVGAFormConsole.Colors.Blue);
                }
                
                // Row number
                string rowNum = (libIndex + 1).ToString().PadLeft(2);
                SVGAFormConsole.WriteAt(col1, startY + i, rowNum, 
                    isSelected ? SVGAFormConsole.Colors.Yellow : SVGAFormConsole.Colors.DarkGray);
                
                // Status indicator
                string status = isMain ? "[MAIN]" : "[LIB]";
                string statusColor = isMain ? SVGAFormConsole.Colors.LightGreen : SVGAFormConsole.Colors.Cyan;
                if (isSelected) statusColor = SVGAFormConsole.Colors.Yellow;
                SVGAFormConsole.WriteAt(col2, startY + i, status, statusColor);
                
                // Library label
                string label = library.Label ?? "Library";
                if (label.Length > 12) label = label.Substring(0, 11) + "…";
                SVGAFormConsole.WriteAt(col3, startY + i, label, 
                    isSelected ? SVGAFormConsole.Colors.White : SVGAFormConsole.Colors.LightGray);
                
                // Path (with smart truncation)
                string path = GetSmartPath(library.Path, 35);
                SVGAFormConsole.WriteAt(col4, startY + i, path, 
                    isSelected ? SVGAFormConsole.Colors.White : SVGAFormConsole.Colors.LightGray);
                
                // Game count
                int gameCount = libraryCounts.ContainsKey(library.Path) ? libraryCounts[library.Path] : 0;
                string games = gameCount.ToString().PadLeft(3);
                string gameColor = gameCount > 0 ? SVGAFormConsole.Colors.LightGreen : SVGAFormConsole.Colors.DarkGray;
                if (isSelected) gameColor = SVGAFormConsole.Colors.Yellow;
                SVGAFormConsole.WriteAt(col5, startY + i, games, gameColor);
                
                // Size estimate (based on game count)
                string size = GetSizeEstimate(gameCount);
                SVGAFormConsole.WriteAt(col6, startY + i, size, 
                    isSelected ? SVGAFormConsole.Colors.White : SVGAFormConsole.Colors.DarkGray);
            }
            
            // Scroll indicators
            if (_scrollOffset > 0)
            {
                SVGAFormConsole.WriteAt(SVGAFormConsole.Width - 2, startY, "▲", SVGAFormConsole.Colors.Yellow);
            }
            if (_scrollOffset + visibleRows < _steamDetector.Libraries.Count)
            {
                SVGAFormConsole.WriteAt(SVGAFormConsole.Width - 2, startY + visibleRows - 1, "▼", SVGAFormConsole.Colors.Yellow);
            }
            
            // Summary box at bottom of list area
            DrawSummaryBox(libraryCounts);
        }

        private void DrawSummaryBox(Dictionary<string, int> libraryCounts)
        {
            int totalGames = libraryCounts.Values.Sum();
            int totalLibraries = _steamDetector.Libraries.Count;
            
            // Summary line
            SVGAFormConsole.DrawHorizontalLine(1, 20, SVGAFormConsole.Width - 2, SVGAFormConsole.Colors.DarkGray);
            
            string summary = $"Total: {totalLibraries} libraries, {totalGames} games installed";
            SVGAFormConsole.WriteAt(3, 21, summary, SVGAFormConsole.Colors.Cyan);
            
            // Selected library details
            if (_selectedIndex < _steamDetector.Libraries.Count)
            {
                var selected = _steamDetector.Libraries[_selectedIndex];
                string details = $"Selected: {selected.Path}";
                if (details.Length > 75)
                    details = details.Substring(0, 72) + "...";
                SVGAFormConsole.WriteAt(3, 22, details, SVGAFormConsole.Colors.White);
            }
        }

        private void DrawStatusBar()
        {
            SVGAFormConsole.DrawHorizontalLine(0, 23, SVGAFormConsole.Width, SVGAFormConsole.Colors.DarkGray);
            
            string help = "↑/↓: Navigate │ ENTER: View Games │ SPACE: Quick Info │ ESC: Back";
            SVGAFormConsole.WriteCentered(24, help, SVGAFormConsole.Colors.White);
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
                SVGAFormConsole.Clear();
                
                // Title
                SVGAFormConsole.FillBox(0, 0, SVGAFormConsole.Width, 1, '═', SVGAFormConsole.Colors.Cyan);
                SVGAFormConsole.WriteCentered(0, $" GAMES IN: {library.Label?.ToUpper() ?? "LIBRARY"} ", SVGAFormConsole.Colors.Yellow);
                
                // Library path
                SVGAFormConsole.WriteAt(2, 2, $"Path: {library.Path}", SVGAFormConsole.Colors.DarkGray);
                SVGAFormConsole.WriteAt(2, 3, $"Total Games: {games.Count}", SVGAFormConsole.Colors.Cyan);
                SVGAFormConsole.DrawHorizontalLine(0, 4, SVGAFormConsole.Width, SVGAFormConsole.Colors.DarkGray);
                
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
                        SVGAFormConsole.FillBox(1, startY + i, SVGAFormConsole.Width - 2, 1, ' ', SVGAFormConsole.Colors.Blue);
                    }
                    
                    string num = (gameIndex + 1).ToString().PadLeft(3);
                    string name = game.Name.Length > 60 ? game.Name.Substring(0, 57) + "..." : game.Name;
                    string appId = $"[{game.AppId}]";
                    
                    SVGAFormConsole.WriteAt(2, startY + i, num, 
                        isSelected ? SVGAFormConsole.Colors.Yellow : SVGAFormConsole.Colors.DarkGray);
                    SVGAFormConsole.WriteAt(6, startY + i, name, 
                        isSelected ? SVGAFormConsole.Colors.White : SVGAFormConsole.Colors.LightGray);
                    SVGAFormConsole.WriteAt(68, startY + i, appId, 
                        isSelected ? SVGAFormConsole.Colors.Cyan : SVGAFormConsole.Colors.DarkGray);
                }
                
                // Scroll indicators
                if (scrollOffset > 0)
                    SVGAFormConsole.WriteAt(SVGAFormConsole.Width - 2, startY, "▲", SVGAFormConsole.Colors.Yellow);
                if (scrollOffset + visibleRows < games.Count)
                    SVGAFormConsole.WriteAt(SVGAFormConsole.Width - 2, startY + visibleRows - 1, "▼", SVGAFormConsole.Colors.Yellow);
                
                // Help
                SVGAFormConsole.DrawHorizontalLine(0, 22, SVGAFormConsole.Width, SVGAFormConsole.Colors.DarkGray);
                SVGAFormConsole.WriteCentered(23, "↑/↓: Navigate │ ESC: Back to Libraries", SVGAFormConsole.Colors.White);
                
                SVGAFormConsole.Render();
                
                var key = SVGAFormConsole.WaitForKey();
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
            
            SVGAFormConsole.FillBox(boxX, boxY, boxWidth, boxHeight, ' ', SVGAFormConsole.Colors.Black);
            SVGAFormConsole.DrawBox(boxX, boxY, boxWidth, boxHeight, SVGAFormConsole.Colors.Yellow);
            
            SVGAFormConsole.WriteCentered(boxY + 1, "LIBRARY DETAILS", SVGAFormConsole.Colors.Yellow);
            SVGAFormConsole.DrawHorizontalLine(boxX + 1, boxY + 2, boxWidth - 2, SVGAFormConsole.Colors.Yellow);
            
            SVGAFormConsole.WriteAt(boxX + 2, boxY + 3, $"Label: {library.Label ?? "N/A"}", SVGAFormConsole.Colors.White);
            SVGAFormConsole.WriteAt(boxX + 2, boxY + 4, $"Path: {TruncatePath(library.Path, 45)}", SVGAFormConsole.Colors.White);
            
            // Check if path exists
            bool exists = Directory.Exists(library.Path);
            SVGAFormConsole.WriteAt(boxX + 2, boxY + 5, $"Status: {(exists ? "Available" : "Not Found")}", 
                exists ? SVGAFormConsole.Colors.LightGreen : SVGAFormConsole.Colors.Red);
            
            SVGAFormConsole.DrawHorizontalLine(boxX + 1, boxY + 6, boxWidth - 2, SVGAFormConsole.Colors.Yellow);
            SVGAFormConsole.WriteCentered(boxY + 7, "[ Press any key to close ]", SVGAFormConsole.Colors.White);
            
            SVGAFormConsole.Render();
            SVGAFormConsole.WaitForKey();
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
