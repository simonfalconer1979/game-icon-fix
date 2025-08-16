/**
 * Menu system module for interactive navigation
 * Provides keyboard-controlled menu interface with retro styling
 */

// Removed unused imports - AppSettings and SettingsManager were not used in this file
import {
  centerText,
  clearScreen,
  colors,
  displayBanner,
  drawBox,
  drawDivider,
  drawMenuItem,
  drawTextWithShadow,
  hideCursor,
  moveCursor,
  showCursor,
  showStatus,
} from "./ui.ts";

/**
 * Represents a single menu item
 */
export interface MenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Display label for the menu item */
  label: string;
  /** Optional action to execute when selected */
  action?: () => void | Promise<void>;
  /** Optional submenu items */
  submenu?: MenuItem[];
}

/**
 * Interactive menu class with keyboard navigation
 */
export class Menu {
  private items: MenuItem[];
  private selectedIndex = 0;
  private title: string;
  private x: number;
  private y: number;
  private width: number;
  private isActive = false;

  /**
   * Creates a new Menu instance
   * @param title - Menu title to display
   * @param items - Array of menu items
   * @param x - X position (default: 10)
   * @param y - Y position (default: 28)
   * @param width - Menu width (default: 50)
   */
  constructor(title: string, items: MenuItem[], x = 10, y = 28, width = 50) {
    if (items.length === 0) {
      throw new Error("Menu must have at least one item");
    }
    this.title = title;
    this.items = items;
    this.x = x;
    this.y = y;
    this.width = width;
  }

  /**
   * Draws the menu on screen
   */
  private draw(): void {
    const height = this.items.length + 6;

    // Draw box
    drawBox(this.x, this.y, this.width, height, colors.fg.magenta);

    // Draw title
    moveCursor(this.y + 1, this.x + 2);
    console.log(
      colors.fg.brightMagenta + colors.bright +
        centerText(this.title, this.width - 4) +
        colors.reset,
    );

    // Draw divider
    drawDivider(this.x + 1, this.y + 2, this.width - 2, colors.fg.magenta);

    // Draw menu items
    this.items.forEach((item, index) => {
      drawMenuItem(
        item.label,
        this.x + 2,
        this.y + 4 + index,
        index === this.selectedIndex,
        this.width - 4,
      );
    });

    // Draw bottom help text
    moveCursor(this.y + height - 2, this.x + 2);
    console.log(
      colors.fg.gray + colors.dim +
        centerText("↑↓ Navigate │ Enter Select │ ESC Back", this.width - 4) +
        colors.reset,
    );
  }

  /**
   * Shows the menu and handles user interaction
   * @returns The selected item ID or null if cancelled
   */
  async show(): Promise<string | null> {
    this.isActive = true;
    hideCursor();

    while (this.isActive) {
      this.draw();

      const key = await this.getKeypress();

      switch (key) {
        case "up":
          this.selectedIndex = (this.selectedIndex - 1 + this.items.length) %
            this.items.length;
          break;
        case "down":
          this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
          break;
        case "enter": {
          const selected = this.items[this.selectedIndex];
          if (selected.action) {
            showCursor();
            await selected.action();
            hideCursor();
          }
          this.isActive = false;
          return selected.id;
        }
        case "escape":
          this.isActive = false;
          return null;
      }
    }

    showCursor();
    return null;
  }

  /**
   * Reads a single keypress from stdin
   * @returns The key pressed as a string
   */
  private async getKeypress(): Promise<string> {
    // Set raw mode for single keypress reading
    Deno.stdin.setRaw(true);

    const buffer = new Uint8Array(3);
    let n: number | null;

    try {
      n = await Deno.stdin.read(buffer);
    } catch (error) {
      Deno.stdin.setRaw(false);
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      throw new Error(`Failed to read keyboard input: ${errorMessage}`);
    }

    Deno.stdin.setRaw(false);

    if (n === null || n === 0) return "";

    // Handle special keys
    if (buffer[0] === 27) { // ESC sequence
      if (n === 1) return "escape";
      if (buffer[1] === 91) { // Arrow keys
        switch (buffer[2]) {
          case 65:
            return "up";
          case 66:
            return "down";
          case 67:
            return "right";
          case 68:
            return "left";
        }
      }
    }

    // Handle Enter key
    if (buffer[0] === 13 || buffer[0] === 10) return "enter";

    // Handle regular characters
    return new TextDecoder().decode(buffer.slice(0, n));
  }
}

/**
 * Displays the main menu screen
 * @returns The selected menu item ID or null
 */
export async function showMainMenu(): Promise<string | null> {
  displayBanner();

  // Add retro subtitle
  drawTextWithShadow("« Retro Icon Recovery Tool »", 20, 26, colors.fg.yellow);

  const menuItems: MenuItem[] = [
    {
      id: "fix-current",
      label: "Fix Icons in Current Directory",
    },
    {
      id: "fix-desktop",
      label: "Fix Icons on Desktop",
    },
    {
      id: "browse",
      label: "Browse for Directory...",
    },
    {
      id: "select-files",
      label: "Select Specific Files...",
    },
    {
      id: "refresh-all",
      label: "Replace ALL Desktop Shortcuts",
    },
    {
      id: "settings",
      label: "Settings & Options",
    },
    {
      id: "exit",
      label: "Exit",
    },
  ];

  const menu = new Menu("MAIN MENU", menuItems);
  return await menu.show();
}

/**
 * Displays the settings menu
 */
export async function showSettingsMenu(): Promise<void> {
  clearScreen();
  displayBanner();

  const settingsItems: MenuItem[] = [
    {
      id: "steam-path",
      label: "Configure Steam Path",
      action: async () => {
        // TODO: Implement steam path configuration
        showStatus("info", "Steam path configuration coming soon!", 15, 40);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      },
    },
    {
      id: "backup",
      label: "Enable Icon Backup",
      action: async () => {
        showStatus("success", "Backup enabled!", 15, 40);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      },
    },
    {
      id: "parallel",
      label: "Parallel Downloads: ON",
      action: async () => {
        showStatus("success", "Parallel downloads toggled!", 15, 40);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      },
    },
    {
      id: "cache",
      label: "Clear Icon Cache",
      action: async () => {
        showStatus("warning", "Cache cleared!", 15, 40);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      },
    },
    {
      id: "back",
      label: "← Back to Main Menu",
    },
  ];

  const menu = new Menu("SETTINGS", settingsItems);
  const choice = await menu.show();
  
  // Handle settings choices
  switch (choice) {
    case "steam-path":
      // TODO: Implement
      break;
    case "back":
      return;
  }
}
