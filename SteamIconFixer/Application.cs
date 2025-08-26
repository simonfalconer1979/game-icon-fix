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
        private string _statusColor = SVGAFormConsole.Colors.White;
        private DateTime _statusTime = DateTime.MinValue;

        public async Task Run()
        {
            // Form-based console doesn't need initialization here
            // It's initialized when the form is created
            
            // Show splash screen
            ShowSplashScreen();
            await Task.Delay(2000);

            // Initialize Steam detector
            _steamDetector = new SteamDetector();

            // Show main menu
            await ShowMainMenu();
        }

        private void ShowSplashScreen()
        {
            SVGAFormConsole.Clear();
            
            // Draw logo
            SVGAFormConsole.DrawLogo(15, 5);
            
            // Draw loading bar
            SVGAFormConsole.DrawBox(20, 16, 40, 3, UI.SVGAConsole.Colors.Cyan);
            SVGAFormConsole.WriteAt(22, 17, "Initializing...", UI.SVGAConsole.Colors.White);
            
            // Copyright
            SVGAFormConsole.WriteCentered(22, "(C) 2025 Steam Icon Fixer Team", UI.SVGAConsole.Colors.Gray40);
            SVGAFormConsole.WriteCentered(23, "Built with .NET 9 - SVGA Retro Mode", UI.SVGAConsole.Colors.Gray40);
            
            SVGAFormConsole.Render();
        }

        private async Task ShowMainMenu()
        {
            _currentMenu = new Menu("MAIN MENU");
            _currentMenu.AddItem("Detect Steam Installation", DetectSteam);
            _currentMenu.AddItem("Browse Steam Libraries", BrowseLibraries);
            _currentMenu.AddItem("Scan for Installed Games", ScanGames);
            _currentMenu.AddItem("Fix Icons on Desktop", FixDesktopIcons);
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
                SVGAFormConsole.Render();

                var key = SVGAFormConsole.WaitForKey();
                await menu.HandleKey(key);
            }
        }

        private void DrawScreen()
        {
            SVGAFormConsole.Clear();
            
            // Title bar
            SVGAFormConsole.FillBox(0, 0, SVGAFormConsole.Width, 1, ' ', UI.SVGAConsole.Colors.Blue);
            SVGAFormConsole.WriteCentered(0, "STEAM ICON FIXER v2.0", UI.SVGAConsole.Colors.Yellow);
            
            // Subtitle
            SVGAFormConsole.WriteCentered(2, "Fix Your Steam Desktop Icons", UI.SVGAConsole.Colors.Cyan);
            SVGAFormConsole.DrawHorizontalLine(0, 3, SVGAFormConsole.Width, UI.SVGAConsole.Colors.White);
        }

        private void DrawStatusBar()
        {
            // Status message area
            SVGAFormConsole.DrawHorizontalLine(0, SVGAFormConsole.Height - 7, SVGAFormConsole.Width, UI.SVGAConsole.Colors.White);
            
            // Show status message if recent
            if (!string.IsNullOrEmpty(_statusMessage) && (DateTime.Now - _statusTime).TotalSeconds < 5)
            {
                SVGAFormConsole.WriteCentered(SVGAFormConsole.Height - 6, _statusMessage, _statusColor);
            }
            
            // Help text
            SVGAFormConsole.DrawHorizontalLine(0, SVGAFormConsole.Height - 3, SVGAFormConsole.Width, UI.SVGAConsole.Colors.White);
            SVGAFormConsole.WriteCentered(SVGAFormConsole.Height - 2, "↑/↓: Navigate | ENTER: Select | ESC: Back | 1-5: Quick Select", UI.SVGAConsole.Colors.White);
        }

        private void SetStatus(string message, string? color = null)
        {
            _statusMessage = message;
            _statusColor = color ?? SVGAFormConsole.Colors.White;
            _statusTime = DateTime.Now;
        }

        private async Task DetectSteam()
        {
            SetStatus("Detecting Steam installation...", SVGAFormConsole.Colors.Cyan);
            DrawScreen();
            DrawStatusBar();
            SVGAFormConsole.Render();

            await Task.Delay(500);

            if (_steamDetector != null && _steamDetector.Detect())
            {
                ShowSteamInfo();
            }
            else
            {
                SetStatus("Steam not found! Please ensure Steam is installed.", SVGAFormConsole.Colors.Red);
            }
        }

        private void ShowSteamInfo()
        {
            SVGAFormConsole.Clear();
            DrawScreen();
            
            // Draw compact info box
            int boxX = 10, boxY = 6, boxWidth = 60, boxHeight = 10;
            SVGAFormConsole.DrawBox(boxX, boxY, boxWidth, boxHeight, SVGAFormConsole.Colors.Cyan);
            
            SVGAFormConsole.WriteCentered(boxY + 1, "STEAM INSTALLATION DETECTED", SVGAFormConsole.Colors.Lime);
            SVGAFormConsole.DrawHorizontalLine(boxX + 1, boxY + 2, boxWidth - 2, SVGAFormConsole.Colors.Cyan);
            
            // Display summary info
            SVGAFormConsole.WriteAt(boxX + 2, boxY + 4, $"Install Path: {TruncatePath(_steamDetector!.InstallPath, 50)}", SVGAFormConsole.Colors.White);
            SVGAFormConsole.WriteAt(boxX + 2, boxY + 5, $"User ID: {_steamDetector.UserId}", SVGAFormConsole.Colors.White);
            SVGAFormConsole.WriteAt(boxX + 2, boxY + 6, $"Libraries Found: {_steamDetector.Libraries.Count}", SVGAFormConsole.Colors.Lime);
            
            SVGAFormConsole.DrawHorizontalLine(boxX + 1, boxY + 7, boxWidth - 2, SVGAFormConsole.Colors.Cyan);
            SVGAFormConsole.WriteCentered(boxY + 8, "Use 'Browse Steam Libraries' for detailed view", SVGAFormConsole.Colors.Cyan);
            
            SVGAFormConsole.DrawHorizontalLine(boxX + 1, boxHeight + boxY - 2, boxWidth - 2, SVGAFormConsole.Colors.Cyan);
            SVGAFormConsole.WriteCentered(boxHeight + boxY - 1, "[ Press any key to continue ]", SVGAFormConsole.Colors.White);
            
            SVGAFormConsole.Render();
            SVGAFormConsole.WaitForKey();
            
            SetStatus($"Steam ready: {_steamDetector.Libraries.Count} libraries configured", SVGAFormConsole.Colors.Lime);
        }

        private async Task BrowseLibraries()
        {
            if (_steamDetector?.InstallPath == null)
            {
                SetStatus("Please detect Steam first!", SVGAFormConsole.Colors.Red);
                return;
            }

            var viewer = new LibraryViewer(_steamDetector);
            await viewer.Show();
            
            SetStatus("Library browser closed", SVGAFormConsole.Colors.Cyan);
        }

        private async Task ScanGames()
        {
            if (_steamDetector?.InstallPath == null)
            {
                SetStatus("Please detect Steam first!", SVGAFormConsole.Colors.Red);
                return;
            }

            SetStatus("Scanning for installed games...", SVGAFormConsole.Colors.Cyan);
            DrawScreen();
            DrawStatusBar();
            SVGAFormConsole.Render();

            await Task.Delay(500);
            
            var games = _steamDetector.GetInstalledGames();
            ShowGamesPopup(games);
        }

        private void ShowGamesPopup(List<SteamGame> games)
        {
            int scrollOffset = 0;
            int selectedIndex = 0;
            int visibleItems = 10;
            
            bool running = true;
            while (running)
            {
                SVGAFormConsole.Clear();
                DrawScreen();
                
                // Draw popup box
                int boxX = 10, boxY = 5, boxWidth = 60, boxHeight = 15;
                SVGAFormConsole.FillBox(boxX, boxY, boxWidth, boxHeight, ' ', SVGAFormConsole.Colors.Black);
                SVGAFormConsole.DrawBox(boxX, boxY, boxWidth, boxHeight, SVGAFormConsole.Colors.Cyan);
                
                SVGAFormConsole.WriteCentered(boxY + 1, $"INSTALLED GAMES ({games.Count} Total)", SVGAFormConsole.Colors.Magenta);
                SVGAFormConsole.DrawHorizontalLine(boxX + 1, boxY + 2, boxWidth - 2, SVGAFormConsole.Colors.Cyan);
                
                // Draw visible games
                int endIndex = Math.Min(scrollOffset + visibleItems, games.Count);
                for (int i = scrollOffset; i < endIndex; i++)
                {
                    int y = boxY + 3 + (i - scrollOffset);
                    var game = games[i];
                    bool isSelected = i == selectedIndex;
                    
                    string displayName = TruncatePath(game.Name, boxWidth - 8);
                    string prefix = isSelected ? "> " : "  ";
                    string color = isSelected ? SVGAFormConsole.Colors.Magenta : SVGAFormConsole.Colors.White;
                    
                    SVGAFormConsole.WriteAt(boxX + 2, y, prefix + displayName, color);
                }
                
                // Scroll indicators
                if (scrollOffset > 0)
                    SVGAFormConsole.WriteAt(boxX + boxWidth - 3, boxY + 3, "^", SVGAFormConsole.Colors.Cyan);
                if (scrollOffset + visibleItems < games.Count)
                    SVGAFormConsole.WriteAt(boxX + boxWidth - 3, boxY + boxHeight - 3, "v", SVGAFormConsole.Colors.Cyan);
                
                // Help text
                SVGAFormConsole.DrawHorizontalLine(boxX + 1, boxY + boxHeight - 2, boxWidth - 2, SVGAFormConsole.Colors.Cyan);
                SVGAFormConsole.WriteCentered(boxY + boxHeight - 1, "↑/↓: Scroll | ESC: Close", SVGAFormConsole.Colors.White);
                
                SVGAFormConsole.Render();
                
                var key = SVGAFormConsole.WaitForKey();
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
            
            SetStatus($"Found {games.Count} installed games", SVGAFormConsole.Colors.Lime);
        }

        private async Task FixDesktopIcons()
        {
            if (_steamDetector?.InstallPath == null)
            {
                SetStatus("Please detect Steam first!", SVGAFormConsole.Colors.Red);
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
            SetStatus($"Processing shortcuts with {cdn} CDN...", SVGAFormConsole.Colors.Cyan);
            DrawScreen();
            DrawStatusBar();
            SVGAFormConsole.Render();

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

            // Process shortcuts
            var results = await _iconProcessor.ProcessShortcuts(directories.ToArray());
            
            // Show results
            ShowProcessResults(results);
            
            // Flush icon cache if any were fixed
            if (results.Any(r => r.Success && r.Message == "Icon downloaded successfully"))
            {
                SetStatus("Flushing Windows icon cache...", SVGAFormConsole.Colors.Cyan);
                DrawScreen();
                DrawStatusBar();
                SVGAFormConsole.Render();
                
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
            
            SVGAFormConsole.Clear();
            DrawScreen();
            
            // Draw results box
            int boxX = 15, boxY = 7, boxWidth = 50, boxHeight = 10;
            SVGAFormConsole.DrawBox(boxX, boxY, boxWidth, boxHeight, SVGAFormConsole.Colors.Lime);
            
            SVGAFormConsole.WriteCentered(boxY + 1, "PROCESSING COMPLETE", SVGAFormConsole.Colors.Lime);
            SVGAFormConsole.DrawHorizontalLine(boxX + 1, boxY + 2, boxWidth - 2, SVGAFormConsole.Colors.Lime);
            
            SVGAFormConsole.WriteAt(boxX + 2, boxY + 4, $"Total shortcuts processed: {results.Count}", SVGAFormConsole.Colors.White);
            SVGAFormConsole.WriteAt(boxX + 2, boxY + 5, $"Newly fixed: {newlyFixed}", SVGAFormConsole.Colors.Lime);
            SVGAFormConsole.WriteAt(boxX + 2, boxY + 6, $"Already OK: {alreadyOk}", SVGAFormConsole.Colors.Cyan);
            SVGAFormConsole.WriteAt(boxX + 2, boxY + 7, $"Failed: {failed}", failed > 0 ? SVGAFormConsole.Colors.Red : SVGAFormConsole.Colors.White);
            
            SVGAFormConsole.DrawHorizontalLine(boxX + 1, boxHeight + boxY - 2, boxWidth - 2, SVGAFormConsole.Colors.Lime);
            SVGAFormConsole.WriteCentered(boxHeight + boxY - 1, "[ Press any key to continue ]", SVGAFormConsole.Colors.White);
            
            SVGAFormConsole.Render();
            SVGAFormConsole.WaitForKey();
            
            string statusMsg = newlyFixed > 0 
                ? $"Successfully fixed {newlyFixed} icons!" 
                : "All icons are already up to date!";
            SetStatus(statusMsg, SVGAFormConsole.Colors.Lime);
        }

        private async Task ShowConfiguration()
        {
            var configMenu = new Menu("CONFIGURATION");
            configMenu.AddItem("Flush Icon Cache", async () => 
            {
                SetStatus("Flushing Windows icon cache...", SVGAFormConsole.Colors.Cyan);
                IconProcessor.FlushIconCache();
                await Task.Delay(1000);
                SetStatus("Icon cache flushed!", SVGAFormConsole.Colors.Lime);
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
            SVGAFormConsole.Clear();
            SVGAFormConsole.WriteCentered(10, "Thank you for using Steam Icon Fixer!", SVGAFormConsole.Colors.Cyan);
            SVGAFormConsole.WriteCentered(12, "Goodbye!", SVGAFormConsole.Colors.White);
            SVGAFormConsole.Render();
            
            await Task.Delay(1500);
            
            // Clear screen before exiting to DOS prompt
            SVGAFormConsole.CleanupForExit();
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

