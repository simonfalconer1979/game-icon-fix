/**
 * Enhanced UI Manager for Steam Icon Fixer
 * Provides consistent UI operations with accessibility support
 */

import { SettingsManager } from "./settings.ts";
import { colors } from "./ui.ts";

/**
 * Manages UI state and operations consistently
 */
export class UIManager {
  private static instance: UIManager;
  private cursorStack: boolean[] = [];
  private settings: SettingsManager;
  private animationTimers: Map<string, number> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();

  private constructor() {
    this.settings = SettingsManager.getInstance();
  }

  /**
   * Get the UIManager instance
   */
  static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  /**
   * Push cursor state and set new visibility
   */
  pushCursor(visible: boolean): void {
    const currentSettings = this.settings.getSettings();
    if (!currentSettings.ui.manageCursor) return;
    
    // Save current state
    this.cursorStack.push(true); // We don't have a way to get current state
    this.setCursorVisible(visible);
  }

  /**
   * Pop cursor state and restore
   */
  popCursor(): void {
    const currentSettings = this.settings.getSettings();
    if (!currentSettings.ui.manageCursor) return;
    
    const previousState = this.cursorStack.pop();
    if (previousState !== undefined) {
      this.setCursorVisible(previousState);
    }
  }

  /**
   * Set cursor visibility
   */
  private setCursorVisible(visible: boolean): void {
    if (visible) {
      Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?25h"));
    } else {
      Deno.stdout.writeSync(new TextEncoder().encode("\x1b[?25l"));
    }
  }

  /**
   * Clear screen with accessibility considerations
   */
  clearScreen(): void {
    const settings = this.settings.getSettings();
    
    if (settings.accessibility.noAnimations) {
      // Simple clear without animation
      console.clear();
    } else {
      // Standard clear with cursor reset
      Deno.stdout.writeSync(new TextEncoder().encode("\x1b[2J\x1b[H"));
    }
  }

  /**
   * Smart path truncation
   */
  smartTruncatePath(path: string, maxLen: number): string {
    const settings = this.settings.getSettings();
    
    if (path.length <= maxLen) return path;
    
    switch (settings.ui.pathTruncation) {
      case "smart": {
        // Keep drive/root and last folder
        const parts = path.replace(/\\/g, "/").split("/");
        if (parts.length <= 2) {
          return this.truncateMiddle(path, maxLen);
        }
        
        const drive = parts[0];
        const lastTwo = parts.slice(-2).join("/");
        const result = `${drive}/.../${lastTwo}`;
        
        if (result.length > maxLen) {
          return this.truncateEnd(path, maxLen);
        }
        return result;
      }
      
      case "middle":
        return this.truncateMiddle(path, maxLen);
        
      case "end":
      default:
        return this.truncateEnd(path, maxLen);
    }
  }

  /**
   * Truncate string in the middle
   */
  private truncateMiddle(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    
    const ellipsis = "...";
    const availableLen = maxLen - ellipsis.length;
    const startLen = Math.ceil(availableLen / 2);
    const endLen = Math.floor(availableLen / 2);
    
    return str.substring(0, startLen) + ellipsis + str.substring(str.length - endLen);
  }

  /**
   * Truncate string at the end
   */
  private truncateEnd(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + "...";
  }

  /**
   * Show confirmation dialog
   */
  async confirmAction(message: string, title = "Confirm Action"): Promise<boolean> {
    const settings = this.settings.getSettings();
    
    if (!settings.ui.confirmActions) {
      return true; // Auto-confirm if disabled
    }
    
    this.pushCursor(false);
    
    const width = Math.max(message.length + 4, 40);
    const colorScheme = this.settings.getColor("warning");
    
    // Clear area for dialog
    console.log("\n".repeat(3));
    
    // Draw box
    this.drawDialogBox(title, message, width, colorScheme);
    
    // Show options
    console.log(colorScheme + "  Press [Y] to confirm, [N] to cancel" + colors.reset);
    
    if (settings.accessibility.verboseMode) {
      console.log(colors.dim + "  [CONFIRMATION REQUIRED] " + colors.reset);
    }
    
    // Read user input
    Deno.stdin.setRaw(true);
    const buffer = new Uint8Array(1);
    await Deno.stdin.read(buffer);
    Deno.stdin.setRaw(false);
    
    const key = String.fromCharCode(buffer[0]).toLowerCase();
    
    this.popCursor();
    
    // Clear dialog area
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[5A\x1b[J")); // Move up 5 lines and clear
    
    return key === 'y';
  }

  /**
   * Draw a dialog box
   */
  private drawDialogBox(title: string, message: string, width: number, color: string): void {
    const boxChars = this.settings.getBoxChars();
    
    // Top border
    console.log(color + boxChars.topLeft + boxChars.horizontal.repeat(width - 2) + boxChars.topRight);
    
    // Title
    const paddedTitle = ` ${title} `;
    const titlePadding = Math.floor((width - paddedTitle.length) / 2);
    console.log(
      color + boxChars.vertical +
      " ".repeat(titlePadding) +
      colors.bright + paddedTitle + colors.reset + color +
      " ".repeat(width - titlePadding - paddedTitle.length - 2) +
      boxChars.vertical
    );
    
    // Separator
    console.log(color + boxChars.vertical + boxChars.horizontal.repeat(width - 2) + boxChars.vertical);
    
    // Message
    const messagePadding = Math.floor((width - message.length - 2) / 2);
    console.log(
      color + boxChars.vertical +
      " ".repeat(messagePadding) +
      colors.reset + message + color +
      " ".repeat(width - messagePadding - message.length - 2) +
      boxChars.vertical
    );
    
    // Bottom border
    console.log(color + boxChars.bottomLeft + boxChars.horizontal.repeat(width - 2) + boxChars.bottomRight + colors.reset);
  }

  /**
   * Show status with accessibility text
   */
  showStatus(
    type: "success" | "error" | "warning" | "info",
    message: string,
    icon?: string
  ): void {
    const settings = this.settings.getSettings();
    const color = this.settings.getColor(type);
    const defaultIcons = {
      success: "✓",
      error: "✗",
      warning: "⚠",
      info: "ℹ",
    };
    
    const symbol = icon || defaultIcons[type];
    const text = this.settings.getStatusText(type, symbol, message);
    
    console.log(color + text + colors.reset);
    
    // Sound feedback if enabled
    if (settings.accessibility.soundFeedback) {
      this.playSound(type);
    }
  }

  /**
   * Play sound feedback (placeholder - would need actual implementation)
   */
  private playSound(type: "success" | "error" | "warning" | "info"): void {
    // In a real implementation, this would play system sounds
    // For now, we'll use console beep for errors
    if (type === "error") {
      Deno.stdout.writeSync(new TextEncoder().encode("\x07")); // Bell character
    }
  }

  /**
   * Debounced animation update
   */
  debounceAnimation(id: string, callback: () => void, delay?: number): void {
    const settings = this.settings.getSettings();
    
    if (settings.accessibility.noAnimations) {
      // Skip animations in accessibility mode
      return;
    }
    
    const actualDelay = delay || settings.performance.debounceDelay;
    
    // Clear existing timer
    const existingTimer = this.animationTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      callback();
      this.animationTimers.delete(id);
    }, actualDelay);
    
    this.animationTimers.set(id, timer);
  }

  /**
   * Rate-limited update
   */
  rateLimitUpdate(id: string, callback: () => void, minInterval?: number): boolean {
    const settings = this.settings.getSettings();
    const interval = minInterval || settings.performance.animationSpeed;
    
    const lastUpdate = this.lastUpdateTime.get(id) || 0;
    const now = Date.now();
    
    if (now - lastUpdate < interval) {
      return false; // Skip this update
    }
    
    this.lastUpdateTime.set(id, now);
    callback();
    return true;
  }

  /**
   * Show progress with accessibility support
   */
  showProgress(current: number, total: number, label = ""): void {
    const settings = this.settings.getSettings();
    
    if (settings.accessibility.noAnimations) {
      // Simple text progress
      const percent = Math.round((current / total) * 100);
      console.log(`Progress: ${current}/${total} (${percent}%) ${label}`);
      return;
    }
    
    // Visual progress bar
    const width = 40;
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    const percent = Math.round((current / total) * 100);
    
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const color = this.settings.getColor("primary");
    
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${color}[${bar}] ${percent}% ${label}${colors.reset}`));
    
    if (current === total) {
      console.log(); // New line when complete
    }
  }

  /**
   * Show spinner with accessibility support
   */
  private spinnerIndex = 0;
  private spinnerChars = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];
  
  showSpinner(label: string): void {
    const settings = this.settings.getSettings();
    
    if (settings.accessibility.noAnimations) {
      // Static loading indicator
      console.log(`[LOADING] ${label}`);
      return;
    }
    
    const spinner = this.spinnerChars[this.spinnerIndex];
    this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerChars.length;
    
    const color = this.settings.getColor("info");
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${color}${spinner} ${label}${colors.reset}`));
  }

  /**
   * Clear current line
   */
  clearLine(): void {
    Deno.stdout.writeSync(new TextEncoder().encode("\r" + " ".repeat(80) + "\r"));
  }

  /**
   * Move cursor with bounds checking
   */
  moveCursor(row: number, col: number): void {
    // Ensure positive values
    const safeRow = Math.max(1, row);
    const safeCol = Math.max(1, col);
    
    Deno.stdout.writeSync(
      new TextEncoder().encode(`\x1b[${safeRow};${safeCol}H`)
    );
  }

  /**
   * Get formatted help text
   */
  getHelpText(commands: Array<{ key: string; description: string }>): string {
    const settings = this.settings.getSettings();
    
    if (!settings.ui.showHelp) {
      return "";
    }
    
    const items = commands.map(cmd => {
      if (settings.accessibility.verboseMode) {
        return `[KEY: ${cmd.key}] ${cmd.description}`;
      }
      return `${cmd.key} ${cmd.description}`;
    });
    
    return items.join(" │ ");
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Clear all animation timers
    for (const timer of this.animationTimers.values()) {
      clearTimeout(timer);
    }
    this.animationTimers.clear();
    
    // Reset cursor
    this.setCursorVisible(true);
    
    // Clear any pending output
    this.clearLine();
  }
}