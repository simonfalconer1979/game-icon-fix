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

                // Get icon filename from the shortcut
                if (string.IsNullOrEmpty(iconFile))
                {
                    // If no icon specified, create default name
                    iconFile = Path.Combine(_steamGamesDir, $"steam_icon_{appId}.ico");
                    WritePrivateProfileString("InternetShortcut", "IconFile", iconFile, filePath);
                    WritePrivateProfileString("InternetShortcut", "IconIndex", "0", filePath);
                }

                string iconFileName = Path.GetFileName(iconFile);
                string localIconPath = Path.Combine(_steamGamesDir, iconFileName);

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

                // Build CDN URL using exact pattern from C++
                string cdnBase = _cdnProvider == CDNProvider.Cloudflare
                    ? "cdn.cloudflare.steamstatic.com"
                    : "cdn.akamai.steamstatic.com";

                string iconUrl = $"http://{cdnBase}/steamcommunity/public/images/apps/{appId}/{iconFileName}";

                // Try to download the icon
                bool downloaded = await DownloadIcon(iconUrl, localIconPath);

                if (!downloaded)
                {
                    // Try HTTPS as fallback
                    iconUrl = iconUrl.Replace("http://", "https://");
                    downloaded = await DownloadIcon(iconUrl, localIconPath);
                }

                if (!downloaded)
                {
                    // Try alternative URLs
                    string[] altUrls = new[]
                    {
                        $"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/{appId}/{iconFileName}",
                        $"https://cdn.akamai.steamstatic.com/steam/apps/{appId}/header.jpg",
                        $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg"
                    };

                    foreach (var altUrl in altUrls)
                    {
                        if (await DownloadIcon(altUrl, localIconPath))
                        {
                            downloaded = true;
                            break;
                        }
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
        /// Download icon from URL
        /// </summary>
        private async Task<bool> DownloadIcon(string url, string localPath)
        {
            try
            {
                var response = await _httpClient.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var data = await response.Content.ReadAsByteArrayAsync();
                    await File.WriteAllBytesAsync(localPath, data);
                    return true;
                }
            }
            catch
            {
                // Download failed
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

                // Restart Explorer
                Process.Start("explorer.exe");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to flush icon cache: {ex.Message}");
            }
        }

        /// <summary>
        /// Ensure a Steam game shortcut exists on the desktop
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

        private string GetPrivateProfileString(string section, string key, string filePath)
        {
            var buffer = new System.Text.StringBuilder(1024);
            GetPrivateProfileString(section, key, "", buffer, buffer.Capacity, filePath);
            return buffer.ToString();
        }

        #endregion
    }
}
