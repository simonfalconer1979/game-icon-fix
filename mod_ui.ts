/**
 * Main UI module - Entry point for interactive mode
 * Orchestrates the menu system and processing workflows
 */

import { parseArgs } from "jsr:@std/cli@1.0.17/parse-args";
import { extname, join } from "jsr:@std/path@1.0.9";
import { showMainMenu, showSettingsMenu } from "./menu.ts";
import { PathBrowser } from "./browser.ts";
import { IconProcessor } from "./processor.ts";
import { SteamDetector, SteamIconResolver, type SteamInfo } from "./steam_detector.ts";
import { ShortcutManager } from "./shortcut_manager.ts";
import {
  centerText,
  clearScreen,
  colors,
  displayBanner,
  drawBox,
  moveCursor,
  showCursor,
} from "./ui.ts";

// Removed unused constants and functions
// Steam detection is now handled by SteamDetector class

/**
 * Gets comprehensive Steam information with UI feedback
 * @param customPath - Optional custom Steam path
 * @returns Steam installation info
 * @throws Error if Steam not found
 */
async function getSteamInfoWithUI(customPath?: string): Promise<SteamInfo> {
  clearScreen();
  displayBanner();

  drawBox(15, 30, 55, 12, colors.fg.yellow);
  moveCursor(32, 17);
  console.log(
    colors.fg.brightYellow + "🔍 Searching for Steam installation..." +
      colors.reset,
  );

  let steamInfo: SteamInfo | null = null;

  if (customPath) {
    moveCursor(34, 17);
    console.log(
      colors.fg.cyan + `Checking custom path: ${customPath}...`.padEnd(50) + colors.reset,
    );
    
    // Try custom path
    const testInfo: SteamInfo = {
      installPath: customPath,
      configPath: join(customPath, "config"),
      libraries: [{ path: customPath }],
    };
    
    // Verify it's valid
    const iconsPath = join(customPath, "steam/games");
    const isValid = await Deno.stat(iconsPath)
      .then((info) => info.isDirectory)
      .catch(() => false);
    
    if (isValid) {
      steamInfo = testInfo;
    } else {
      throw new Error(`Invalid Steam path: ${customPath}`);
    }
  } else {
    moveCursor(34, 17);
    console.log(
      colors.fg.cyan + "Detecting Steam automatically...".padEnd(50) + colors.reset,
    );
    
    // Use automatic detection
    steamInfo = await SteamDetector.detect();
  }

  if (!steamInfo) {
    throw new Error("Steam installation not found");
  }

  moveCursor(36, 17);
  console.log(colors.fg.green + `✓ Found Steam at: ${steamInfo.installPath}` + colors.reset);
  
  if (steamInfo.libraries.length > 1) {
    moveCursor(37, 17);
    console.log(
      colors.fg.green + `📚 Found ${steamInfo.libraries.length} Steam libraries` + colors.reset,
    );
    
    // Show library paths
    let line = 38;
    for (const lib of steamInfo.libraries.slice(0, 3)) {
      moveCursor(line++, 19);
      console.log(
        colors.fg.white + `• ${lib.path.substring(0, 48)}` + colors.reset,
      );
    }
    
    if (steamInfo.libraries.length > 3) {
      moveCursor(line, 19);
      console.log(
        colors.fg.gray + `  ... and ${steamInfo.libraries.length - 3} more` + colors.reset,
      );
    }
  }
  
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return steamInfo;
}

/**
 * Recursively finds all .url files in a directory
 * @param searchPath - Directory to search
 * @returns Array of .url file paths
 */
async function findUrlFiles(searchPath: string): Promise<string[]> {
  const files: string[] = [];

  async function scan(path: string): Promise<void> {
    const info = await Deno.stat(path).catch(() => null);
    if (!info) return;

    if (info.isDirectory) {
      try {
        for await (const entry of Deno.readDir(path)) {
          await scan(join(path, entry.name));
        }
      } catch (error) {
        // Skip directories we can't read
        if (error instanceof Error) {
          console.error(`Cannot read directory ${path}: ${error.message}`);
        }
      }
    } else if (info.isFile && extname(path) === ".url") {
      files.push(path);
    }
  }

  await scan(searchPath);
  return files;
}

/**
 * Processes Steam shortcuts in the current directory
 * @param steamInfo - Steam installation info
 * @param iconResolver - Icon path resolver
 */
async function processCurrentDirectory(steamInfo: SteamInfo, iconResolver: SteamIconResolver): Promise<void> {
  const cwd = Deno.cwd();
  const files = await findUrlFiles(cwd);

  if (files.length === 0) {
    clearScreen();
    displayBanner();

    drawBox(15, 30, 55, 6, colors.fg.red);
    moveCursor(32, 17);
    console.log(
      colors.fg.brightRed + centerText("No Steam shortcuts found!", 51) +
        colors.reset,
    );
    moveCursor(33, 17);
    console.log(
      colors.fg.white + centerText(`Searched in: ${cwd}`, 51) + colors.reset,
    );

    moveCursor(35, 20);
    console.log(
      colors.fg.yellow + "Press any key to return to menu..." + colors.reset,
    );

    Deno.stdin.setRaw(true);
    await Deno.stdin.read(new Uint8Array(1));
    Deno.stdin.setRaw(false);
    return;
  }

  const processor = new IconProcessor(steamInfo, iconResolver);
  await processor.processFiles(files);
}

/**
 * Processes Steam shortcuts on the user's desktop
 * @param steamInfo - Steam installation info
 * @param iconResolver - Icon path resolver
 */
async function processDesktop(steamInfo: SteamInfo, iconResolver: SteamIconResolver): Promise<void> {
  const homedir = Deno.env.get("USERPROFILE") || Deno.env.get("HOME") || "";
  if (!homedir) {
    throw new Error("Could not determine home directory");
  }
  const desktopPath = join(homedir, "Desktop");

  const files = await findUrlFiles(desktopPath);

  if (files.length === 0) {
    clearScreen();
    displayBanner();

    drawBox(15, 30, 55, 6, colors.fg.red);
    moveCursor(32, 17);
    console.log(
      colors.fg.brightRed +
        centerText("No Steam shortcuts found on Desktop!", 51) + colors.reset,
    );

    moveCursor(35, 20);
    console.log(
      colors.fg.yellow + "Press any key to return to menu..." + colors.reset,
    );

    Deno.stdin.setRaw(true);
    await Deno.stdin.read(new Uint8Array(1));
    Deno.stdin.setRaw(false);
    return;
  }

  const processor = new IconProcessor(steamInfo, iconResolver);
  await processor.processFiles(files);
}

/**
 * Main entry point for UI mode
 */
async function main(): Promise<void> {
  // Check if running with command line args (backwards compatibility)
  const flags = parseArgs(Deno.args, { string: ["steampath"] });

  if (flags._.length > 0 || flags.steampath) {
    // Use original non-UI mode for command line usage
    await import("./mod.ts");
    return;
  }

  // UI mode
  try {
    const steamInfo = await getSteamInfoWithUI(flags.steampath);
    
    // Load installed games for better icon resolution
    clearScreen();
    displayBanner();
    drawBox(15, 30, 55, 6, colors.fg.cyan);
    moveCursor(32, 17);
    console.log(
      colors.fg.brightCyan + "🎮 Loading installed games..." + colors.reset,
    );
    
    const installedGames = await SteamDetector.getInstalledGames(steamInfo);
    const iconResolver = new SteamIconResolver(steamInfo, installedGames);
    
    moveCursor(34, 17);
    console.log(
      colors.fg.green + `✓ Found ${installedGames.size} installed games` + colors.reset,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    while (true) {
      const choice = await showMainMenu();

      switch (choice) {
        case "fix-current":
          await processCurrentDirectory(steamInfo, iconResolver);
          break;

        case "fix-desktop":
          await processDesktop(steamInfo, iconResolver);
          break;

        case "browse": {
          const browser = new PathBrowser(Deno.cwd());
          const selected = await browser.browse();

          if (selected && selected.length > 0) {
            const files = [];
            for (const path of selected) {
              const info = await Deno.stat(path);
              if (info.isDirectory) {
                files.push(...await findUrlFiles(path));
              } else {
                files.push(path);
              }
            }

            if (files.length > 0) {
              const processor = new IconProcessor(steamInfo, iconResolver);
              await processor.processFiles(files);
            }
          }
          break;
        }

        case "select-files": {
          const browser = new PathBrowser(Deno.cwd(), true);
          const selected = await browser.browse();

          if (selected && selected.length > 0) {
            const processor = new IconProcessor(steamInfo, iconResolver);
            await processor.processFiles(selected);
          }
          break;
        }

        case "refresh-all": {
          const manager = new ShortcutManager(steamInfo);
          await manager.refreshAllShortcuts();
          break;
        }

        case "settings":
          await showSettingsMenu();
          break;

        case "exit":
          clearScreen();
          showCursor();
          console.log(
            colors.fg.cyan + "\nThanks for using Steam Icon Fixer!" +
              colors.reset,
          );
          console.log(
            colors.fg.gray + "Made with " + colors.fg.red + "♥" +
              colors.fg.gray + " in retro style\n" + colors.reset,
          );
          Deno.exit(0);
          break;

        default:
          break;
      }
    }
  } catch (error) {
    clearScreen();
    showCursor();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(colors.fg.red + "Error: " + errorMessage + colors.reset);

    if (errorMessage.includes("Steam")) {
      console.log(
        colors.fg.yellow +
          '\nTip: You can specify the Steam path manually with --steampath="path/to/steam"' +
          colors.reset,
      );
    }

    Deno.exit(1);
  }
}

/**
 * Handle Ctrl+C gracefully
 */
if (Deno.build.os !== "windows") {
  // SIGINT handling is not available on Windows
  try {
    Deno.addSignalListener("SIGINT", () => {
      clearScreen();
      showCursor();
      console.log(
        colors.fg.cyan + "\n\nExiting Steam Icon Fixer..." + colors.reset,
      );
      Deno.exit(0);
    });
  } catch {
    // Signal handling not available
  }
}

await main();
