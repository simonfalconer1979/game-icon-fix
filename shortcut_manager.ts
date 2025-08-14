/**
 * Shortcut manager module for creating and managing Steam shortcuts
 * Handles deletion and recreation of Steam game shortcuts
 */

import { join } from "jsr:@std/path@1.0.9";
import { SteamDetector, type SteamInfo } from "./steam_detector.ts";
import { SettingsManager } from "./settings.ts";
import { UIManager } from "./ui_manager.ts";
import {
  colors,
  clearScreen,
  displayBanner,
  drawBox,
  drawDivider,
  drawProgressBar,
  drawTextWithShadow,
  moveCursor,
  centerText,
} from "./ui.ts";

/**
 * Game information from Steam
 */
interface GameInfo {
  appId: string;
  name: string;
  installDir: string;
  libraryPath: string;
}

/**
 * Manages Steam shortcuts creation and deletion
 */
export class ShortcutManager {
  private steamInfo: SteamInfo;
  private settings: SettingsManager;
  private ui: UIManager;
  private desktopPath: string;

  constructor(steamInfo: SteamInfo) {
    this.steamInfo = steamInfo;
    this.settings = SettingsManager.getInstance();
    this.ui = UIManager.getInstance();
    this.desktopPath = join(
      Deno.env.get("USERPROFILE") || "",
      "Desktop"
    );
  }

  /**
   * Refresh all Steam shortcuts on desktop
   * Deletes existing shortcuts and recreates them
   */
  async refreshAllShortcuts(): Promise<void> {
    clearScreen();
    displayBanner();

    drawTextWithShadow("REFRESHING STEAM SHORTCUTS", 23, 26, colors.fg.yellow);
    drawBox(10, 28, 65, 20, colors.fg.cyan);

    moveCursor(30, 12);
    console.log(colors.fg.brightCyan + "Scanning for installed games..." + colors.reset);

    // Get all installed games
    const games = await this.getAllInstalledGames();
    
    if (games.length === 0) {
      moveCursor(32, 25);
      console.log(colors.fg.red + "No Steam games found!" + colors.reset);
      await this.waitForKey();
      return;
    }

    moveCursor(32, 12);
    console.log(
      colors.fg.brightGreen + 
      `Found ${games.length} installed games` + 
      colors.reset
    );

    drawDivider(11, 30, 63, colors.fg.cyan);

    // Confirm action
    const confirmMessage = `This will delete and recreate ${games.length} shortcuts. Continue?`;
    const confirmed = await this.ui.confirmAction(confirmMessage, "Refresh Shortcuts");
    
    if (!confirmed) {
      moveCursor(34, 25);
      console.log(colors.fg.yellow + "Operation cancelled" + colors.reset);
      await this.waitForKey();
      return;
    }

    // Delete existing Steam shortcuts
    moveCursor(34, 15);
    console.log(colors.fg.yellow + "Deleting existing shortcuts..." + colors.reset);
    const deletedCount = await this.deleteExistingShortcuts();
    
    moveCursor(35, 15);
    console.log(
      colors.fg.green + 
      `✓ Deleted ${deletedCount} existing shortcuts` + 
      colors.reset
    );

    // Create new shortcuts
    moveCursor(37, 15);
    console.log(colors.fg.yellow + "Creating new shortcuts..." + colors.reset);

    let created = 0;
    let failed = 0;

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      
      // Update progress
      drawProgressBar(
        15, 39, 55,
        i + 1, games.length,
        `${i + 1}/${games.length}`
      );

      moveCursor(41, 15);
      const truncatedName = this.truncateName(game.name, 50);
      console.log(
        colors.fg.cyan + 
        `Creating: ${truncatedName}`.padEnd(55) + 
        colors.reset
      );

      try {
        await this.createShortcut(game);
        created++;
      } catch (error) {
        console.error(`Failed to create shortcut for ${game.name}:`, error);
        failed++;
      }
    }

    // Show results
    clearScreen();
    displayBanner();
    
    drawTextWithShadow("REFRESH COMPLETE", 28, 26, colors.fg.green);
    drawBox(10, 28, 65, 10, colors.fg.green);

    const results = [
      `Games Found: ${games.length}`,
      `Shortcuts Created: ${created}`,
      `Failed: ${failed}`,
      `Deleted Old: ${deletedCount}`,
    ];

    results.forEach((line, index) => {
      moveCursor(30 + index * 2, 25);
      console.log(colors.fg.white + centerText(line, 55) + colors.reset);
    });

    moveCursor(40, 25);
    console.log(
      colors.fg.yellow + colors.blink + 
      centerText("Press any key to continue...", 55) + 
      colors.reset
    );

    await this.waitForKey();
  }

  /**
   * Get all installed Steam games across all libraries
   */
  private async getAllInstalledGames(): Promise<GameInfo[]> {
    const games: GameInfo[] = [];
    const seenAppIds = new Set<string>();

    for (const library of this.steamInfo.libraries) {
      const steamappsPath = join(library.path, "steamapps");
      
      try {
        // Read all appmanifest files
        for await (const entry of Deno.readDir(steamappsPath)) {
          if (entry.name.startsWith("appmanifest_") && entry.name.endsWith(".acf")) {
            const appId = entry.name.replace("appmanifest_", "").replace(".acf", "");
            
            if (seenAppIds.has(appId)) continue;
            seenAppIds.add(appId);

            try {
              const manifestPath = join(steamappsPath, entry.name);
              const content = await Deno.readTextFile(manifestPath);
              
              // Parse manifest (simple regex parsing for ACF format)
              const nameMatch = content.match(/"name"\s+"([^"]+)"/);
              const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
              
              if (nameMatch && installDirMatch) {
                games.push({
                  appId,
                  name: nameMatch[1],
                  installDir: installDirMatch[1],
                  libraryPath: library.path,
                });
              }
            } catch {
              // Skip invalid manifests
            }
          }
        }
      } catch {
        // Skip inaccessible libraries
      }
    }

    // Sort games alphabetically
    games.sort((a, b) => a.name.localeCompare(b.name));
    
    return games;
  }

  /**
   * Delete existing Steam shortcuts from desktop
   */
  private async deleteExistingShortcuts(): Promise<number> {
    let deletedCount = 0;

    try {
      for await (const entry of Deno.readDir(this.desktopPath)) {
        if (entry.name.endsWith(".url") && entry.isFile) {
          const filePath = join(this.desktopPath, entry.name);
          
          try {
            // Check if it's a Steam shortcut
            const content = await Deno.readTextFile(filePath);
            if (content.includes("steam://rungameid/")) {
              await Deno.remove(filePath);
              deletedCount++;
            }
          } catch {
            // Skip files we can't read or delete
          }
        }
      }
    } catch {
      // Desktop not accessible
    }

    return deletedCount;
  }

  /**
   * Create a shortcut for a Steam game
   */
  private async createShortcut(game: GameInfo): Promise<void> {
    const shortcutPath = join(this.desktopPath, `${this.sanitizeFilename(game.name)}.url`);
    
    // Check if icon exists
    const iconName = `steam_icon_${game.appId}.ico`;
    const iconPath = join(this.steamInfo.installPath, "steam", "games", iconName);
    
    // Create shortcut content
    const shortcutContent = [
      "[InternetShortcut]",
      `URL=steam://rungameid/${game.appId}`,
      `IconFile=${iconPath}`,
      "IconIndex=0",
      "",
    ].join("\r\n");

    await Deno.writeTextFile(shortcutPath, shortcutContent);
  }

  /**
   * Sanitize filename for Windows
   */
  private sanitizeFilename(name: string): string {
    // Remove invalid characters for Windows filenames
    return name
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Truncate game name for display
   */
  private truncateName(name: string, maxLen: number): string {
    if (name.length <= maxLen) return name;
    return name.substring(0, maxLen - 3) + "...";
  }

  /**
   * Wait for key press
   */
  private async waitForKey(): Promise<void> {
    try {
      Deno.stdin.setRaw(true);
      const buffer = new Uint8Array(1);
      await Deno.stdin.read(buffer);
    } finally {
      Deno.stdin.setRaw(false);
    }
  }
}

/**
 * Quick function to refresh all Steam shortcuts
 */
export async function refreshAllSteamShortcuts(): Promise<void> {
  const steamInfo = await SteamDetector.detect();
  
  if (!steamInfo) {
    console.log(colors.fg.red + "❌ Steam installation not found!" + colors.reset);
    console.log("Please make sure Steam is installed and try again.");
    return;
  }

  const manager = new ShortcutManager(steamInfo);
  await manager.refreshAllShortcuts();
}