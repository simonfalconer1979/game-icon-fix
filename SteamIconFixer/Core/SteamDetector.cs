using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace SteamIconFixer.Core
{
    /// <summary>
    /// Detects Steam installation and parses library folders
    /// </summary>
    public class SteamDetector
    {
        public string InstallPath { get; private set; } = string.Empty;
        public List<SteamLibrary> Libraries { get; private set; }
        public string UserId { get; private set; } = string.Empty;

        public SteamDetector()
        {
            Libraries = new List<SteamLibrary>();
        }

        /// <summary>
        /// Detect Steam installation
        /// </summary>
        public bool Detect()
        {
            // Try to find Steam installation path from registry
            if (!FindSteamPath())
                return false;

            // Parse library folders
            ParseLibraryFolders();

            // Get active user ID
            FindActiveUser();

            return true;
        }

        /// <summary>
        /// Find Steam installation path from registry
        /// </summary>
        private bool FindSteamPath()
        {
            try
            {
                // Try 64-bit registry first
                using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Valve\Steam"))
                {
                    if (key != null)
                    {
                        InstallPath = key.GetValue("InstallPath") as string ?? string.Empty;
                        if (!string.IsNullOrEmpty(InstallPath) && Directory.Exists(InstallPath))
                            return true;
                    }
                }

                // Try 32-bit registry
                using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Valve\Steam"))
                {
                    if (key != null)
                    {
                        InstallPath = key.GetValue("InstallPath") as string ?? string.Empty;
                        if (!string.IsNullOrEmpty(InstallPath) && Directory.Exists(InstallPath))
                            return true;
                    }
                }

                // Try current user registry
                using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam"))
                {
                    if (key != null)
                    {
                        InstallPath = key.GetValue("SteamPath") as string ?? string.Empty;
                        if (!string.IsNullOrEmpty(InstallPath))
                        {
                            InstallPath = InstallPath.Replace('/', '\\');
                            if (Directory.Exists(InstallPath))
                                return true;
                        }
                    }
                }

                // Try common installation paths
                string[] commonPaths = new[]
                {
                    @"C:\Program Files (x86)\Steam",
                    @"C:\Program Files\Steam",
                    @"D:\Steam",
                    @"E:\Steam"
                };

                foreach (var path in commonPaths)
                {
                    if (Directory.Exists(path) && File.Exists(Path.Combine(path, "steam.exe")))
                    {
                        InstallPath = path;
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error detecting Steam: {ex.Message}");
            }

            return false;
        }

        /// <summary>
        /// Parse Steam library folders from libraryfolders.vdf
        /// </summary>
        private void ParseLibraryFolders()
        {
            Libraries.Clear();

            // Add main Steam library
            Libraries.Add(new SteamLibrary
            {
                Path = InstallPath,
                Label = "Main"
            });

            try
            {
                string vdfPath = Path.Combine(InstallPath, "steamapps", "libraryfolders.vdf");
                if (!File.Exists(vdfPath))
                    return;

                string content = File.ReadAllText(vdfPath);
                
                // Parse VDF format - look for "path" entries
                var pathMatches = Regex.Matches(content, @"""path""\s+""([^""]+)""");
                foreach (Match match in pathMatches)
                {
                    if (match.Groups.Count > 1)
                    {
                        string libraryPath = match.Groups[1].Value.Replace(@"\\", @"\");
                        if (Directory.Exists(libraryPath) && !Libraries.Any(l => l.Path.Equals(libraryPath, StringComparison.OrdinalIgnoreCase)))
                        {
                            Libraries.Add(new SteamLibrary
                            {
                                Path = libraryPath,
                                Label = Path.GetFileName(libraryPath)
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error parsing library folders: {ex.Message}");
            }
        }

        /// <summary>
        /// Find active Steam user ID
        /// </summary>
        private void FindActiveUser()
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam\ActiveProcess"))
                {
                    if (key != null)
                    {
                        var userId = key.GetValue("ActiveUser") as int?;
                        if (userId.HasValue && userId.Value != 0)
                        {
                            UserId = userId.Value.ToString();
                        }
                    }
                }
            }
            catch
            {
                UserId = "unknown";
            }
        }

        /// <summary>
        /// Get all installed games across all libraries
        /// </summary>
        public List<SteamGame> GetInstalledGames()
        {
            var games = new List<SteamGame>();
            var seenAppIds = new HashSet<string>();

            foreach (var library in Libraries)
            {
                try
                {
                    string steamappsPath = Path.Combine(library.Path, "steamapps");
                    if (!Directory.Exists(steamappsPath))
                        continue;

                    // Read all appmanifest files
                    var manifestFiles = Directory.GetFiles(steamappsPath, "appmanifest_*.acf");
                    foreach (var manifestFile in manifestFiles)
                    {
                        try
                        {
                            string content = File.ReadAllText(manifestFile);
                            
                            // Extract app ID from filename
                            string appId = Path.GetFileNameWithoutExtension(manifestFile).Replace("appmanifest_", "");
                            
                            if (seenAppIds.Contains(appId))
                                continue;
                            seenAppIds.Add(appId);

                            // Parse manifest
                            var nameMatch = Regex.Match(content, @"""name""\s+""([^""]+)""");
                            var installDirMatch = Regex.Match(content, @"""installdir""\s+""([^""]+)""");

                            if (nameMatch.Success)
                            {
                                games.Add(new SteamGame
                                {
                                    AppId = appId,
                                    Name = nameMatch.Groups[1].Value,
                                    InstallDir = installDirMatch.Success ? installDirMatch.Groups[1].Value : "",
                                    LibraryPath = library.Path
                                });
                            }
                        }
                        catch
                        {
                            // Skip invalid manifests
                        }
                    }
                }
                catch
                {
                    // Skip inaccessible libraries
                }
            }

            return games.OrderBy(g => g.Name).ToList();
        }
    }

    public class SteamLibrary
    {
        public string Path { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
    }

    public class SteamGame
    {
        public string AppId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string InstallDir { get; set; } = string.Empty;
        public string LibraryPath { get; set; } = string.Empty;
    }
}