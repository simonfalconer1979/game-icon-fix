/**
 * Settings module for Steam Icon Fixer
 * Manages user preferences
 */

import { join } from "jsr:@std/path@1.0.9";

/**
 * Application settings interface
 */
export interface AppSettings {
  ui: UISettings;
  performance: PerformanceSettings;
  steam: SteamSettings;
}


/**
 * UI customization settings
 */
export interface UISettings {
  /** Color theme */
  theme: "default" | "high-contrast" | "monochrome" | "colorblind";
  /** Show help text at bottom of screens */
  showHelp: boolean;
  /** Enable cursor visibility management */
  manageCursor: boolean;
  /** Path truncation style */
  pathTruncation: "smart" | "middle" | "end";
  /** Confirm before destructive actions */
  confirmActions: boolean;
  /** Show file counts in browser */
  showCounts: boolean;
}

/**
 * Performance settings
 */
export interface PerformanceSettings {
  /** Animation update interval in ms */
  animationSpeed: number;
  /** Debounce delay for UI updates */
  debounceDelay: number;
  /** Max files to show in browser */
  maxFilesDisplay: number;
  /** Enable parallel downloads */
  parallelDownloads: boolean;
  /** Download timeout in seconds */
  downloadTimeout: number;
}

/**
 * Steam-specific settings
 */
export interface SteamSettings {
  /** Custom Steam path */
  customPath?: string;
  /** Preferred CDN */
  preferredCDN: "cloudflare" | "akamai" | "direct" | "auto";
  /** Skip existing icons */
  skipExisting: boolean;
  /** Verify icon integrity */
  verifyIcons: boolean;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  ui: {
    theme: "default",
    showHelp: true,
    manageCursor: true,
    pathTruncation: "smart",
    confirmActions: true,
    showCounts: true,
  },
  performance: {
    animationSpeed: 100,
    debounceDelay: 50,
    maxFilesDisplay: 100,
    parallelDownloads: true,
    downloadTimeout: 30,
  },
  steam: {
    preferredCDN: "auto",
    skipExisting: true,
    verifyIcons: false,
  },
};

/**
 * Settings manager singleton
 */
export class SettingsManager {
  private static instance: SettingsManager;
  private settings: AppSettings;
  private settingsPath: string;

  private constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.settingsPath = this.getSettingsPath();
    this.load();
  }

  /**
   * Get the settings manager instance
   */
  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Get settings file path
   */
  private getSettingsPath(): string {
    const home = Deno.env.get("USERPROFILE") || Deno.env.get("HOME") || "";
    return join(home, ".steam-icon-fixer", "settings.json");
  }

  /**
   * Load settings from file
   */
  async load(): Promise<void> {
    try {
      const content = await Deno.readTextFile(this.settingsPath);
      const loaded = JSON.parse(content);
      this.settings = this.mergeSettings(DEFAULT_SETTINGS, loaded);
    } catch {
      // File doesn't exist or is invalid, use defaults
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save settings to file
   */
  async save(): Promise<void> {
    try {
      const dir = this.settingsPath.substring(0, this.settingsPath.lastIndexOf("/"));
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        this.settingsPath,
        JSON.stringify(this.settings, null, 2)
      );
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  /**
   * Merge loaded settings with defaults
   */
  private mergeSettings(defaults: AppSettings, loaded: Partial<AppSettings>): AppSettings {
    const merged = { ...defaults };
    
    if (loaded?.ui) {
      merged.ui = { ...defaults.ui, ...loaded.ui };
    }
    if (loaded?.performance) {
      merged.performance = { ...defaults.performance, ...loaded.performance };
    }
    if (loaded?.steam) {
      merged.steam = { ...defaults.steam, ...loaded.steam };
    }
    
    return merged;
  }

  /**
   * Get current settings
   */
  getSettings(): AppSettings {
    return this.settings;
  }

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    if (updates.ui) {
      this.settings.ui = { ...this.settings.ui, ...updates.ui };
    }
    if (updates.performance) {
      this.settings.performance = { ...this.settings.performance, ...updates.performance };
    }
    if (updates.steam) {
      this.settings.steam = { ...this.settings.steam, ...updates.steam };
    }
    
    await this.save();
  }



  /**
   * Get appropriate color based on settings
   */
  getColor(type: "success" | "error" | "warning" | "info" | "primary" | "secondary"): string {
    // Standard colors
    switch (type) {
      case "success": return "\x1b[32m"; // Green
      case "error": return "\x1b[31m"; // Red
      case "warning": return "\x1b[33m"; // Yellow
      case "info": return "\x1b[36m"; // Cyan
      case "primary": return "\x1b[94m"; // Bright blue
      case "secondary": return "\x1b[37m"; // White
      default: return "\x1b[0m";
    }
  }

  /**
   * Get status text
   */
  getStatusText(type: "success" | "error" | "warning" | "info", symbol: string, text: string): string {
    return `${symbol} ${text}`;
  }

  /**
   * Get box drawing characters based on settings
   */
  getBoxChars(): {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    horizontal: string;
    vertical: string;
  } {
    
    return {
      topLeft: "╔",
      topRight: "╗",
      bottomLeft: "╚",
      bottomRight: "╝",
      horizontal: "═",
      vertical: "║",
    };
  }
}