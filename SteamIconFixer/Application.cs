using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using SteamIconFixer.Core;
using SteamIconFixer.UI;

namespace SteamIconFixer
{
    /// <summary>
    /// Main application controller
    /// </summary>
    public class Application
    {
        private SteamDetector? _steamDetector;
        private IconProcessor? _iconProcessor;
        private Menu? _currentMenu;
        private string _statusMessage = "";
        private Color _statusColor = ModernConsole.Colors.Text;
        private DateTime _statusTime = DateTime.MinValue;

        // State tracking
        private bool _steamDetected = false;
        private bool _librariesScanned = false;
        private bool _gamesScanned = false;
        private int _detectedGamesCount = 0;

        public async Task Run()
        {
            // Initialize Steam detector
            _steamDetector = new SteamDetector();

            // Show main menu directly
            await ShowMainMenu();
        }


        private async Task ShowMainMenu()
        {
            _currentMenu = new Menu("MAIN MENU");
            
            // Always available
            _currentMenu.AddItem($"Detect Steam Installation {(_steamDetected ? "✓" : "")}", DetectSteam);
            
            // Only after Steam detection
            if (_steamDetected)
            {
                _currentMenu.AddItem($"Browse Steam Libraries {(_librariesScanned ? "✓" : "")}", BrowseLibraries);
                _currentMenu.AddItem($"Scan for Installed Games {(_gamesScanned ? $"✓ ({_detectedGamesCount})" : "")}", ScanGames);
            }

            // Only after scanning games
            if (_gamesScanned)
            {
                _currentMenu.AddItem("Fix Icons on Desktop", FixDesktopIcons);
            }

            _currentMenu.AddItem("Configuration", ShowConfiguration);
            _currentMenu.AddItem("Exit", Exit);

            await RunMenu(_currentMenu);
        }

        private async Task RunMenu(Menu menu)
        {
            while (menu.IsActive)
            {
                DrawScreen();
                menu.Draw();
                DrawStatusBar();
                ModernConsole.Render();

                var key = ModernConsole.WaitForKey();
                await menu.HandleKey(key);
            }
        }

        private void DrawScreen()
        {
            ModernConsole.Clear();
            
            // Clean title section
            ModernConsole.DrawTitle(2);
        }

        private void DrawStatusBar()
        {
            // Draw system state
            ModernConsole.WriteAt(2, ModernConsole.Height - 4, $"Steam: {(_steamDetected ? "✓" : "✗")} | Libraries: {(_librariesScanned ? "✓" : "✗")} | Games: {(_gamesScanned ? $"✓ ({_detectedGamesCount})" : "✗")}", ModernConsole.Colors.TextDim);
            
            // Show status message if recent
            if (!string.IsNullOrEmpty(_statusMessage) && (DateTime.Now - _statusTime).TotalSeconds < 5)
            {
                ModernConsole.DrawStatusMessage(ModernConsole.Height - 3, _statusMessage, _statusColor);
            }
            
            // Help text
            ModernConsole.WriteCentered(ModernConsole.Height - 1, "↑/↓: Navigate | ENTER: Select | ESC: Back", ModernConsole.Colors.TextDim);
        }

        private void SetStatus(string message, Color? color = null)
        {
            _statusMessage = message;
            _statusColor = color ?? ModernConsole.Colors.Text;
            _statusTime = DateTime.Now;
        }

        private async Task DetectSteam()
        {
            if (_steamDetector != null && _steamDetector.Detect())
            {
                _steamDetected = true;
                ShowSteamInfo();
                // Force menu refresh to show new options
                await ShowMainMenu();
            }
            else
            {
                _steamDetected = false;
                SetStatus("Steam not found! Please ensure Steam is installed.", ModernConsole.Colors.Error);
            }
        }

        private void ShowSteamInfo()
        {
            ModernConsole.Clear();
            DrawScreen();
            
            // Draw compact info box
            int boxX = 20, boxY = 8, boxWidth = 80, boxHeight = 10;
            ModernConsole.FillBox(boxX, boxY, boxWidth, boxHeight, ' ', ModernConsole.Colors.Text, ModernConsole.Colors.Surface);
            ModernConsole.DrawBox(boxX, boxY, boxWidth, boxHeight, ModernConsole.Colors.Border);
            
            ModernConsole.WriteCentered(boxY + 2, "STEAM INSTALLATION DETECTED", ModernConsole.Colors.Success);
            ModernConsole.DrawHorizontalLine(boxX + 2, boxY + 3, boxWidth - 4, ModernConsole.Colors.Border);
            
            // Display summary info
            ModernConsole.WriteAt(boxX + 4, boxY + 5, $"Install Path: {TruncatePath(_steamDetector!.InstallPath, 60)}", ModernConsole.Colors.Text);
            ModernConsole.WriteAt(boxX + 4, boxY + 6, $"User ID: {_steamDetector.UserId}", ModernConsole.Colors.Text);
            ModernConsole.WriteAt(boxX + 4, boxY + 7, $"Libraries Found: {_steamDetector.Libraries.Count}", ModernConsole.Colors.Success);
            
            ModernConsole.WriteCentered(boxY + 8, "[ Press any key to continue ]", ModernConsole.Colors.TextDim);
            
            ModernConsole.Render();
            ModernConsole.WaitForKey();
            
            SetStatus($"Steam ready: {_steamDetector.Libraries.Count} libraries configured", ModernConsole.Colors.Success);
        }

        private async Task BrowseLibraries()
        {
            if (!_steamDetected)
            {
                SetStatus("Please detect Steam first!", ModernConsole.Colors.Error);
                return;
            }

            if (_steamDetector?.InstallPath == null)
            {
                SetStatus("Steam installation is invalid. Please detect Steam again.", ModernConsole.Colors.Error);
                return;
            }

            var viewer = new LibraryViewer(_steamDetector);
            await viewer.Show();
            
            _librariesScanned = true;
            SetStatus("Libraries scanned successfully", ModernConsole.Colors.Success);
            await ShowMainMenu();
        }

        private async Task ScanGames()
        {
            if (!_steamDetected)
            {
                SetStatus("Please detect Steam first!", ModernConsole.Colors.Error);
                return;
            }

            if (!_librariesScanned)
            {
                SetStatus("Please browse libraries first!", ModernConsole.Colors.Warning);
                return;
            }
            
            var games = _steamDetector!.GetInstalledGames();
            _detectedGamesCount = games.Count;
            _gamesScanned = true;
            
            ShowGamesPopup(games);
            await ShowMainMenu();
        }

        private void ShowGamesPopup(List<SteamGame> games)
        {
            int scrollOffset = 0;
            int selectedIndex = 0;
            int visibleItems = 10;
            
            bool running = true;
            while (running)
            {
                ModernConsole.Clear();
                DrawScreen();
                
                // Draw popup box
                int boxX = 10, boxY = 5, boxWidth = 60, boxHeight = 15;
                ModernConsole.FillBox(boxX, boxY, boxWidth, boxHeight, ' ', ModernConsole.Colors.Text, ModernConsole.Colors.Background);
                ModernConsole.DrawBox(boxX, boxY, boxWidth, boxHeight, ModernConsole.Colors.AccentCyan);
                
                ModernConsole.WriteCentered(boxY + 1, $"INSTALLED GAMES ({games.Count} Total)", ModernConsole.Colors.AccentPurple);
                ModernConsole.DrawHorizontalLine(boxX + 1, boxY + 2, boxWidth - 2, ModernConsole.Colors.AccentCyan);
                
                // Draw visible games
                int endIndex = Math.Min(scrollOffset + visibleItems, games.Count);
                for (int i = scrollOffset; i < endIndex; i++)
                {
                    int y = boxY + 3 + (i - scrollOffset);
                    var game = games[i];
                    bool isSelected = i == selectedIndex;
                    
                    string displayName = TruncatePath(game.Name, boxWidth - 8);
                    string prefix = isSelected ? "> " : "  ";
                    var color = isSelected ? ModernConsole.Colors.AccentPurple : ModernConsole.Colors.Text;
                    
                    ModernConsole.WriteAt(boxX + 2, y, prefix + displayName, color);
                }
                
                // Scroll indicators
                if (scrollOffset > 0)
                    ModernConsole.WriteAt(boxX + boxWidth - 3, boxY + 3, "^", ModernConsole.Colors.AccentCyan);
                if (scrollOffset + visibleItems < games.Count)
                    ModernConsole.WriteAt(boxX + boxWidth - 3, boxY + boxHeight - 3, "v", ModernConsole.Colors.AccentCyan);
                
                // Help text
                ModernConsole.DrawHorizontalLine(boxX + 1, boxY + boxHeight - 2, boxWidth - 2, ModernConsole.Colors.AccentCyan);
                ModernConsole.WriteCentered(boxY + boxHeight - 1, "↑/↓: Scroll | ESC: Close", ModernConsole.Colors.Text);
                
                ModernConsole.Render();
                
                var key = ModernConsole.WaitForKey();
                switch (key.Key)
                {
                    case ConsoleKey.Escape:
                        running = false;
                        break;
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
                            if (selectedIndex >= scrollOffset + visibleItems)
                                scrollOffset = selectedIndex - visibleItems + 1;
                        }
                        break;
                }
            }
            
            SetStatus($"Found {games.Count} installed games", ModernConsole.Colors.Success);
        }

        private async Task FixDesktopIcons()
        {
            if (!_steamDetected || !_librariesScanned || !_gamesScanned)
            {
                SetStatus("Please complete Steam detection and game scanning first!", ModernConsole.Colors.Error);
                return;
            }

            // Show CDN selection
            var cdnMenu = new Menu("SELECT CDN PROVIDER");
            IconProcessor.CDNProvider selectedCdn = IconProcessor.CDNProvider.Akamai;
            
            cdnMenu.AddItem("Akamai (Recommended)", () => 
            {
                selectedCdn = IconProcessor.CDNProvider.Akamai;
                cdnMenu.IsActive = false;
                return Task.CompletedTask;
            });
            
            cdnMenu.AddItem("Cloudflare", () => 
            {
                selectedCdn = IconProcessor.CDNProvider.Cloudflare;
                cdnMenu.IsActive = false;
                return Task.CompletedTask;
            });
            
            cdnMenu.AddItem("Cancel", () => 
            {
                cdnMenu.IsActive = false;
                return Task.CompletedTask;
            });

            await RunMenu(cdnMenu);
            
            if (!cdnMenu.IsActive) // CDN was selected
            {
                await ProcessIcons(selectedCdn);
            }
        }

        private async Task ProcessIcons(IconProcessor.CDNProvider cdn)
        {
            // Initialize icon processor
            _iconProcessor = new IconProcessor(_steamDetector!.InstallPath, cdn);
            
            // Get directories to scan
            var directories = new List<string>();
            
            // Desktop
            string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            directories.Add(desktopPath);
            
            // Start Menu Steam folder
            string startMenuPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                @"Microsoft\Windows\Start Menu\Programs\Steam"
            );
            if (Directory.Exists(startMenuPath))
                directories.Add(startMenuPath);

            // Ensure all installed games have a desktop shortcut
            var games = _steamDetector.GetInstalledGames();
            foreach (var game in games)
            {
                IconProcessor.EnsureDesktopShortcut(game, desktopPath);
            }

            // Process shortcuts with progress display
            bool processing = true;
            int currentProgress = 0;
            int totalProgress = 100;
            
            var progressTask = Task.Run(async () =>
            {
                while (processing)
                {
                    DrawScreen();
                    ModernConsole.DrawAnimatedLoadingBar(20, 12, 60, $"Downloading Icons from {cdn} CDN...");
                    // Show progress percentage
                    ModernConsole.WriteCentered(15, $"Progress: {currentProgress}%", ModernConsole.Colors.Text);
                    DrawStatusBar();
                    ModernConsole.Render();
                    await Task.Delay(50);
                }
            });

            // Process shortcuts with progress callback
            var results = await _iconProcessor.ProcessShortcutsWithProgress(
                directories.ToArray(),
                (completed, total) =>
                {
                    currentProgress = total > 0 ? (completed * 100 / total) : 0;
                });

            processing = false;
            await progressTask;
            
            // Show results
            ShowProcessResults(results);
            
            // Flush icon cache if any were fixed
            if (results.Any(r => r.Success && r.Message == "Icon downloaded successfully"))
            {
                SetStatus("Flushing Windows icon cache...", ModernConsole.Colors.AccentCyan);
                DrawScreen();
                DrawStatusBar();
                ModernConsole.Render();
                
                IconProcessor.FlushIconCache();
                await Task.Delay(1000);
            }
        }

        private void ShowProcessResults(List<IconProcessor.ProcessResult> results)
        {
            int successful = results.Count(r => r.Success);
            int failed = results.Count(r => !r.Success);
            int alreadyOk = results.Count(r => r.Success && r.Message == "Icon already exists");
            int newlyFixed = results.Count(r => r.Success && r.Message == "Icon downloaded successfully");
            
            ModernConsole.Clear();
            DrawScreen();
            
            // Draw results box
            int boxX = 15, boxY = 7, boxWidth = 50, boxHeight = 10;
            ModernConsole.DrawBox(boxX, boxY, boxWidth, boxHeight, ModernConsole.Colors.Success);
            
            ModernConsole.WriteCentered(boxY + 1, "PROCESSING COMPLETE", ModernConsole.Colors.Success);
            ModernConsole.DrawHorizontalLine(boxX + 1, boxY + 2, boxWidth - 2, ModernConsole.Colors.Success);
            
            ModernConsole.WriteAt(boxX + 2, boxY + 4, $"Total shortcuts processed: {results.Count}", ModernConsole.Colors.Text);
            ModernConsole.WriteAt(boxX + 2, boxY + 5, $"Newly fixed: {newlyFixed}", ModernConsole.Colors.Success);
            ModernConsole.WriteAt(boxX + 2, boxY + 6, $"Already OK: {alreadyOk}", ModernConsole.Colors.AccentCyan);
            ModernConsole.WriteAt(boxX + 2, boxY + 7, $"Failed: {failed}", failed > 0 ? ModernConsole.Colors.Error : ModernConsole.Colors.Text);
            
            ModernConsole.DrawHorizontalLine(boxX + 1, boxHeight + boxY - 2, boxWidth - 2, ModernConsole.Colors.Success);
            ModernConsole.WriteCentered(boxHeight + boxY - 1, "[ Press any key to continue ]", ModernConsole.Colors.Text);
            
            ModernConsole.Render();
            ModernConsole.WaitForKey();
            
            string statusMsg = newlyFixed > 0 
                ? $"Successfully fixed {newlyFixed} icons!" 
                : "All icons are already up to date!";
            SetStatus(statusMsg, ModernConsole.Colors.Success);
        }

        private async Task ShowConfiguration()
        {
            var configMenu = new Menu("CONFIGURATION");
            configMenu.AddItem("Flush Icon Cache (Restarts Explorer)", async () => 
            {
                // Show confirmation dialog
                bool confirmed = ModernConsole.ShowConfirmDialog(
                    "⚠ FLUSH ICON CACHE",
                    "This will restart Windows Explorer. Continue?"
                );
                
                if (confirmed)
                {
                    SetStatus("Flushing Windows icon cache...", ModernConsole.Colors.AccentCyan);
                    IconProcessor.FlushIconCache();
                    await Task.Delay(1000);
                    SetStatus("Icon cache flushed!", ModernConsole.Colors.Success);
                }
                else
                {
                    SetStatus("Icon cache flush cancelled.", ModernConsole.Colors.Warning);
                }
            });
            configMenu.AddItem("Back to Main Menu", () => 
            {
                configMenu.IsActive = false;
                return Task.CompletedTask;
            });
            
            await RunMenu(configMenu);
        }


        private async Task Exit()
        {
            // Show goodbye message
            ModernConsole.Clear();
            ModernConsole.WriteCentered(10, "Thank you for using Steam Icon Fixer!", ModernConsole.Colors.AccentCyan);
            ModernConsole.WriteCentered(12, "Goodbye!", ModernConsole.Colors.Text);
            ModernConsole.Render();
            
            await Task.Delay(1500);
            
            // Clear screen before exiting to DOS prompt
            ModernConsole.CleanupForExit();
            Environment.Exit(0);
        }

        private string TruncatePath(string path, int maxLength)
        {
            if (path.Length <= maxLength)
                return path;
            return path.Substring(0, maxLength - 3) + "...";
        }
    }
}

