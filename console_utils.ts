/**
 * Console utility module for handling Windows console encoding issues
 * Provides character set detection and ASCII fallbacks
 */

/**
 * Box drawing character sets for different console encodings
 */
export interface BoxChars {
  horizontal: string;
  vertical: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  cross: string;
  horizontalDown: string;
  horizontalUp: string;
  verticalRight: string;
  verticalLeft: string;
}

/**
 * UTF-8 box drawing characters (may not display correctly on Windows)
 */
export const UTF8_BOX: BoxChars = {
  horizontal: "═",
  vertical: "║",
  topLeft: "╔",
  topRight: "╗",
  bottomLeft: "╚",
  bottomRight: "╝",
  cross: "╬",
  horizontalDown: "╦",
  horizontalUp: "╩",
  verticalRight: "╠",
  verticalLeft: "╣",
};

/**
 * ASCII box drawing characters (compatible with all consoles)
 */
export const ASCII_BOX: BoxChars = {
  horizontal: "=",
  vertical: "|",
  topLeft: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomRight: "+",
  cross: "+",
  horizontalDown: "+",
  horizontalUp: "+",
  verticalRight: "+",
  verticalLeft: "+",
};

/**
 * Simple line box drawing characters (fallback)
 */
export const SIMPLE_BOX: BoxChars = {
  horizontal: "-",
  vertical: "|",
  topLeft: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomRight: "+",
  cross: "+",
  horizontalDown: "+",
  horizontalUp: "+",
  verticalRight: "+",
  verticalLeft: "+",
};

/**
 * Icon character sets for different console encodings
 */
export interface IconChars {
  success: string;
  error: string;
  warning: string;
  info: string;
  arrow: string;
  bullet: string;
  check: string;
  cross: string;
  search: string;
  folder: string;
  game: string;
  settings: string;
  refresh: string;
  accessibility: string;
  help: string;
  exit: string;
}

/**
 * UTF-8 icon characters (may not display correctly on Windows)
 */
export const UTF8_ICONS: IconChars = {
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
  arrow: "▶",
  bullet: "•",
  check: "☑",
  cross: "☒",
  search: "🔍",
  folder: "📁",
  game: "🎮",
  settings: "⚙",
  refresh: "🔄",
  accessibility: "♿",
  help: "❓",
  exit: "🚪",
};

/**
 * ASCII icon characters (compatible with all consoles)
 */
export const ASCII_ICONS: IconChars = {
  success: "[OK]",
  error: "[X]",
  warning: "[!]",
  info: "[i]",
  arrow: ">",
  bullet: "*",
  check: "[x]",
  cross: "[ ]",
  search: "[?]",
  folder: "[D]",
  game: "[G]",
  settings: "[S]",
  refresh: "[R]",
  accessibility: "[A]",
  help: "[?]",
  exit: "[Q]",
};

/**
 * Detects if the console supports UTF-8 characters properly
 * @returns true if UTF-8 is supported, false otherwise
 */
export function isUTF8Supported(): boolean {
  // Check if user has explicitly requested ASCII mode
  try {
    const forceAscii = Deno.env.get("STEAM_FIXER_ASCII");
    if (forceAscii === "1" || forceAscii === "true") {
      return false;
    }
  } catch {
    // Environment variable access may fail
  }
  
  // Check if we're on Windows
  if (Deno.build.os !== "windows") {
    return true; // Non-Windows systems usually support UTF-8
  }

  // Check for Windows Terminal or other modern terminals
  try {
    const WT_SESSION = Deno.env.get("WT_SESSION");
    const TERM_PROGRAM = Deno.env.get("TERM_PROGRAM");
    const TERMINAL_EMULATOR = Deno.env.get("TERMINAL_EMULATOR");
    
    if (WT_SESSION || TERM_PROGRAM === "vscode" || TERMINAL_EMULATOR) {
      return true; // Modern terminals support UTF-8
    }
  } catch {
    // Environment variable access may fail
  }

  // Default to ASCII on Windows console for safety
  // Traditional Windows console (cmd.exe) has poor UTF-8 support
  return false;
}

/**
 * Checks if the Windows console is using UTF-8 code page
 * @returns true if code page 65001 (UTF-8) is active
 */
export async function checkUTF8CodePage(): Promise<boolean> {
  if (Deno.build.os !== "windows") {
    return true;
  }
  
  try {
    const cmd = new Deno.Command("cmd", {
      args: ["/c", "chcp"],
      stdout: "piped",
      stderr: "piped",
    });
    
    const { stdout } = await cmd.output();
    const output = new TextDecoder().decode(stdout);
    
    if (output.includes("65001")) {
      return true; // UTF-8 code page is active
    }
  } catch {
    // If we can't check, assume no UTF-8
  }
  
  return false;
}

/**
 * Sets the Windows console to UTF-8 mode if possible
 * @returns true if successful, false otherwise
 */
export async function enableUTF8Console(): Promise<boolean> {
  if (Deno.build.os !== "windows") {
    return true; // Not needed on non-Windows
  }

  try {
    // Try to set code page to UTF-8
    const cmd = new Deno.Command("cmd", {
      args: ["/c", "chcp", "65001"],
      stdout: "piped",
      stderr: "piped",
    });
    
    await cmd.output();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the appropriate character set based on console capabilities
 * @param forceAscii - Force ASCII mode regardless of detection
 * @returns The appropriate box drawing characters
 */
export function getBoxChars(forceAscii = false): BoxChars {
  if (forceAscii || !isUTF8Supported()) {
    return ASCII_BOX;
  }
  return UTF8_BOX;
}

/**
 * Gets the appropriate icon set based on console capabilities
 * @param forceAscii - Force ASCII mode regardless of detection
 * @returns The appropriate icon characters
 */
export function getIconChars(forceAscii = false): IconChars {
  if (forceAscii || !isUTF8Supported()) {
    return ASCII_ICONS;
  }
  return UTF8_ICONS;
}

/**
 * Console configuration singleton
 */
export class ConsoleConfig {
  private static instance: ConsoleConfig;
  private useAscii: boolean;
  private boxChars: BoxChars;
  private iconChars: IconChars;

  private constructor() {
    // Start with safe default based on OS and terminal detection
    this.useAscii = !isUTF8Supported();
    this.boxChars = this.useAscii ? ASCII_BOX : UTF8_BOX;
    this.iconChars = this.useAscii ? ASCII_ICONS : UTF8_ICONS;
    
    // Asynchronously check and update if needed
    if (Deno.build.os === "windows" && !this.useAscii) {
      checkUTF8CodePage().then(isUTF8 => {
        if (!isUTF8) {
          this.useAscii = true;
          this.boxChars = ASCII_BOX;
          this.iconChars = ASCII_ICONS;
        }
      });
    }
  }

  static getInstance(): ConsoleConfig {
    if (!ConsoleConfig.instance) {
      ConsoleConfig.instance = new ConsoleConfig();
    }
    return ConsoleConfig.instance;
  }

  /**
   * Force ASCII mode
   */
  forceAsciiMode(): void {
    this.useAscii = true;
    this.boxChars = ASCII_BOX;
    this.iconChars = ASCII_ICONS;
  }

  /**
   * Try to enable UTF-8 mode
   */
  async tryEnableUTF8(): Promise<boolean> {
    const success = await enableUTF8Console();
    if (success) {
      this.useAscii = false;
      this.boxChars = UTF8_BOX;
      this.iconChars = UTF8_ICONS;
    }
    return success;
  }

  /**
   * Get current box drawing characters
   */
  getBox(): BoxChars {
    return this.boxChars;
  }

  /**
   * Get current icon characters
   */
  getIcons(): IconChars {
    return this.iconChars;
  }

  /**
   * Check if using ASCII mode
   */
  isAsciiMode(): boolean {
    return this.useAscii;
  }
}