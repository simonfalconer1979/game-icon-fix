/**
 * Command-line interface module for Steam Icon Fixer
 * Handles CLI arguments and non-interactive processing
 */

import { parseArgs } from "jsr:@std/cli@1.0.17/parse-args";
import { extname, join, resolve } from "jsr:@std/path@1.0.9";
import { SteamDetector, SteamIconResolver, type SteamInfo } from "./steam_detector.ts";
import { SettingsManager } from "./settings.ts";
import { ShortcutManager } from "./shortcut_manager.ts";

/**
 * Main entry point for CLI mode
 * Launches UI mode if no arguments provided
 */
export async function main(): Promise<void> {
  const flags = parseArgs(Deno.args, { 
    string: ["steampath", "accessibility"],
    boolean: ["refresh-all"]
  });
  
  // Handle accessibility flag
  if (flags.accessibility) {
    const settings = SettingsManager.getInstance();
    
    if (typeof flags.accessibility === "string" && flags.accessibility === "") {
      // Enable basic accessibility
      await settings.updateSettings({
        accessibility: {
          noAnimations: true,
          verboseMode: true,
          simpleAscii: true,
          noBlinking: true,
          highContrast: false,
          largeText: false,
          soundFeedback: false,
          reducedColors: false,
        }
      });
      console.log("♿ Accessibility mode enabled");
    } else {
      // Use preset
      const preset = flags.accessibility as "full" | "vision" | "motion" | "cognitive";
      if (["full", "vision", "motion", "cognitive"].includes(preset)) {
        await settings.enableAccessibilityPreset(preset);
        console.log(`♿ Accessibility preset '${preset}' enabled`);
      } else {
        console.log(`Warning: Unknown accessibility preset '${preset}'`);
      }
    }
  }

  // Handle refresh-all flag
  if (flags["refresh-all"]) {
    const steamInfo = await getSteamInfo(flags.steampath)
      .catch((error) => {
        console.log(error.message);
        console.log(
          `❔ Do you have Steam installed? Try specifying the Steam path manually by adding --steampath="path/to/your/steam"`,
        );
        Deno.exit(1);
      });
    
    const manager = new ShortcutManager(steamInfo);
    await manager.refreshAllShortcuts();
    return;
  }

  // If no arguments provided, launch UI mode
  if (Deno.args.length === 0) {
    await import("./mod_ui.ts");
    return;
  }

  const steamInfo = await getSteamInfo(flags.steampath)
    .catch((error) => {
      console.log(error.message);
      console.log(
        `❔ Do you have Steam installed? Try specifying the Steam path manually by adding --steampath="path/to/your/steam"`,
      );
      Deno.exit(1);
    });

  // Get installed games for better icon resolution
  console.log("🎮 Loading installed games...");
  const installedGames = await SteamDetector.getInstalledGames(steamInfo);
  const settingsInstance = SettingsManager.getInstance();
  const gameCountText = settingsInstance.getSettings().accessibility.verboseMode
    ? `[INFO] Total installed games found: ${installedGames.size}`
    : `📊 Found ${installedGames.size} installed games`;
  console.log(gameCountText + "\n");

  const iconResolver = new SteamIconResolver(steamInfo, installedGames);

  const cwd = Deno.cwd();
  const searchPaths = flags._.length ? flags._.map(String) : ["."];

  for (const searchPath of searchPaths) {
    await processPath(resolve(cwd, searchPath), steamInfo, iconResolver);
  }

  const settingsForSummary = SettingsManager.getInstance();
  
  if (!totalCount) {
    const noFilesText = settingsForSummary.getSettings().accessibility.verboseMode
      ? "[WARNING] No Steam shortcuts (.url files) were found in the specified path"
      : `❔ No Steam shortcuts were found. Did you specify a correct path?`;
    console.log(noFilesText);
  } else {
    const summaryText = settingsForSummary.getSettings().accessibility.verboseMode
      ? `[COMPLETE] Successfully fixed ${fixedCount} icons out of ${totalCount} total shortcuts`
      : `✨ Fixed ${fixedCount} of ${totalCount} shortcut icons`;
    console.log(summaryText);
  }
}

/**
 * Gets comprehensive Steam information including all libraries
 * @param customPath - Optional explicit Steam path
 * @returns Steam installation info
 * @throws Error if Steam not found
 */
async function getSteamInfo(customPath?: string): Promise<SteamInfo> {
  console.log("🔍 Searching for Steam installation...");

  let steamInfo: SteamInfo | null = null;

  if (customPath) {
    // Try custom path first
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
      console.log(`✅ Using custom Steam path: ${customPath}`);
    } else {
      throw new Error(`❌ Invalid Steam path: ${customPath}`);
    }
  } else {
    // Use automatic detection
    steamInfo = await SteamDetector.detect();
  }

  if (!steamInfo) {
    throw new Error("❌ Steam installation not found");
  }

  console.log(`📁 Found Steam at: ${steamInfo.installPath}`);
  
  if (steamInfo.libraries.length > 1) {
    console.log(`📚 Found ${steamInfo.libraries.length} Steam libraries:`);
    for (const lib of steamInfo.libraries) {
      console.log(`   • ${lib.path}${lib.label ? ` (${lib.label})` : ""}`);
    }
  }

  return steamInfo;
}

let totalCount = 0;
let fixedCount = 0;

/**
 * Processes a single Steam shortcut file
 * @param shortcutPath - Path to the .url file
 * @param steamInfo - Steam installation info
 * @param iconResolver - Icon path resolver
 */
async function processShortcut(
  shortcutPath: string,
  steamInfo: SteamInfo,
  iconResolver: SteamIconResolver,
): Promise<void> {
  const linkContent = await Deno.readTextFile(shortcutPath);

  const appId = linkContent.match(/rungameid\/(.+)/m)?.[1];
  if (!appId) {
    return; // Not a Steam shortcut
  }

  totalCount++;

  const iconPath = linkContent.match(/IconFile=(.+)/);
  if (!iconPath) {
    return console.log(`❌ ${shortcutPath} - icon file path missing\n`);
  }

  const iconName = iconPath[1].split("\\").pop()!;
  
  // Get all possible icon paths
  const possiblePaths = await iconResolver.resolveIconPaths(appId, iconName);
  
  // Check if icon already exists in any location
  let iconExists = false;
  for (const path of possiblePaths) {
    const exists = await Deno.stat(path)
      .then((info) => info.isFile)
      .catch(() => false);
    if (exists) {
      iconExists = true;
      break;
    }
  }
  
  if (iconExists) {
    return; // Icon already exists
  }

  // Get CDN URLs to try
  const iconUrls = iconResolver.getIconUrls(appId, iconName);
  console.log(`🌐 Fetching ${iconName}`);

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
    return console.log(`🚫 ${iconName} - failed to fetch: ${lastError}\n`);
  }

  // Save to the primary Steam icons directory
  const savePath = possiblePaths[0] || join(steamInfo.installPath, "steam/games", iconName);
  console.log(`💾 Saving ${iconName}`);
  
  // Ensure directory exists
  const saveDir = savePath.substring(0, savePath.lastIndexOf("/"));
  await Deno.mkdir(saveDir, { recursive: true }).catch(() => {});
  
  await Deno.writeFile(savePath, new Uint8Array(iconBuffer));

  fixedCount++;
  console.log(`☑️ ${shortcutPath}\n`);
}

/**
 * Recursively processes a path (file or directory)
 * @param path - Path to process
 * @param steamInfo - Steam installation info
 * @param iconResolver - Icon path resolver
 */
async function processPath(
  path: string,
  steamInfo: SteamInfo,
  iconResolver: SteamIconResolver,
): Promise<void> {
  const info = await Deno.stat(path).catch(() => null);
  if (!info) return;
  if (info.isDirectory) {
    try {
      for await (const entry of Deno.readDir(path)) {
        await processPath(join(path, entry.name), steamInfo, iconResolver);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to read directory ${path}: ${error.message}`);
      }
    }
  } else if (info.isFile && extname(path) === ".url") {
    await processShortcut(path, steamInfo, iconResolver).catch((error) => {
      if (error instanceof Error) {
        console.error(`Error processing ${path}: ${error.message}`);
      }
    });
  }
}

// Only run main if this is the entry module
if (import.meta.main) {
  await main();
}
