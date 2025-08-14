/**
 * Enhanced Steam detection module with VDF parsing and multi-library support
 * Provides robust methods for finding Steam installations and game libraries
 */

import { exists } from "jsr:@std/fs@1.0.8/exists";
import { join } from "jsr:@std/path@1.0.9";

/**
 * Represents a Steam library location
 */
export interface SteamLibrary {
  path: string;
  label?: string;
  contentId?: string;
  apps?: number[];
}

/**
 * Represents Steam installation information
 */
export interface SteamInfo {
  installPath: string;
  configPath: string;
  libraries: SteamLibrary[];
  userId?: string;
}

// VDF value can be a string or nested object
interface VdfObject {
  [key: string]: string | VdfObject;
}

/**
 * Parses Valve Data Format (VDF) files
 * Simple parser for Steam's configuration format
 */
export class VdfParser {
  /**
   * Parse a VDF string into a JavaScript object
   * @param content - VDF file content as string
   * @returns Parsed object structure
   */
  static parse(content: string): VdfObject {
    const lines = content.split(/\r?\n/);
    const result: VdfObject = {};
    const stack: VdfObject[] = [result];
    let currentObj = result;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("//")) continue;
      
      // Opening bracket - start new object
      if (trimmed === "{") {
        continue;
      }
      
      // Closing bracket - pop from stack
      if (trimmed === "}") {
        stack.pop();
        currentObj = stack[stack.length - 1] || result;
        continue;
      }
      
      // Key-value pair with quotes
      const kvMatch = trimmed.match(/^"([^"]+)"\s+"([^"]*)"$/);
      if (kvMatch) {
        const [, key, value] = kvMatch;
        currentObj[key] = value;
        continue;
      }
      
      // Key with opening bracket on same line
      const keyMatch = trimmed.match(/^"([^"]+)"$/);
      if (keyMatch) {
        const [, key] = keyMatch;
        const newObj: VdfObject = {};
        currentObj[key] = newObj;
        stack.push(newObj);
        currentObj = newObj;
      }
    }
    
    return result;
  }
  
  /**
   * Parse a VDF file from disk
   * @param filePath - Path to VDF file
   * @returns Parsed object structure
   */
  static async parseFile(filePath: string): Promise<VdfObject> {
    try {
      const content = await Deno.readTextFile(filePath);
      return this.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse VDF file ${filePath}: ${error}`);
    }
  }
}

/**
 * Enhanced Steam detector with multi-library support
 */
export class SteamDetector {
  private static readonly COMMON_STEAM_PATHS = [
    "C:/Program Files (x86)/Steam",
    "C:/Program Files/Steam",
    "D:/Steam",
    "E:/Steam",
    "F:/Steam",
    "G:/Steam",
    "D:/SteamLibrary",
    "E:/SteamLibrary", 
    "F:/SteamLibrary",
    "G:/SteamLibrary",
  ];
  
  private static readonly REGISTRY_KEYS = [
    { root: "HKCU", path: "Software\\Valve\\Steam", value: "SteamPath" },
    { root: "HKLM", path: "Software\\Valve\\Steam", value: "InstallPath" },
    { root: "HKLM", path: "Software\\WOW6432Node\\Valve\\Steam", value: "InstallPath" },
  ];
  
  /**
   * Find Steam installation using multiple detection methods
   * @returns Steam installation info or null if not found
   */
  static async detect(): Promise<SteamInfo | null> {
    // Try registry first (most reliable on Windows)
    const registryPath = await this.detectFromRegistry();
    if (registryPath) {
      const info = await this.getSteamInfo(registryPath);
      if (info) return info;
    }
    
    // Try common paths
    for (const path of this.COMMON_STEAM_PATHS) {
      if (await this.isValidSteamPath(path)) {
        const info = await this.getSteamInfo(path);
        if (info) return info;
      }
    }
    
    // Try environment variable
    const steamPath = Deno.env.get("STEAM_PATH");
    if (steamPath && await this.isValidSteamPath(steamPath)) {
      const info = await this.getSteamInfo(steamPath);
      if (info) return info;
    }
    
    // Scan all drives as last resort
    const info = await this.scanDrivesForSteam();
    if (info) return info;
    
    return null;
  }
  
  /**
   * Detect Steam installation from Windows Registry
   * @returns Steam installation path or null
   */
  private static async detectFromRegistry(): Promise<string | null> {
    for (const key of this.REGISTRY_KEYS) {
      try {
        const args = ["query", `${key.root}\\${key.path}`, "/v", key.value];
        const command = new Deno.Command("reg", { args, stdout: "piped", stderr: "piped" });
        const { stdout, success } = await command.output();
        
        if (!success) continue;
        
        const output = new TextDecoder().decode(stdout);
        const match = output.match(new RegExp(`${key.value}\\s+REG_SZ\\s+(.+)`, "i"));
        
        if (match) {
          const path = match[1].trim().replace(/\\/g, "/");
          if (await this.isValidSteamPath(path)) {
            return path;
          }
        }
      } catch {
        // Registry key doesn't exist or access denied
        continue;
      }
    }
    
    return null;
  }
  
  /**
   * Scan all available drives for Steam installations
   * @returns Steam installation info or null
   */
  private static async scanDrivesForSteam(): Promise<SteamInfo | null> {
    // Get available drives on Windows
    const drives = "CDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    
    for (const drive of drives) {
      const paths = [
        `${drive}:/Steam`,
        `${drive}:/Program Files/Steam`,
        `${drive}:/Program Files (x86)/Steam`,
        `${drive}:/SteamLibrary`,
        `${drive}:/Games/Steam`,
      ];
      
      for (const path of paths) {
        if (await this.isValidSteamPath(path)) {
          const info = await this.getSteamInfo(path);
          if (info) return info;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if a path is a valid Steam installation
   * @param path - Path to check
   * @returns True if valid Steam installation
   */
  private static async isValidSteamPath(path: string): Promise<boolean> {
    try {
      // Check for steam.exe or Steam.app
      const steamExe = join(path, "steam.exe");
      const steamApp = join(path, "Steam.app");
      const configDir = join(path, "config");
      
      return (await exists(steamExe) || await exists(steamApp)) && await exists(configDir);
    } catch {
      return false;
    }
  }
  
  /**
   * Get comprehensive Steam installation information
   * @param steamPath - Path to Steam installation
   * @returns Steam info including all libraries
   */
  private static async getSteamInfo(steamPath: string): Promise<SteamInfo | null> {
    try {
      const configPath = join(steamPath, "config");
      const libraryFoldersPath = join(configPath, "libraryfolders.vdf");
      
      const info: SteamInfo = {
        installPath: steamPath,
        configPath: configPath,
        libraries: [{
          path: steamPath,
          label: "Main Library",
        }],
      };
      
      // Parse library folders if available
      if (await exists(libraryFoldersPath)) {
        const vdfData = await VdfParser.parseFile(libraryFoldersPath);
        const libraryFolders = vdfData.libraryfolders || vdfData.LibraryFolders || {};
        
        // Parse each library entry
        for (const key of Object.keys(libraryFolders)) {
          if (key === "0") continue; // Skip main library (already added)
          
          const libraryValue = (libraryFolders as VdfObject)[key];
          if (typeof libraryValue === "string") continue; // Skip string values
          
          const library = libraryValue as VdfObject;
          const pathValue = library.path;
          if (typeof pathValue === "string") {
            const libraryPath = pathValue.replace(/\\\\/g, "/").replace(/\\/g, "/");
            
            // Verify library exists
            if (await exists(libraryPath)) {
              const apps: number[] = [];
              
              // Parse apps if available
              if (library.apps && typeof library.apps === "object") {
                for (const appId of Object.keys(library.apps)) {
                  const id = parseInt(appId, 10);
                  if (!isNaN(id)) apps.push(id);
                }
              }
              
              const labelValue = library.label;
              const contentidValue = library.contentid;
              
              info.libraries.push({
                path: libraryPath,
                label: typeof labelValue === "string" ? labelValue : `Library ${key}`,
                contentId: typeof contentidValue === "string" ? contentidValue : undefined,
                apps: apps.length > 0 ? apps : undefined,
              });
            }
          }
        }
      }
      
      // Try to get user ID from loginusers.vdf
      const loginUsersPath = join(configPath, "loginusers.vdf");
      if (await exists(loginUsersPath)) {
        try {
          const loginData = await VdfParser.parseFile(loginUsersPath);
          const users = loginData.users || loginData.Users || {};
          
          // Find most recent user
          let mostRecentUser = null;
          let mostRecentTime = 0;
          
          for (const userId of Object.keys(users)) {
            const userValue = (users as VdfObject)[userId];
            if (typeof userValue === "string") continue;
            
            const user = userValue as VdfObject;
            if (user.mostrecent === "1" || user.MostRecent === "1") {
              info.userId = userId;
              break;
            }
            
            const timestampValue = user.Timestamp || user.timestamp || "0";
            const timestamp = parseInt(typeof timestampValue === "string" ? timestampValue : "0", 10);
            if (timestamp > mostRecentTime) {
              mostRecentTime = timestamp;
              mostRecentUser = userId;
            }
          }
          
          if (!info.userId && mostRecentUser) {
            info.userId = mostRecentUser;
          }
        } catch {
          // Ignore errors reading login users
        }
      }
      
      return info;
    } catch (error) {
      console.error(`Failed to get Steam info from ${steamPath}:`, error);
      return null;
    }
  }
  
  /**
   * Get all installed games across all Steam libraries
   * @param steamInfo - Steam installation info
   * @returns Map of app IDs to game information
   */
  static async getInstalledGames(steamInfo: SteamInfo): Promise<Map<string, GameInfo>> {
    const games = new Map<string, GameInfo>();
    
    for (const library of steamInfo.libraries) {
      const steamappsPath = join(library.path, "steamapps");
      
      if (!await exists(steamappsPath)) continue;
      
      try {
        // Read all appmanifest files
        for await (const entry of Deno.readDir(steamappsPath)) {
          if (!entry.isFile || !entry.name.startsWith("appmanifest_")) continue;
          
          const manifestPath = join(steamappsPath, entry.name);
          const appId = entry.name.match(/appmanifest_(\d+)\.acf/)?.[1];
          
          if (!appId) continue;
          
          try {
            const manifestData = await VdfParser.parseFile(manifestPath);
            const appState = manifestData.AppState || manifestData.appstate || {};
            
            if (typeof appState === "object" && appState.name && appState.installdir) {
              const name = typeof appState.name === "string" ? appState.name : "";
              const installdir = typeof appState.installdir === "string" ? appState.installdir : "";
              const sizeOnDisk = typeof appState.SizeOnDisk === "string" ? appState.SizeOnDisk : 
                                 typeof appState.sizeondisk === "string" ? appState.sizeondisk : "0";
              const lastUpdated = typeof appState.LastUpdated === "string" ? appState.LastUpdated : 
                                  typeof appState.lastupdated === "string" ? appState.lastupdated : "0";
              
              games.set(appId, {
                appId: appId,
                name: name,
                installDir: join(steamappsPath, "common", installdir),
                library: library.path,
                sizeOnDisk: parseInt(sizeOnDisk, 10),
                lastUpdated: parseInt(lastUpdated, 10),
              });
            }
          } catch {
            // Skip invalid manifest files
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }
    
    return games;
  }
  
  /**
   * Find all Steam shortcut files (.url) in a directory
   * @param directory - Directory to search
   * @returns Array of shortcut file paths
   */
  static async findShortcuts(directory: string): Promise<string[]> {
    const shortcuts: string[] = [];
    
    async function scan(dir: string): Promise<void> {
      try {
        for await (const entry of Deno.readDir(dir)) {
          const path = join(dir, entry.name);
          
          if (entry.isDirectory) {
            // Skip system directories
            if (!entry.name.startsWith(".") && !entry.name.startsWith("$")) {
              await scan(path);
            }
          } else if (entry.isFile && entry.name.endsWith(".url")) {
            // Check if it's a Steam shortcut
            try {
              const content = await Deno.readTextFile(path);
              if (content.includes("steam://rungameid/")) {
                shortcuts.push(path);
              }
            } catch {
              // Skip unreadable files
            }
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    }
    
    await scan(directory);
    return shortcuts;
  }
}

/**
 * Information about an installed Steam game
 */
export interface GameInfo {
  appId: string;
  name: string;
  installDir: string;
  library: string;
  sizeOnDisk?: number;
  lastUpdated?: number;
}

/**
 * Get the best icon path for a Steam game
 * Tries multiple strategies to find the most appropriate icon
 */
export class SteamIconResolver {
  private steamInfo: SteamInfo;
  private installedGames: Map<string, GameInfo>;
  
  constructor(steamInfo: SteamInfo, installedGames: Map<string, GameInfo>) {
    this.steamInfo = steamInfo;
    this.installedGames = installedGames;
  }
  
  /**
   * Resolve the best icon path for a game
   * @param appId - Steam app ID
   * @param iconFileName - Icon file name from shortcut
   * @returns Array of possible icon paths in priority order
   */
  async resolveIconPaths(appId: string, iconFileName: string): Promise<string[]> {
    const paths: string[] = [];
    
    // 1. Check main Steam icons directory
    paths.push(join(this.steamInfo.installPath, "steam", "games", iconFileName));
    
    // 2. Check in game's installation directory
    const gameInfo = this.installedGames.get(appId);
    if (gameInfo) {
      // Common icon locations in game directory
      paths.push(join(gameInfo.installDir, iconFileName));
      paths.push(join(gameInfo.installDir, "icon.ico"));
      paths.push(join(gameInfo.installDir, `${gameInfo.name}.ico`));
      
      // Check library's steam/games directory
      paths.push(join(gameInfo.library, "steam", "games", iconFileName));
    }
    
    // 3. Check all libraries' steam/games directories
    for (const library of this.steamInfo.libraries) {
      const iconPath = join(library.path, "steam", "games", iconFileName);
      if (!paths.includes(iconPath)) {
        paths.push(iconPath);
      }
    }
    
    // 4. Check appcache directory
    paths.push(join(this.steamInfo.installPath, "appcache", "librarycache", iconFileName));
    
    // Filter out paths that already exist (no need to download)
    const existingPaths: string[] = [];
    const missingPaths: string[] = [];
    
    for (const path of paths) {
      if (await exists(path)) {
        existingPaths.push(path);
      } else {
        missingPaths.push(path);
      }
    }
    
    // Return missing paths first (need to be downloaded), then existing ones
    return [...missingPaths, ...existingPaths];
  }
  
  /**
   * Get CDN URLs for downloading an icon
   * @param appId - Steam app ID
   * @param iconFileName - Icon file name
   * @returns Array of CDN URLs to try
   */
  getIconUrls(appId: string, iconFileName: string): string[] {
    return [
      // Primary CDN
      `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appId}/${iconFileName}`,
      // Akamai CDN (fallback)
      `http://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/${appId}/${iconFileName}`,
      // Direct Steam CDN
      `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${appId}/${iconFileName}`,
      // Legacy URL format
      `https://steamcommunity.com/public/images/apps/${appId}/${iconFileName}`,
    ];
  }
}