/**
 * Simplified icon processor for web API usage
 * Returns results instead of displaying UI
 */

import { basename, join } from "@std/path";
import type { SteamInfo } from "./steam_detector.ts";

interface ProcessResult {
  path: string;
  success: boolean;
  message: string;
}

export class WebIconProcessor {
  private readonly steamInfo: SteamInfo;

  constructor(steamInfo: SteamInfo) {
    this.steamInfo = steamInfo;
  }

  /**
   * Process files and return results
   */
  async processFiles(files: string[]): Promise<ProcessResult[]> {
    const results: ProcessResult[] = [];
    
    for (const file of files) {
      const result = await this.processFile(file);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Process a single file
   */
  private async processFile(filePath: string): Promise<ProcessResult> {
    const fileName = basename(filePath);
    
    try {
      // Check if it's a .url file
      if (!filePath.endsWith(".url")) {
        return {
          path: filePath,
          success: false,
          message: "Not a .url file"
        };
      }

      // Read the shortcut file
      const content = await Deno.readTextFile(filePath);
      
      // Extract Steam app ID
      const appIdMatch = content.match(/steam:\/\/rungameid\/(\d+)/);
      if (!appIdMatch) {
        return {
          path: filePath,
          success: false,
          message: "Not a Steam shortcut"
        };
      }

      const appId = appIdMatch[1];
      
      // Extract icon filename from shortcut
      const iconMatch = content.match(/IconFile=(.+)/);
      if (!iconMatch) {
        return {
          path: filePath,
          success: false,
          message: "No icon path in shortcut"
        };
      }
      
      const iconFileName = basename(iconMatch[1]);
      const iconPath = join(this.steamInfo.installPath, "steam", "games", iconFileName);
      
      // Check if icon already exists
      if (await this.fileExists(iconPath)) {
        return {
          path: filePath,
          success: true,
          message: "Icon already exists"
        };
      }

      // Try to download the icon from Steam CDN
      const iconName = iconFileName.replace(/\.(ico|jpg|png)$/i, "");
      const iconUrls = [
        `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appId}/${iconName}.jpg`,
        `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appId}/${iconName}.ico`,
        `http://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/${appId}/${iconName}.jpg`,
        `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${appId}/${iconName}.jpg`,
      ];

      let downloaded = false;
      for (const url of iconUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.arrayBuffer();
            await Deno.mkdir(join(this.steamInfo.installPath, "steam", "games"), { recursive: true });
            await Deno.writeFile(iconPath, new Uint8Array(data));
            downloaded = true;
            break;
          }
        } catch {
          // Try next URL
        }
      }

      if (!downloaded) {
        return {
          path: filePath,
          success: false,
          message: "Failed to download icon from CDN"
        };
      }

      // Update the shortcut if needed
      const updatedContent = this.updateShortcutIcon(content, iconPath);
      await Deno.writeTextFile(filePath, updatedContent);

      return {
        path: filePath,
        success: true,
        message: "Icon downloaded and applied"
      };

    } catch (error) {
      return {
        path: filePath,
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Update shortcut content with new icon path
   */
  private updateShortcutIcon(content: string, iconPath: string): string {
    const lines = content.split(/\r?\n/);
    const newLines: string[] = [];
    let foundIconFile = false;
    let foundIconIndex = false;

    for (const line of lines) {
      if (line.startsWith("IconFile=")) {
        newLines.push(`IconFile=${iconPath}`);
        foundIconFile = true;
      } else if (line.startsWith("IconIndex=")) {
        newLines.push("IconIndex=0");
        foundIconIndex = true;
      } else {
        newLines.push(line);
      }
    }

    // Add icon entries if they don't exist
    if (!foundIconFile) {
      // Find [InternetShortcut] section
      const sectionIndex = newLines.findIndex(line => 
        line.trim() === "[InternetShortcut]"
      );
      if (sectionIndex >= 0) {
        newLines.splice(sectionIndex + 1, 0, `IconFile=${iconPath}`);
        if (!foundIconIndex) {
          newLines.splice(sectionIndex + 2, 0, "IconIndex=0");
        }
      }
    }

    return newLines.join("\r\n");
  }

  /**
   * Check if file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await Deno.stat(path);
      return true;
    } catch {
      return false;
    }
  }
}