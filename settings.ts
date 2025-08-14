/**
 * Settings module for Steam Icon Fixer
 * Manages user preferences including accessibility options
 */

import { join } from "jsr:@std/path@1.0.9";

/**
 * Application settings interface
 */
export interface AppSettings {
  accessibility: AccessibilitySettings;
  ui: UISettings;
  performance: PerformanceSettings;
  steam: SteamSettings;
}

/**
 * Accessibility settings for users with special needs
 */
export interface AccessibilitySettings {
  /** Disable all animations and spinners */
  noAnimations: boolean;
  /** Use high contrast colors */
  highContrast: boolean;
  /** Add text labels to all color-coded information */
  verboseMode: boolean;
  /** Use larger text spacing */
  largeText: boolean;
  /** Disable blinking text */
  noBlinking: boolean;
  /** Use simple ASCII instead of Unicode box drawing */
  simpleAscii: boolean;
  /** Enable sound feedback */
  soundFeedback: boolean;
  /** Reduce colors to essential only */
  reducedColors: boolean;
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
  accessibility: {
    noAnimations: false,
    highContrast: false,
    verboseMode: false,
    largeText: false,
    noBlinking: false,
    simpleAscii: false,
    soundFeedback: false,
    reducedColors: false,
  },
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
    
    if (loaded?.accessibility) {
      merged.accessibility = { ...defaults.accessibility, ...loaded.accessibility };
    }
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
    if (updates.accessibility) {
      this.settings.accessibility = { ...this.settings.accessibility, ...updates.accessibility };
    }
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
   * Enable accessibility preset
   */
  async enableAccessibilityPreset(preset: "full" | "vision" | "motion" | "cognitive"): Promise<void> {
    const updates: AccessibilitySettings = { ...this.settings.accessibility };
    
    switch (preset) {
      case "full":
        updates.noAnimations = true;
        updates.highContrast = true;
        updates.verboseMode = true;
        updates.largeText = true;
        updates.noBlinking = true;
        updates.simpleAscii = true;
        updates.reducedColors = true;
        break;
        
      case "vision":
        updates.highContrast = true;
        updates.largeText = true;
        updates.verboseMode = true;
        updates.soundFeedback = true;
        break;
        
      case "motion":
        updates.noAnimations = true;
        updates.noBlinking = true;
        break;
        
      case "cognitive":
        updates.verboseMode = true;
        updates.simpleAscii = true;
        updates.reducedColors = true;
        break;
    }
    
    await this.updateSettings({ accessibility: updates });
  }

  /**
   * Check if any accessibility features are enabled
   */
  hasAccessibilityEnabled(): boolean {
    const a = this.settings.accessibility;
    return a.noAnimations || a.highContrast || a.verboseMode || 
           a.largeText || a.noBlinking || a.simpleAscii || 
           a.soundFeedback || a.reducedColors;
  }

  /**
   * Get appropriate color based on settings
   */
  getColor(type: "success" | "error" | "warning" | "info" | "primary" | "secondary"): string {
    if (this.settings.accessibility.reducedColors) {
      // Reduced color mode - only essential colors
      switch (type) {
        case "error": return "\x1b[91m"; // Bright red
        case "success": return "\x1b[92m"; // Bright green
        default: return "\x1b[97m"; // Bright white
      }
    }
    
    if (this.settings.accessibility.highContrast) {
      // High contrast mode
      switch (type) {
        case "success": return "\x1b[92m"; // Bright green
        case "error": return "\x1b[91m"; // Bright red
        case "warning": return "\x1b[93m"; // Bright yellow
        case "info": return "\x1b[96m"; // Bright cyan
        case "primary": return "\x1b[97m"; // Bright white
        case "secondary": return "\x1b[90m"; // Bright black (gray)
        default: return "\x1b[97m";
      }
    }
    
    // Default colors
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
   * Get status text with accessibility considerations
   */
  getStatusText(type: "success" | "error" | "warning" | "info", symbol: string, text: string): string {
    if (this.settings.accessibility.verboseMode) {
      // Add text labels for screen readers
      const label = type.toUpperCase();
      return `${symbol} [${label}] ${text}`;
    }
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
    if (this.settings.accessibility.simpleAscii) {
      return {
        topLeft: "+",
        topRight: "+",
        bottomLeft: "+",
        bottomRight: "+",
        horizontal: "-",
        vertical: "|",
      };
    }
    
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