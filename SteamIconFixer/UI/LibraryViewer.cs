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
                ModernConsole.Render();
                
                var key = ModernConsole.WaitForKey();
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
            ModernConsole.Clear();
            
            // Title bar (lines 0-3)
            DrawTitleBar();
            
            // Main content area (lines 4-20) - Use full width!
            DrawLibraryList(libraryCounts);
            
            // Status bar (lines 21-24)
            DrawStatusBar();
        }

        private void DrawTitleBar()
        {
            // Clean title section matching main menu style
            ModernConsole.DrawTitle(2);
            
            // Steam info summary
            ModernConsole.WriteAt(10, 5, $"Steam Path: {TruncatePath(_steamDetector.InstallPath, 50)}", ModernConsole.Colors.TextDim);
            ModernConsole.WriteAt(ModernConsole.Width - 35, 5, $"User: {_steamDetector.UserId ?? "Unknown"}", ModernConsole.Colors.TextDim);
            
            ModernConsole.DrawHorizontalLine(10, 6, ModernConsole.Width - 20, ModernConsole.Colors.Border);
        }

        private void DrawLibraryList(Dictionary<string, int> libraryCounts)
        {
            // Draw content background
            int boxX = 10;
            int boxY = 7;
            int boxWidth = ModernConsole.Width - 20;
            int boxHeight = 26;
            ModernConsole.FillBox(boxX, boxY, boxWidth, boxHeight, ' ', ModernConsole.Colors.Text, ModernConsole.Colors.SurfaceLight);
            ModernConsole.DrawBox(boxX, boxY, boxWidth, boxHeight, ModernConsole.Colors.Border);
            
            // Column headers
            int col1 = boxX + 2;   // #
            int col2 = boxX + 6;   // Status
            int col3 = boxX + 14;  // Label
            int col4 = boxX + 28;  // Path
            int col5 = boxX + 65;  // Games
            int col6 = boxX + 72;  // Size
            
            // Header row
            ModernConsole.WriteAt(col1, boxY + 1, "№", ModernConsole.Colors.Accent);
            ModernConsole.WriteAt(col2, boxY + 1, "Status", ModernConsole.Colors.Accent);
            ModernConsole.WriteAt(col3, boxY + 1, "Label", ModernConsole.Colors.Accent);
            ModernConsole.WriteAt(col4, boxY + 1, "Path", ModernConsole.Colors.Accent);
            ModernConsole.WriteAt(col5, boxY + 1, "Games", ModernConsole.Colors.Accent);
            ModernConsole.WriteAt(col6, boxY + 1, "Size", ModernConsole.Colors.Accent);
            
            ModernConsole.DrawHorizontalLine(boxX + 1, boxY + 2, boxWidth - 2, ModernConsole.Colors.Border);
            
            // Library list
            int visibleRows = 20;
            int startY = boxY + 3;
            
            for (int i = 0; i < Math.Min(visibleRows, _steamDetector.Libraries.Count - _scrollOffset); i++)
            {
                int libIndex = _scrollOffset + i;
                if (libIndex >= _steamDetector.Libraries.Count)
                    break;
                    
                var library = _steamDetector.Libraries[libIndex];
                bool isSelected = (libIndex == _selectedIndex);
                bool isMain = (libIndex == 0); // First library is always main
                
                // Selection highlight with modern style
                if (isSelected)
                {
                    ModernConsole.FillBox(boxX + 1, startY + i, boxWidth - 2, 1, ' ', ModernConsole.Colors.Text, ModernConsole.Colors.SurfaceLight);
                }
                
                // Row number
                string rowNum = (libIndex + 1).ToString().PadLeft(2);
                ModernConsole.WriteAt(col1, startY + i, rowNum, 
                    isSelected ? ModernConsole.Colors.AccentLight : ModernConsole.Colors.TextDim);
                
                // Status indicator
                string status = isMain ? "[MAIN]" : "[LIB]";
                var statusColor = isMain ? ModernConsole.Colors.Success : ModernConsole.Colors.Accent;
                if (isSelected) statusColor = ModernConsole.Colors.AccentLight;
                ModernConsole.WriteAt(col2, startY + i, status, statusColor);
                
                // Library label
                string label = library.Label ?? "Library";
                if (label.Length > 12) label = label.Substring(0, 11) + "…";
                ModernConsole.WriteAt(col3, startY + i, label, 
                    isSelected ? ModernConsole.Colors.Text : ModernConsole.Colors.TextDim);
                
                // Path (with smart truncation)
                string path = GetSmartPath(library.Path, 35);
                ModernConsole.WriteAt(col4, startY + i, path, 
                    isSelected ? ModernConsole.Colors.Text : ModernConsole.Colors.TextDim);
                
                // Game count
                int gameCount = libraryCounts.ContainsKey(library.Path) ? libraryCounts[library.Path] : 0;
                string games = gameCount.ToString().PadLeft(3);
                var gameColor = gameCount > 0 ? ModernConsole.Colors.Success : ModernConsole.Colors.SurfaceLight;
                if (isSelected) gameColor = ModernConsole.Colors.AccentLight;
                ModernConsole.WriteAt(col5, startY + i, games, gameColor);
                
                // Size estimate (based on game count)
                string size = GetSizeEstimate(gameCount);
                ModernConsole.WriteAt(col6, startY + i, size, 
                    isSelected ? ModernConsole.Colors.Text : ModernConsole.Colors.SurfaceLight);
            }
            
            // Scroll indicators
            if (_scrollOffset > 0)
            {
                ModernConsole.WriteAt(ModernConsole.Width - 2, startY, "▲", ModernConsole.Colors.AccentLight);
            }
            if (_scrollOffset + visibleRows < _steamDetector.Libraries.Count)
            {
                ModernConsole.WriteAt(ModernConsole.Width - 2, startY + visibleRows - 1, "▼", ModernConsole.Colors.AccentLight);
            }
            
            // Summary box at bottom of list area
            DrawSummaryBox(libraryCounts);
        }

        private void DrawSummaryBox(Dictionary<string, int> libraryCounts)
        {
            int totalGames = libraryCounts.Values.Sum();
            int totalLibraries = _steamDetector.Libraries.Count;
            
            // Summary line
            ModernConsole.DrawHorizontalLine(1, 20, ModernConsole.Width - 2, ModernConsole.Colors.SurfaceLight);
            
            string summary = $"Total: {totalLibraries} libraries, {totalGames} games installed";
            ModernConsole.WriteAt(3, 21, summary, ModernConsole.Colors.Accent);
            
            // Selected library details
            if (_selectedIndex < _steamDetector.Libraries.Count)
            {
                var selected = _steamDetector.Libraries[_selectedIndex];
                string details = $"Selected: {selected.Path}";
                if (details.Length > 75)
                    details = details.Substring(0, 72) + "...";
                ModernConsole.WriteCentered(30, details, ModernConsole.Colors.TextDim);
            }
        }

        private void DrawStatusBar()
        {
            // Navigation help at bottom
            ModernConsole.DrawHorizontalLine(10, ModernConsole.Height - 3, ModernConsole.Width - 20, ModernConsole.Colors.Border);
            
            string help = "↑/↓: Navigate │ ENTER: View Games │ SPACE: Quick Info │ ESC: Back";
            ModernConsole.WriteCentered(ModernConsole.Height - 2, help, ModernConsole.Colors.TextDim);
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
                            
                            // Parse game name
                            var nameMatch = System.Text.RegularExpressions.Regex.Match(content, @"""name""\s+""([^""]+)""");
                            
                            // Parse game size in bytes
                            var sizeMatch = System.Text.RegularExpressions.Regex.Match(content, @"""SizeOnDisk""\s+""(\d+)""");
                            long sizeInBytes = 0;
                            if (sizeMatch.Success)
                            {
                                long.TryParse(sizeMatch.Groups[1].Value, out sizeInBytes);
                            }
                            
                            if (nameMatch.Success)
                            {
                                var game = new SteamGame
                                {
                                    AppId = appId,
                                    Name = nameMatch.Groups[1].Value,
                                    LibraryPath = library.Path,
                                    SizeInBytes = sizeInBytes
                                };
                                
                                // Calculate actual game folder size if manifest doesn't have it
                                if (sizeInBytes == 0)
                                {
                                    string gamePath = Path.Combine(steamappsPath, "common", game.Name);
                                    if (Directory.Exists(gamePath))
                                    {
                                        game.SizeInBytes = GetDirectorySize(gamePath);
                                    }
                                }
                                
                                games.Add(game);
                            }
                        }
                        catch { }
                    }
                }
                catch { }
            }
            
            return games.OrderBy(g => g.Name).ToList();
        }

        /// <summary>
        /// Get directory size in bytes
        /// </summary>
        private long GetDirectorySize(string path)
        {
            try
            {
                var dirInfo = new DirectoryInfo(path);
                return dirInfo.EnumerateFiles("*", SearchOption.AllDirectories).Sum(file => file.Length);
            }
            catch
            {
                return 0;
            }
        }

        private void ShowGamesForLibrary(SteamLibrary library, List<SteamGame> games)
        {
            int scrollOffset = 0;
            int selectedIndex = 0;
            bool showingGames = true;
            string searchFilter = "";
            bool searchMode = false;
            
            // Calculate total library size
            double totalSizeGB = games.Sum(g => g.SizeInBytes) / (1024.0 * 1024.0 * 1024.0);
            
            while (showingGames)
            {
                // Filter games if search is active
                var displayGames = string.IsNullOrEmpty(searchFilter) ? games :
                    games.Where(g => g.Name.Contains(searchFilter, StringComparison.OrdinalIgnoreCase)).ToList();
                
                ModernConsole.Clear();
                
                // Clean title section
                ModernConsole.DrawTitle(2);
                string breadcrumb = $"Libraries > {library.Label ?? "Library"}";
                ModernConsole.WriteCentered(5, breadcrumb, ModernConsole.Colors.TextDim);
                
                // Library info with total size
                ModernConsole.WriteCentered(6, $"Path: {library.Path}", ModernConsole.Colors.TextDim);
                ModernConsole.WriteCentered(7, $"Games: {displayGames.Count} of {games.Count} | Total Size: {totalSizeGB:F1} GB", ModernConsole.Colors.Text);
                
                // Search bar
                if (searchMode)
                {
                    ModernConsole.WriteAt(ModernConsole.Width - 35, 8, "Search: ", ModernConsole.Colors.Warning);
                    ModernConsole.WriteAt(ModernConsole.Width - 27, 8, searchFilter.PadRight(20), ModernConsole.Colors.Accent);
                    ModernConsole.WriteAt(ModernConsole.Width - 7, 8, "[ESC]", ModernConsole.Colors.TextDim);
                }
                else if (!string.IsNullOrEmpty(searchFilter))
                {
                    ModernConsole.WriteAt(ModernConsole.Width - 35, 8, $"Filter: {searchFilter}", ModernConsole.Colors.AccentPurple);
                }
                
                ModernConsole.DrawHorizontalLine(10, 9, ModernConsole.Width - 20, ModernConsole.Colors.Border);
                
                // Column headers
                ModernConsole.WriteAt(2, 5, "#", ModernConsole.Colors.Accent);
                ModernConsole.WriteAt(6, 5, "Name", ModernConsole.Colors.Accent);
                ModernConsole.WriteAt(55, 5, "Size (GB)", ModernConsole.Colors.Accent);
                ModernConsole.WriteAt(68, 5, "App ID", ModernConsole.Colors.Accent);
                ModernConsole.DrawHorizontalLine(0, 6, ModernConsole.Width, ModernConsole.Colors.SurfaceLight);
                
                // Game list (15 visible rows to make room for headers)
                int visibleRows = 15;
                int startY = 7;
                
                for (int i = 0; i < Math.Min(visibleRows, displayGames.Count - scrollOffset); i++)
                {
                    int gameIndex = scrollOffset + i;
                    if (gameIndex >= displayGames.Count)
                        break;
                        
                    var game = displayGames[gameIndex];
                    bool isSelected = (gameIndex == selectedIndex);
                    
                    if (isSelected)
                    {
                        ModernConsole.FillBox(1, startY + i, ModernConsole.Width - 2, 1, ' ', ModernConsole.Colors.Text, ModernConsole.Colors.Info);
                    }
                    
                    string num = (gameIndex + 1).ToString().PadLeft(3);
                    string name = game.Name.Length > 45 ? game.Name.Substring(0, 42) + "..." : game.Name;
                    string sizeGB = game.SizeInBytes > 0 ? $"{(game.SizeInBytes / (1024.0 * 1024.0 * 1024.0)):F1}" : "--";
                    string appId = $"[{game.AppId}]";
                    
                    // Highlight matched text in search results
                    var nameColor = isSelected ? ModernConsole.Colors.Text : ModernConsole.Colors.TextDim;
                    if (!string.IsNullOrEmpty(searchFilter) && game.Name.Contains(searchFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        nameColor = isSelected ? ModernConsole.Colors.AccentLight : ModernConsole.Colors.AccentPurple;
                    }
                    
                    ModernConsole.WriteAt(2, startY + i, num, 
                        isSelected ? ModernConsole.Colors.AccentLight : ModernConsole.Colors.TextDim);
                    ModernConsole.WriteAt(6, startY + i, name, nameColor);
                    ModernConsole.WriteAt(55, startY + i, sizeGB.PadLeft(8), 
                        isSelected ? ModernConsole.Colors.Accent : ModernConsole.Colors.TextDim);
                    ModernConsole.WriteAt(68, startY + i, appId, 
                        isSelected ? ModernConsole.Colors.Accent : ModernConsole.Colors.SurfaceLight);
                }
                
                // Scroll indicators
                if (scrollOffset > 0)
                    ModernConsole.WriteAt(ModernConsole.Width - 2, startY, "▲", ModernConsole.Colors.AccentLight);
                if (scrollOffset + visibleRows < displayGames.Count)
                    ModernConsole.WriteAt(ModernConsole.Width - 2, startY + visibleRows - 1, "▼", ModernConsole.Colors.AccentLight);
                
                // Help
                ModernConsole.DrawHorizontalLine(0, 22, ModernConsole.Width, ModernConsole.Colors.SurfaceLight);
                string helpText = searchMode ? 
                    "Type to search | ESC: Exit search mode" :
                    "↑/↓: Navigate | /: Search | C: Clear filter | ESC: Back";
                ModernConsole.WriteCentered(23, helpText, ModernConsole.Colors.Text);
                
                ModernConsole.Render();
                
                var key = ModernConsole.WaitForKey();
                
                if (searchMode)
                {
                    // Handle search input
                    if (key.Key == ConsoleKey.Escape)
                    {
                        searchMode = false;
                        if (string.IsNullOrEmpty(searchFilter))
                        {
                            selectedIndex = 0;
                            scrollOffset = 0;
                        }
                    }
                    else if (key.Key == ConsoleKey.Backspace && searchFilter.Length > 0)
                    {
                        searchFilter = searchFilter.Substring(0, searchFilter.Length - 1);
                        selectedIndex = 0;
                        scrollOffset = 0;
                    }
                    else if (key.Key == ConsoleKey.Enter)
                    {
                        searchMode = false;
                    }
                    else if (char.IsLetterOrDigit(key.KeyChar) || key.KeyChar == ' ')
                    {
                        searchFilter += key.KeyChar;
                        selectedIndex = 0;
                        scrollOffset = 0;
                    }
                }
                else
                {
                    // Normal navigation
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
                            if (selectedIndex < displayGames.Count - 1)
                            {
                                selectedIndex++;
                                if (selectedIndex >= scrollOffset + visibleRows)
                                    scrollOffset = selectedIndex - visibleRows + 1;
                            }
                            break;
                        case ConsoleKey.Escape:
                            showingGames = false;
                            break;
                        case ConsoleKey.Divide:
                        case ConsoleKey.Oem2: // Forward slash
                            searchMode = true;
                            searchFilter = "";
                            break;
                        case ConsoleKey.C:
                            searchFilter = "";
                            selectedIndex = 0;
                            scrollOffset = 0;
                            break;
                    }
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
            
            ModernConsole.FillBox(boxX, boxY, boxWidth, boxHeight, ' ', ModernConsole.Colors.Text, ModernConsole.Colors.Background);
            ModernConsole.DrawBox(boxX, boxY, boxWidth, boxHeight, ModernConsole.Colors.AccentLight);
            
            ModernConsole.WriteCentered(boxY + 1, "LIBRARY DETAILS", ModernConsole.Colors.AccentLight);
            ModernConsole.DrawHorizontalLine(boxX + 1, boxY + 2, boxWidth - 2, ModernConsole.Colors.AccentLight);
            
            ModernConsole.WriteAt(boxX + 2, boxY + 3, $"Label: {library.Label ?? "N/A"}", ModernConsole.Colors.Text);
            ModernConsole.WriteAt(boxX + 2, boxY + 4, $"Path: {TruncatePath(library.Path, 45)}", ModernConsole.Colors.Text);
            
            // Check if path exists
            bool exists = Directory.Exists(library.Path);
            ModernConsole.WriteAt(boxX + 2, boxY + 5, $"Status: {(exists ? "Available" : "Not Found")}", 
                exists ? ModernConsole.Colors.Success : ModernConsole.Colors.Error);
            
            ModernConsole.DrawHorizontalLine(boxX + 1, boxY + 6, boxWidth - 2, ModernConsole.Colors.AccentLight);
            ModernConsole.WriteCentered(boxY + 7, "[ Press any key to close ]", ModernConsole.Colors.Text);
            
            ModernConsole.Render();
            ModernConsole.WaitForKey();
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
