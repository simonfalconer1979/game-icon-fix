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
            
            // Automatically detect Steam on startup
            ModernConsole.Clear();
            ModernConsole.DrawTitle(2);
            ModernConsole.WriteCentered(10, "Detecting Steam installation...", ModernConsole.Colors.Info);
            ModernConsole.Render();
            
            if (_steamDetector.Detect())
            {
                _steamDetected = true;
                _librariesScanned = true; // Libraries are scanned during detection
                
                // Automatically scan for games
                ModernConsole.WriteCentered(12, "Scanning for installed games...", ModernConsole.Colors.Info);
                ModernConsole.Render();
                
                var games = _steamDetector.GetInstalledGames();
                _detectedGamesCount = games.Count;
                _gamesScanned = true;
                
                ModernConsole.WriteCentered(14, $"Found {_detectedGamesCount} installed games!", ModernConsole.Colors.Success);
                ModernConsole.Render();
                await Task.Delay(1000);
            }
            else
            {
                ModernConsole.WriteCentered(12, "Steam not detected. Please ensure Steam is installed.", ModernConsole.Colors.Warning);
                ModernConsole.Render();
                await Task.Delay(2000);
            }

            // Show main menu
            await ShowMainMenu();
        }


        private async Task ShowMainMenu()
        {
            _currentMenu = new Menu("MAIN MENU");
            
            // Main actions - always visible
            _currentMenu.AddItem("Fix Desktop Icons", FixDesktopIcons);
            _currentMenu.AddItem("Browse Steam Libraries", BrowseLibraries);
            
            // Utilities and exit
            _currentMenu.AddItem("Rescan Steam", RescanSteam);
            _currentMenu.AddItem("Utilities", ShowUtilities);
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
            if (_steamDetected)
            {
                ModernConsole.WriteAt(2, ModernConsole.Height - 4, $"Steam: ✓ | Games: {_detectedGamesCount} installed", ModernConsole.Colors.TextDim);
            }
            else
            {
                ModernConsole.WriteAt(2, ModernConsole.Height - 4, "Steam: Not detected", ModernConsole.Colors.Warning);
            }
            
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

        private async Task RescanSteam()
        {
            ModernConsole.Clear();
            ModernConsole.DrawTitle(2);
            ModernConsole.WriteCentered(10, "Rescanning Steam installation...", ModernConsole.Colors.Info);
            ModernConsole.Render();
            
            if (_steamDetector != null && _steamDetector.Detect())
            {
                _steamDetected = true;
                _librariesScanned = true;
                
                ModernConsole.WriteCentered(12, "Scanning for installed games...", ModernConsole.Colors.Info);
                ModernConsole.Render();
                
                var games = _steamDetector.GetInstalledGames();
                _detectedGamesCount = games.Count;
                _gamesScanned = true;
                
                ModernConsole.WriteCentered(14, $"Found {_detectedGamesCount} installed games!", ModernConsole.Colors.Success);
                ModernConsole.Render();
                await Task.Delay(1500);
                
                SetStatus($"Rescan complete: {_detectedGamesCount} games found", ModernConsole.Colors.Success);
            }
            else
            {
                _steamDetected = false;
                ModernConsole.WriteCentered(12, "Steam not detected. Please ensure Steam is installed.", ModernConsole.Colors.Warning);
                ModernConsole.Render();
                await Task.Delay(2000);
                SetStatus("Steam not found!", ModernConsole.Colors.Error);
            }
        }

        private async Task BrowseLibraries()
        {
            if (!_steamDetected || _steamDetector?.InstallPath == null)
            {
                SetStatus("Steam not detected. Scanning now...", ModernConsole.Colors.Warning);
                await RescanSteam();
                
                if (!_steamDetected)
                {
                    return;
                }
            }

            var viewer = new LibraryViewer(_steamDetector!);
            await viewer.Show();
            await ShowMainMenu();
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
            
            // Get desktop path and Steam games directory
            string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            string steamGamesDir = Path.Combine(_steamDetector.InstallPath, "steam", "games");
            
            // Get all installed games
            var games = _steamDetector.GetInstalledGames();
            
            // Step 1: Delete all existing Steam shortcuts from desktop
            DrawScreen();
            ModernConsole.WriteCentered(10, "Step 1: Removing old Steam shortcuts...", ModernConsole.Colors.Info);
            ModernConsole.Render();
            
            var deletedShortcuts = IconProcessor.DeleteSteamShortcuts(desktopPath);
            await Task.Delay(500);
            
            ModernConsole.WriteCentered(11, $"Removed {deletedShortcuts.Count} old shortcuts", ModernConsole.Colors.Success);
            ModernConsole.Render();
            await Task.Delay(1000);
            
            // Step 2: Download fresh icons for all games
            bool processing = true;
            int currentProgress = 0;
            
            var progressTask = Task.Run(async () =>
            {
                while (processing)
                {
                    DrawScreen();
                    ModernConsole.WriteCentered(10, "Step 2: Downloading fresh icons from Steam CDN...", ModernConsole.Colors.Info);
                    ModernConsole.DrawAnimatedLoadingBar(20, 12, 60, $"Downloading from {cdn} CDN...");
                    ModernConsole.WriteCentered(15, $"Progress: {currentProgress}%", ModernConsole.Colors.Text);
                    DrawStatusBar();
                    ModernConsole.Render();
                    await Task.Delay(50);
                }
            });

            // Download icons with progress callback
            var results = await _iconProcessor.DownloadIconsForGames(
                games,
                (completed, total) =>
                {
                    currentProgress = total > 0 ? (completed * 100 / total) : 0;
                });

            processing = false;
            await progressTask;
            
            // Step 3: Create new shortcuts with downloaded icons
            DrawScreen();
            ModernConsole.WriteCentered(10, "Step 3: Creating new shortcuts with fresh icons...", ModernConsole.Colors.Info);
            ModernConsole.Render();
            
            int shortcutsCreated = 0;
            foreach (var game in games)
            {
                try
                {
                    IconProcessor.CreateDesktopShortcut(game, desktopPath, steamGamesDir);
                    shortcutsCreated++;
                }
                catch { }
            }
            
            await Task.Delay(500);
            ModernConsole.WriteCentered(11, $"Created {shortcutsCreated} new shortcuts", ModernConsole.Colors.Success);
            ModernConsole.Render();
            await Task.Delay(1000);
            
            // Show results
            ShowProcessResults(results);
            
            // Step 4: Flush icon cache to ensure Windows uses new icons
            if (results.Any(r => r.Success))
            {
                SetStatus("Step 4: Refreshing Windows icon cache...", ModernConsole.Colors.AccentCyan);
                DrawScreen();
                DrawStatusBar();
                ModernConsole.Render();
                
                IconProcessor.FlushIconCache();
                await Task.Delay(2000);
                
                SetStatus("All shortcuts recreated with fresh icons!", ModernConsole.Colors.Success);
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

        private async Task ShowUtilities()
        {
            var utilMenu = new Menu("UTILITIES");
            utilMenu.AddItem("Flush Icon Cache (Restarts Explorer)", async () => 
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
            utilMenu.AddItem("Back to Main Menu", () => 
            {
                utilMenu.IsActive = false;
                return Task.CompletedTask;
            });
            
            await RunMenu(utilMenu);
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

