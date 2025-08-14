/**
 * Icon processor module for downloading and fixing Steam shortcuts
 * Handles batch processing with progress tracking and result reporting
 */

import { basename, join } from "jsr:@std/path@1.0.9";
import type { SteamInfo, SteamIconResolver } from "./steam_detector.ts";
import { SettingsManager } from "./settings.ts";
import { UIManager } from "./ui_manager.ts";
import {
  centerText,
  clearScreen,
  colors,
  displayBanner,
  drawBox,
  drawDivider,
  drawProgressBar,
  drawTextWithShadow,
  moveCursor,
  showLoading,
} from "./ui.ts";

/**
 * Result of processing a single shortcut file
 */
interface ProcessResult {
  /** Path to the processed file */
  path: string;
  /** Whether processing was successful */
  success: boolean;
  /** Result message */
  message: string;
}

/**
 * Processes Steam shortcut files to download missing icons
 */
export class IconProcessor {
  private totalFiles = 0;
  private processedFiles = 0;
  private successCount = 0;
  private failCount = 0;
  private skipCount = 0;
  private results: ProcessResult[] = [];
  private readonly steamInfo: SteamInfo;
  private readonly iconResolver: SteamIconResolver;
  private loadingInterval?: number;
  private readonly settings: SettingsManager;
  private readonly ui: UIManager;

  /**
   * Creates a new IconProcessor instance
   * @param steamInfo - Steam installation info
   * @param iconResolver - Icon path resolver
   */
  constructor(steamInfo: SteamInfo, iconResolver: SteamIconResolver) {
    if (!steamInfo) {
      throw new Error("Steam info is required");
    }
    this.steamInfo = steamInfo;
    this.iconResolver = iconResolver;
    this.settings = SettingsManager.getInstance();
    this.ui = UIManager.getInstance();
  }

  /**
   * Processes multiple shortcut files
   * @param files - Array of file paths to process
   */
  async processFiles(files: string[]): Promise<void> {
    if (files.length === 0) {
      await this.showResults();
      return;
    }

    this.totalFiles = files.length;
    this.processedFiles = 0;
    this.results = [];

    clearScreen();
    displayBanner();

    // Draw processing header
    drawTextWithShadow("PROCESSING ICONS", 27, 26, colors.fg.yellow);

    // Draw main processing box
    drawBox(10, 28, 65, 20, colors.fg.cyan);

    // Show file count
    moveCursor(29, 12);
    console.log(
      colors.fg.brightCyan + "Processing " +
        colors.fg.white + colors.bright + this.totalFiles +
        colors.fg.brightCyan + " files..." + colors.reset,
    );

    drawDivider(11, 30, 63, colors.fg.cyan);

    // Start loading animation
    const loadingY = 32;
    this.loadingInterval = setInterval(() => {
      if (this.processedFiles < this.totalFiles) {
        const currentFile = files[this.processedFiles];
        showLoading(`Scanning: ${basename(currentFile)}`, 15, loadingY);
      }
    }, 100);

    // Process each file
    for (const file of files) {
      await this.processShortcut(file);
      this.processedFiles++;
      this.updateProgress();
    }

    // Stop loading animation
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = undefined;
    }

    // Show completion
    await this.showResults();
  }

  /**
   * Processes a single shortcut file
   * @param shortcutPath - Path to the .url file
   */
  private async processShortcut(shortcutPath: string): Promise<void> {
    try {
      const linkContent = await Deno.readTextFile(shortcutPath);
      const appId = linkContent.match(/rungameid\/(.+)/m)?.[1];

      if (!appId) {
        this.results.push({
          path: shortcutPath,
          success: false,
          message: "Not a Steam shortcut",
        });
        return;
      }

      const iconPath = linkContent.match(/IconFile=(.+)/);
      if (!iconPath) {
        this.results.push({
          path: shortcutPath,
          success: false,
          message: "Icon path missing in shortcut",
        });
        this.failCount++;
        return;
      }

      const iconName = iconPath[1].split("\\").pop()!;
      
      // Get all possible icon paths
      const possiblePaths = await this.iconResolver.resolveIconPaths(appId, iconName);
      
      // Check if icon already exists in any location
      let iconExists = false;
      let existingPath = "";
      for (const path of possiblePaths) {
        const exists = await Deno.stat(path)
          .then((info) => info.isFile)
          .catch(() => false);
        if (exists) {
          iconExists = true;
          existingPath = path;
          break;
        }
      }
      
      if (iconExists) {
        this.results.push({
          path: shortcutPath,
          success: true,
          message: `Icon exists at: ${existingPath}`,
        });
        this.skipCount++;
        return;
      }

      // Get CDN URLs to try
      const iconUrls = this.iconResolver.getIconUrls(appId, iconName);
      
      // Show download status
      this.showDownloadStatus(basename(shortcutPath), iconName);
      
      let iconBuffer: ArrayBuffer | null = null;
      let lastError = "";
      
      // Try each CDN URL until one succeeds
      for (const url of iconUrls) {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });
          if (response.ok) {
            iconBuffer = await response.arrayBuffer();
            break;
          }
          lastError = `HTTP ${response.status}`;
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Unknown error";
        }
      }
      
      if (!iconBuffer) {
        this.results.push({
          path: shortcutPath,
          success: false,
          message: `Failed to download: ${lastError}`,
        });
        this.failCount++;
        return;
      }
      
      // Save to the best location
      const savePath = possiblePaths[0] || join(this.steamInfo.installPath, "steam/games", iconName);
      
      // Ensure directory exists
      const saveDir = savePath.substring(0, savePath.lastIndexOf("/"));
      await Deno.mkdir(saveDir, { recursive: true }).catch(() => {});
      
      await Deno.writeFile(savePath, new Uint8Array(iconBuffer));

      this.results.push({
        path: shortcutPath,
        success: true,
        message: "Icon downloaded successfully",
      });
      this.successCount++;
    } catch (error) {
      this.results.push({
        path: shortcutPath,
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      this.failCount++;
    }
  }

  /**
   * Shows download status during icon fetch
   * @param fileName - Name of the shortcut file
   * @param iconName - Name of the icon being downloaded
   */
  private showDownloadStatus(fileName: string, iconName: string): void {
    moveCursor(35, 15);
    console.log(
      colors.fg.yellow + "⬇ " + colors.fg.white +
        `Downloading ${iconName} for ${fileName}`.padEnd(55) +
        colors.reset,
    );
  }

  /**
   * Updates the progress display
   */
  private updateProgress(): void {
    // Progress bar
    drawProgressBar(
      15,
      37,
      55,
      this.processedFiles,
      this.totalFiles,
      `${this.processedFiles}/${this.totalFiles}`,
    );

    // Stats
    moveCursor(39, 15);
    console.log(
      colors.fg.green + `✓ Success: ${this.successCount}  ` +
        colors.fg.red + `✗ Failed: ${this.failCount}  ` +
        colors.fg.cyan +
        `⏭ Skipped: ${
          this.processedFiles - this.successCount - this.failCount
        }` +
        colors.reset,
    );
  }

  /**
   * Shows the final processing results
   */
  private async showResults(): Promise<void> {
    clearScreen();
    displayBanner();

    // Results header
    drawTextWithShadow("PROCESSING COMPLETE", 25, 26, colors.fg.green);

    // Summary box
    drawBox(10, 28, 65, 8, colors.fg.green);

    moveCursor(30, 12);
    console.log(
      colors.fg.brightGreen + colors.bright +
        centerText("═══ SUMMARY ═══", 61) +
        colors.reset,
    );

    // Summary stats
    const summaryLines = [
      `Total Files Processed: ${this.totalFiles}`,
      `Successfully Fixed: ${this.successCount}`,
      `Failed: ${this.failCount}`,
      `Already Had Icons: ${this.skipCount}`,
    ];

    summaryLines.forEach((line, index) => {
      moveCursor(32 + index, 20);
      console.log(colors.fg.white + line + colors.reset);
    });

    // Detailed results box
    if (this.results.some((r) => !r.success)) {
      drawBox(10, 37, 65, 12, colors.fg.red);

      moveCursor(38, 12);
      console.log(
        colors.fg.brightRed +
          centerText("Failed Files", 61) +
          colors.reset,
      );

      drawDivider(11, 39, 63, colors.fg.red);

      // Show failed files
      const failedResults = this.results.filter((r) =>
        !r.success && r.message !== "Not a Steam shortcut"
      );
      let line = 0;
      for (const result of failedResults.slice(0, 7)) {
        moveCursor(41 + line, 12);
        const errorText = this.settings.getSettings().accessibility.verboseMode
          ? `[ERROR] ${basename(result.path)}: ${result.message}`
          : `✗ ${basename(result.path).padEnd(30)} ${result.message}`;
        console.log(
          colors.fg.red + errorText + colors.reset,
        );
        line++;
      }

      if (failedResults.length > 7) {
        moveCursor(48, 12);
        console.log(
          colors.fg.gray + colors.dim +
            centerText(`... and ${failedResults.length - 7} more`, 61) +
            colors.reset,
        );
      }
    }

    // Press any key prompt
    moveCursor(50, 20);
    console.log(
      colors.fg.yellow + colors.blink +
        "Press any key to continue..." +
        colors.reset,
    );

    // Wait for keypress
    try {
      Deno.stdin.setRaw(true);
      const buffer = new Uint8Array(1);
      await Deno.stdin.read(buffer);
    } finally {
      Deno.stdin.setRaw(false);
    }
  }
}
