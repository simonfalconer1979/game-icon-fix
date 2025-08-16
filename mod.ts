/**
 * Main entry point for Steam Icon Fixer - Interactive ASCII UI Mode Only
 * Orchestrates the menu system and processing workflows
 */

import { extname, join } from "@std/path";
import { showSettingsMenu, showTopMenu } from "./menu.ts";
import { PathBrowser } from "./browser.ts";
import { IconProcessor } from "./processor.ts";
import { SteamDetector, SteamIconResolver, type SteamInfo } from "./steam_detector.ts";
import { ShortcutManager } from "./shortcut_manager.ts";
import {
  beep,
  centerText,
  clearScreen,
  colors,
  displayTurboPascalBanner,
  drawBox,
  drawBoxWithShadow,
  drawCenteredBoxWithShadow,
  drawStatusBar,
  getScreenSize,
  moveCursor,
  showCursor,
  turboPascal,
  write,
  writeAt,
} from "./ui.ts";
import { ConsoleConfig } from "./console_utils.ts";
import { setupFixedConsole } from "./fixed_console.ts";

/**
 * Gets comprehensive Steam information with UI feedback
 * @param customPath - Optional custom Steam path
 * @returns Steam installation info
 * @throws Error if Steam not found
 */
async function getSteamInfoWithUI(customPath?: string): Promise<SteamInfo> {
  displayTurboPascalBanner();
  
  // Draw title bar at top
  const { width } = getScreenSize();
  writeAt(1, 1, turboPascal.menuBar + centerText("Steam Icon Fixer - Steam Detection", width) + colors.reset);
  
  drawStatusBar(" Detecting Steam Installation...");

  const config = ConsoleConfig.getInstance();
  const icons = config.getIcons();
  
  const dlg = drawCenteredBoxWithShadow(55, 12);
  const innerX = dlg.x + 2;
  let line = dlg.y + 2;
  writeAt(line, innerX,
    turboPascal.windowBg + turboPascal.text + icons.search + " Searching for Steam installation..." +
    colors.reset
  );

  let steamInfo: SteamInfo | null = null;

  if (customPath) {
    line = dlg.y + 4;
    writeAt(line, innerX,
      colors.fg.cyan + `Checking custom path: ${customPath}...`.padEnd(50) + colors.reset
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
    line = dlg.y + 3;
    writeAt(line, innerX,
      turboPascal.windowBg + colors.fg.cyan + "Auto-detecting Steam..." + colors.reset
    );
    
    // Use automatic detection
    steamInfo = await SteamDetector.detect();
  }

  if (!steamInfo) {
    throw new Error("Steam installation not found");
  }

  line = dlg.y + 6;
  writeAt(line, innerX,
    turboPascal.windowBg + colors.fg.brightGreen + icons.success + ` Found Steam at: ${steamInfo.installPath}` + colors.reset
  );
  
  if (steamInfo.libraries.length > 1) {
    line = dlg.y + 7;
    writeAt(line, innerX,
      colors.fg.green + icons.folder + ` Found ${steamInfo.libraries.length} Steam libraries` + colors.reset
    );
    
    // Show library paths
    line = dlg.y + 8;
    for (const lib of steamInfo.libraries.slice(0, 3)) {
      writeAt(line++, innerX + 2,
        colors.fg.white + `${icons.bullet} ${lib.path.substring(0, 48)}` + colors.reset
      );
    }
    
    if (steamInfo.libraries.length > 3) {
      writeAt(line, innerX + 2,
        colors.fg.gray + `  ... and ${steamInfo.libraries.length - 3} more` + colors.reset
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
    displayTurboPascalBanner();
    
    const { width } = getScreenSize();
    writeAt(1, 1, turboPascal.menuBar + centerText("Steam Icon Fixer - No Files Found", width) + colors.reset);
    
    drawStatusBar(" No Files Found");

    const errDlg = drawCenteredBoxWithShadow(55, 8);
    const errInnerX = errDlg.x + 2;
    writeAt(errDlg.y + 2, errInnerX,
      turboPascal.errorBg + turboPascal.errorText + centerText("No Steam shortcuts found!", 51) +
      colors.reset
    );
    writeAt(errDlg.y + 3, errInnerX,
      turboPascal.windowBg + turboPascal.textDim + centerText(`Searched in: ${cwd}`, 51) + colors.reset
    );

    beep(); // DOS beep for error
    writeAt(errDlg.y + 5, errInnerX,
      turboPascal.windowBg + turboPascal.text + "Press any key to return to menu..." + colors.reset
    );

    try {
      Deno.stdin.setRaw(true);
      await Deno.stdin.read(new Uint8Array(1));
      Deno.stdin.setRaw(false);
    } catch {
      // Fallback for Windows where setRaw might fail
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
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
    displayTurboPascalBanner();
    
    const { width } = getScreenSize();
    writeAt(1, 1, turboPascal.menuBar + centerText("Steam Icon Fixer - No Files Found", width) + colors.reset);
    
    drawStatusBar(" No Files Found");

    const errDlg = drawCenteredBoxWithShadow(55, 8);
    const errInnerX = errDlg.x + 2;
    writeAt(errDlg.y + 2, errInnerX,
      turboPascal.errorBg + turboPascal.errorText +
      centerText("No Steam shortcuts found on Desktop!", 51) + colors.reset
    );

    beep(); // DOS beep for error
    writeAt(errDlg.y + 4, errInnerX,
      turboPascal.windowBg + turboPascal.text + "Press any key to return to menu..." + colors.reset
    );

    try {
      Deno.stdin.setRaw(true);
      await Deno.stdin.read(new Uint8Array(1));
      Deno.stdin.setRaw(false);
    } catch {
      // Fallback for Windows where setRaw might fail
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return;
  }

  const processor = new IconProcessor(steamInfo, iconResolver);
  await processor.processFiles(files);
}

/**
 * Main entry point for Interactive ASCII UI mode
 */
export async function main(): Promise<void> {
  // Setup fixed console window (Windows only)
  if (Deno.build.os === "windows") {
    await setupFixedConsole(160, 64, "Steam Icon Fixer v1.0 - SVGA Mode");
  }

  // Initialize console configuration for proper character display
  const consoleConfig = ConsoleConfig.getInstance();
  if (Deno.build.os === "windows") {
    // Try to enable UTF-8 on Windows, fall back to ASCII if it fails
    const utf8Enabled = await consoleConfig.tryEnableUTF8();
    if (!utf8Enabled) {
      console.log("Note: Using ASCII mode for better compatibility");
    }
  }

  // Interactive UI mode
  try {
    const steamInfo = await getSteamInfoWithUI();
    
    // Load installed games for better icon resolution
    clearScreen();
    displayTurboPascalBanner();
    
    const { width } = getScreenSize();
    writeAt(1, 1, turboPascal.menuBar + centerText("Steam Icon Fixer - Loading Games", width) + colors.reset);
    
    const loadDlg = drawCenteredBoxWithShadow(55, 6, colors.fg.cyan);
    const config = ConsoleConfig.getInstance();
    const icons = config.getIcons();
    writeAt(loadDlg.y + 2, loadDlg.x + 2,
      colors.fg.brightCyan + icons.game + " Loading installed games..." + colors.reset
    );
    
    const installedGames = await SteamDetector.getInstalledGames(steamInfo);
    const iconResolver = new SteamIconResolver(steamInfo, installedGames);
    
    writeAt(loadDlg.y + 3, loadDlg.x + 2,
      colors.fg.green + icons.success + ` Found ${installedGames.size} installed games` + colors.reset
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    while (true) {
      const cmd = await showTopMenu();
      if (!cmd) continue;

      // Normalize legacy ids if any appear
      if (cmd === "file:exit" || cmd === "exit") {
        clearScreen();
        showCursor();
        write(colors.fg.cyan + "\nThanks for using Steam Icon Fixer!\n" + colors.reset);
        const heartIcon = config.isAsciiMode() ? "<3" : "♥";
        write(
          colors.fg.gray + "Made with " + colors.fg.red + heartIcon +
          colors.fg.gray + " in retro style\n\n" + colors.reset
        );
        Deno.exit(0);
      }

      switch (cmd) {
        case "actions:fix-current":
        case "fix-current": {
          await processCurrentDirectory(steamInfo, iconResolver);
          break;
        }
        case "actions:fix-desktop":
        case "fix-desktop": {
          await processDesktop(steamInfo, iconResolver);
          break;
        }
        case "actions:browse":
        case "browse": {
          const browser = new PathBrowser(Deno.cwd());
          const selected = await browser.browse();
          if (selected && selected.length > 0) {
            const files: string[] = [];
            for (const selectedPath of selected) {
              const info = await Deno.stat(selectedPath);
              if (info.isDirectory) {
                files.push(...await findUrlFiles(selectedPath));
              } else {
                files.push(selectedPath);
              }
            }
            if (files.length > 0) {
              const processor = new IconProcessor(steamInfo, iconResolver);
              await processor.processFiles(files);
            }
          }
          break;
        }
        case "actions:replace-all":
        case "refresh-all": {
          const manager = new ShortcutManager(steamInfo);
          await manager.refreshAllShortcuts();
          break;
        }
        case "file:settings":
        case "actions:settings":
        case "settings": {
          await showSettingsMenu();
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
        default: {
          // Non-routed commands (view/help/about) can show a simple dialog for now
          displayTurboPascalBanner();
          
          const { width } = getScreenSize();
          writeAt(1, 1, turboPascal.menuBar + centerText("Steam Icon Fixer", width) + colors.reset);
          
          const infoDlg = drawCenteredBoxWithShadow(50, 8);
          writeAt(infoDlg.y + 2, infoDlg.x + 2,
            turboPascal.windowBg + turboPascal.text + `Command: ${cmd}` + colors.reset
          );
          writeAt(infoDlg.y + 4, infoDlg.x + 2,
            turboPascal.windowBg + colors.fg.gray + "Press any key to continue..." + colors.reset
          );
          try {
            Deno.stdin.setRaw(true);
            await Deno.stdin.read(new Uint8Array(1));
            Deno.stdin.setRaw(false);
          } catch {
            // Fallback for Windows where setRaw might fail
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          break;
        }
      }
    }
  } catch (error) {
    clearScreen();
    showCursor();
    const errorMessage = error instanceof Error ? error.message : String(error);
    write(colors.fg.red + "Error: " + errorMessage + colors.reset + "\n");

    if (errorMessage.includes("Steam")) {
      write(
        colors.fg.yellow +
        "\nTip: Steam installation will be detected automatically\n" +
        colors.reset
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
      write(colors.fg.cyan + "\n\nExiting Steam Icon Fixer...\n" + colors.reset);
      Deno.exit(0);
    });
  } catch {
    // Signal handling not available
  }
}

// Only run main if this is the entry module
if (import.meta.main) {
  await main();
}
