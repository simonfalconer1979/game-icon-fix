using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace SteamIconFixer.Core
{
    /// <summary>
    /// Processes Steam shortcuts and downloads missing icons
    /// Using the C++ methodology for maximum compatibility
    /// </summary>
    public class IconProcessor
    {
        private readonly string _steamPath;
        private readonly string _steamGamesDir;
        private readonly HttpClient _httpClient;
        private readonly CDNProvider _cdnProvider;

        public enum CDNProvider
        {
            Akamai,
            Cloudflare
        }

        public class ProcessResult
        {
            public string Path { get; set; } = string.Empty;
            public bool Success { get; set; }
            public string Message { get; set; } = string.Empty;
            public string AppId { get; set; } = string.Empty;
        }

        public IconProcessor(string steamPath, CDNProvider cdnProvider = CDNProvider.Akamai)
        {
            _steamPath = steamPath;
            _steamGamesDir = Path.Combine(steamPath, "steam", "games");
            _cdnProvider = cdnProvider;
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "SteamIconFixer/2.0");
        }

        /// <summary>
        /// Download icons for specific games
        /// </summary>
        public async Task<List<ProcessResult>> DownloadIconsForGames(List<SteamGame> games, Action<int, int>? progressCallback = null)
        {
            var results = new List<ProcessResult>();
            int completed = 0;
            int total = games.Count;
            
            // Ensure games directory exists
            Directory.CreateDirectory(_steamGamesDir);
            
            // Process games in parallel batches
            const int maxConcurrency = 5;
            var semaphore = new System.Threading.SemaphoreSlim(maxConcurrency);
            
            var tasks = games.Select(async game =>
            {
                await semaphore.WaitAsync();
                try
                {
                    var result = await DownloadIconForGame(game);
                    System.Threading.Interlocked.Increment(ref completed);
                    progressCallback?.Invoke(completed, total);
                    return result;
                }
                finally
                {
                    semaphore.Release();
                }
            }).ToArray();

            results.AddRange(await Task.WhenAll(tasks));
            return results;
        }

        /// <summary>
        /// Download icon for a specific game
        /// </summary>
        private async Task<ProcessResult> DownloadIconForGame(SteamGame game)
        {
            string appId = game.AppId;
            string iconFileName = $"{appId}_icon.ico";
            string localIconPath = Path.Combine(_steamGamesDir, iconFileName);

            // Check if icon already exists and delete it to force re-download
            if (File.Exists(localIconPath))
            {
                try
                {
                    File.Delete(localIconPath);
                }
                catch { }
            }

            // Try multiple CDN endpoints and icon variations
            string[] iconUrls = new[]
            {
                // Primary CDN URLs with standard icon name
                $"https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{appId}/{appId}_icon.ico",
                $"https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/{appId}/{appId}_icon.ico",
                $"http://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{appId}/{appId}_icon.ico",
                $"http://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/{appId}/{appId}_icon.ico",
                
                // Alternative icon names
                $"https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{appId}/icon.ico",
                $"https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/{appId}/icon.ico",
                
                // Legacy CDN
                $"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/{appId}/{appId}_icon.ico",
                
                // Try JPG/PNG if ICO fails
                $"https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{appId}/{appId}_icon.jpg",
                $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg",
                $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/capsule_sm_120.jpg"
            };

            bool downloaded = false;
            foreach (var iconUrl in iconUrls)
            {
                if (await DownloadIcon(iconUrl, localIconPath))
                {
                    downloaded = true;
                    break;
                }
            }

            if (downloaded)
            {
                return new ProcessResult
                {
                    Path = game.Name,
                    Success = true,
                    Message = "Icon downloaded successfully",
                    AppId = appId
                };
            }
            else
            {
                return new ProcessResult
                {
                    Path = game.Name,
                    Success = false,
                    Message = "Failed to download icon from CDN",
                    AppId = appId
                };
            }
        }

        /// <summary>
        /// Process all shortcuts in given directories with parallel downloads
        /// </summary>
        public async Task<List<ProcessResult>> ProcessShortcuts(params string[] directories)
        {
            var results = new List<ProcessResult>();
            var urlFiles = new List<string>();

            // Collect all .url files
            foreach (var dir in directories)
            {
                urlFiles.AddRange(GetUrlFiles(dir));
            }

            // Process files in parallel batches (max 5 concurrent downloads)
            const int maxConcurrency = 5;
            var semaphore = new System.Threading.SemaphoreSlim(maxConcurrency);
            
            var tasks = urlFiles.Select(async file =>
            {
                await semaphore.WaitAsync();
                try
                {
                    return await ProcessShortcut(file);
                }
                finally
                {
                    semaphore.Release();
                }
            }).ToArray();

            results.AddRange(await Task.WhenAll(tasks));

            return results;
        }

        /// <summary>
        /// Process shortcuts with progress callback
        /// </summary>
        public async Task<List<ProcessResult>> ProcessShortcutsWithProgress(
            string[] directories,
            Action<int, int>? progressCallback = null)
        {
            var results = new List<ProcessResult>();
            var urlFiles = new List<string>();

            // Collect all .url files
            foreach (var dir in directories)
            {
                urlFiles.AddRange(GetUrlFiles(dir));
            }

            int completed = 0;
            int total = urlFiles.Count;
            
            // Process files in parallel batches
            const int maxConcurrency = 5;
            var semaphore = new System.Threading.SemaphoreSlim(maxConcurrency);
            
            var tasks = urlFiles.Select(async file =>
            {
                await semaphore.WaitAsync();
                try
                {
                    var result = await ProcessShortcut(file);
                    System.Threading.Interlocked.Increment(ref completed);
                    progressCallback?.Invoke(completed, total);
                    return result;
                }
                finally
                {
                    semaphore.Release();
                }
            }).ToArray();

            results.AddRange(await Task.WhenAll(tasks));

            return results;
        }

        /// <summary>
        /// Get all .url files in a directory
        /// </summary>
        private List<string> GetUrlFiles(string directory)
        {
            var urlFiles = new List<string>();

            try
            {
                if (Directory.Exists(directory))
                {
                    urlFiles.AddRange(Directory.GetFiles(directory, "*.url", SearchOption.TopDirectoryOnly));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to read directory {directory}: {ex.Message}");
            }

            return urlFiles;
        }

        /// <summary>
        /// Process a single .url shortcut file (using C++ methodology)
        /// </summary>
        private async Task<ProcessResult> ProcessShortcut(string filePath)
        {
            try
            {
                // Read the .url file content
                string content = File.ReadAllText(filePath);

                // Parse INI-style .url file using Windows API
                string url = GetPrivateProfileString("InternetShortcut", "URL", filePath);
                string iconFile = GetPrivateProfileString("InternetShortcut", "IconFile", filePath);

                // Check if it's a Steam shortcut
                if (string.IsNullOrEmpty(url) || !url.StartsWith("steam://"))
                {
                    return new ProcessResult
                    {
                        Path = filePath,
                        Success = false,
                        Message = "Not a Steam shortcut"
                    };
                }

                // Extract app ID from URL (steam://rungameid/12345)
                var appIdMatch = Regex.Match(url, @"/(\d+)$");
                if (!appIdMatch.Success)
                {
                    return new ProcessResult
                    {
                        Path = filePath,
                        Success = false,
                        Message = "Invalid Steam URL format"
                    };
                }

                string appId = appIdMatch.Groups[1].Value;

                // Ensure we use standard icon filename for consistency
                string iconFileName = $"{appId}_icon.ico";
                string localIconPath = Path.Combine(_steamGamesDir, iconFileName);
                
                // Update shortcut to use our standard icon location
                WritePrivateProfileString("InternetShortcut", "IconFile", localIconPath, filePath);
                WritePrivateProfileString("InternetShortcut", "IconIndex", "0", filePath);

                // Check if icon already exists
                if (File.Exists(localIconPath))
                {
                    return new ProcessResult
                    {
                        Path = filePath,
                        Success = true,
                        Message = "Icon already exists",
                        AppId = appId
                    };
                }

                // Ensure games directory exists
                Directory.CreateDirectory(_steamGamesDir);

                // Try multiple CDN endpoints and icon variations
                string[] iconUrls = new[]
                {
                    // Primary CDN URLs with standard icon name
                    $"https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{appId}/{appId}_icon.ico",
                    $"https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/{appId}/{appId}_icon.ico",
                    $"http://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{appId}/{appId}_icon.ico",
                    $"http://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/{appId}/{appId}_icon.ico",
                    
                    // Alternative icon names
                    $"https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{appId}/icon.ico",
                    $"https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/{appId}/icon.ico",
                    
                    // Legacy CDN
                    $"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/{appId}/{appId}_icon.ico",
                    
                    // Try JPG/PNG if ICO fails
                    $"https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/{appId}/{appId}_icon.jpg",
                    $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg",
                    $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/capsule_sm_120.jpg"
                };

                bool downloaded = false;
                foreach (var iconUrl in iconUrls)
                {
                    if (await DownloadIcon(iconUrl, localIconPath))
                    {
                        downloaded = true;
                        break;
                    }
                }

                if (!downloaded)
                {
                    return new ProcessResult
                    {
                        Path = filePath,
                        Success = false,
                        Message = "Failed to download icon from CDN",
                        AppId = appId
                    };
                }

                // Update shortcut with correct icon path
                WritePrivateProfileString("InternetShortcut", "IconFile", localIconPath, filePath);
                WritePrivateProfileString("InternetShortcut", "IconIndex", "0", filePath);

                return new ProcessResult
                {
                    Path = filePath,
                    Success = true,
                    Message = "Icon downloaded successfully",
                    AppId = appId
                };
            }
            catch (Exception ex)
            {
                return new ProcessResult
                {
                    Path = filePath,
                    Success = false,
                    Message = $"Error: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Download icon from URL with validation
        /// </summary>
        private async Task<bool> DownloadIcon(string url, string localPath)
        {
            try
            {
                var response = await _httpClient.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var data = await response.Content.ReadAsByteArrayAsync();
                    
                    // Validate we got actual image data (not HTML error page)
                    if (data.Length < 100) // Too small to be a valid icon
                        return false;
                    
                    // Check for common image file signatures
                    bool isValidImage = false;
                    if (data.Length > 4)
                    {
                        // ICO: 00 00 01 00
                        if (data[0] == 0x00 && data[1] == 0x00 && data[2] == 0x01 && data[3] == 0x00)
                            isValidImage = true;
                        // JPEG: FF D8 FF
                        else if (data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF)
                            isValidImage = true;
                        // PNG: 89 50 4E 47
                        else if (data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47)
                            isValidImage = true;
                        // BMP: 42 4D
                        else if (data[0] == 0x42 && data[1] == 0x4D)
                            isValidImage = true;
                    }
                    
                    if (!isValidImage)
                        return false;
                    
                    // If we got a JPEG/PNG but need ICO, keep the original format
                    // Windows can handle JPG/PNG for shortcut icons
                    await File.WriteAllBytesAsync(localPath, data);
                    
                    // Verify file was written
                    if (File.Exists(localPath) && new FileInfo(localPath).Length > 0)
                    {
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Download failed for {url}: {ex.Message}");
            }
            return false;
        }

        /// <summary>
        /// Flush Windows icon cache (requires admin privileges)
        /// </summary>
        public static void FlushIconCache()
        {
            try
            {
                // First, notify shell of icon changes
                SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
                
                // Kill Explorer
                foreach (var process in Process.GetProcessesByName("explorer"))
                {
                    process.Kill();
                    process.WaitForExit();
                }

                // Delete icon cache files
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                
                // Delete main icon cache
                string iconCacheDb = Path.Combine(localAppData, "IconCache.db");
                if (File.Exists(iconCacheDb))
                {
                    File.SetAttributes(iconCacheDb, FileAttributes.Normal);
                    File.Delete(iconCacheDb);
                }

                // Delete thumbnail caches
                string explorerPath = Path.Combine(localAppData, @"Microsoft\Windows\Explorer");
                if (Directory.Exists(explorerPath))
                {
                    string[] thumbCaches = new[]
                    {
                        "thumbcache_32.db", "thumbcache_96.db", "thumbcache_102.db",
                        "thumbcache_256.db", "thumbcache_1024.db", "thumbcache_idx.db",
                        "thumbcache_sr.db", "iconcache_*.db"
                    };

                    foreach (var pattern in thumbCaches)
                    {
                        foreach (var file in Directory.GetFiles(explorerPath, pattern))
                        {
                            try
                            {
                                File.SetAttributes(file, FileAttributes.Normal);
                                File.Delete(file);
                            }
                            catch { }
                        }
                    }
                }

                // Clear shell icon cache using command line
                Process.Start(new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = "/c ie4uinit.exe -show",
                    WindowStyle = ProcessWindowStyle.Hidden,
                    CreateNoWindow = true
                }).WaitForExit();

                // Restart Explorer
                Process.Start("explorer.exe");
                
                // Wait a moment for Explorer to restart
                System.Threading.Thread.Sleep(2000);
                
                // Force refresh of all icons
                SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to flush icon cache: {ex.Message}");
            }
        }

        /// <summary>
        /// Delete all Steam shortcuts from desktop
        /// </summary>
        public static List<string> DeleteSteamShortcuts(string desktopPath)
        {
            var deletedShortcuts = new List<string>();
            
            try
            {
                // Find all .url files on desktop
                var urlFiles = Directory.GetFiles(desktopPath, "*.url", SearchOption.TopDirectoryOnly);
                
                foreach (var file in urlFiles)
                {
                    try
                    {
                        // Read the .url file to check if it's a Steam shortcut
                        string content = File.ReadAllText(file);
                        if (content.Contains("steam://"))
                        {
                            File.Delete(file);
                            deletedShortcuts.Add(Path.GetFileNameWithoutExtension(file));
                        }
                    }
                    catch { }
                }
            }
            catch { }
            
            return deletedShortcuts;
        }

        /// <summary>
        /// Create a new Steam game shortcut on the desktop with proper icon
        /// </summary>
        public static void CreateDesktopShortcut(SteamGame game, string desktopPath, string steamGamesDir)
        {
            string shortcutName = $"{game.Name}.url";
            string shortcutPath = Path.Combine(desktopPath, shortcutName);
            
            // Always delete existing shortcut first
            if (File.Exists(shortcutPath))
                File.Delete(shortcutPath);

            // Create .url file for the game with proper icon path
            string url = $"steam://rungameid/{game.AppId}";
            string iconPath = Path.Combine(steamGamesDir, $"{game.AppId}_icon.ico");
            
            // If icon doesn't exist yet, use a placeholder path that will be updated after download
            if (!File.Exists(iconPath))
            {
                iconPath = Path.Combine(steamGamesDir, $"{game.AppId}_icon.ico");
            }
            
            var lines = new List<string>
            {
                "[InternetShortcut]",
                $"URL={url}",
                $"IconFile={iconPath}",
                "IconIndex=0"
            };
            File.WriteAllLines(shortcutPath, lines);
        }

        /// <summary>
        /// Ensure a Steam game shortcut exists on the desktop (legacy method)
        /// </summary>
        public static void EnsureDesktopShortcut(SteamGame game, string desktopPath)
        {
            string shortcutName = $"{game.Name}.url";
            string shortcutPath = Path.Combine(desktopPath, shortcutName);
            if (File.Exists(shortcutPath))
                return;

            // Create .url file for the game
            string url = $"steam://rungameid/{game.AppId}";
            string iconPath = $"{game.LibraryPath}\\steam\\games\\steam_icon_{game.AppId}.ico";
            var lines = new List<string>
            {
                "[InternetShortcut]",
                $"URL={url}",
                $"IconFile={iconPath}",
                "IconIndex=0"
            };
            File.WriteAllLines(shortcutPath, lines);
        }

        #region Windows API for INI file operations

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        private static extern int GetPrivateProfileString(
            string lpAppName,
            string lpKeyName,
            string lpDefault,
            System.Text.StringBuilder lpReturnedString,
            int nSize,
            string lpFileName);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        private static extern bool WritePrivateProfileString(
            string lpAppName,
            string lpKeyName,
            string lpString,
            string lpFileName);
        
        [DllImport("shell32.dll")]
        private static extern void SHChangeNotify(int eventId, int flags, IntPtr item1, IntPtr item2);

        private string GetPrivateProfileString(string section, string key, string filePath)
        {
            var buffer = new System.Text.StringBuilder(1024);
            GetPrivateProfileString(section, key, "", buffer, buffer.Capacity, filePath);
            return buffer.ToString();
        }

        #endregion
    }
}
