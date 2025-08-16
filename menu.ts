/**
 * Menu system module for interactive navigation
 * Provides keyboard-controlled menu interface with retro styling
 */

// Removed unused imports - AppSettings and SettingsManager were not used in this file
import {
  beep,
  centerText,
  clearScreen,
  colors,
  displayTurboPascalBanner,
  drawBox,
  drawBoxWithShadow,
  drawStatusBar,
  drawDivider,
  drawMenuItem,
  drawMenuItemWithHotkey,
  drawMenuBar,
  drawPulldownMenu,
  getCenteredPosition,
  hideCursor,
  moveCursor,
  showCursor,
  showStatus,
  showCenteredStatus,
  turboPascal,
  write,
  writeAt,
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
   * Draws the menu on screen with Turbo Pascal styling
   */
  private draw(): void {
    const height = this.items.length + 6;

    // Draw box with shadow
    drawBoxWithShadow(this.x, this.y, this.width, height);

    // Draw title bar with Turbo Pascal menu bar color
    writeAt(this.y, this.x,
      turboPascal.menuBar + turboPascal.menuText + colors.bright +
      centerText(` ═══[ ${this.title} ]═══ `, this.width) +
      colors.reset
    );

    // Draw menu items with hotkey support
    this.items.forEach((item, index) => {
      drawMenuItemWithHotkey(
        item.label,
        this.x + 2,
        this.y + 3 + index,
        index === this.selectedIndex,
        this.width - 4,
      );
    });

    // Draw F-key shortcuts at bottom
    writeAt(this.y + height - 2, this.x + 2,
      turboPascal.windowBg + colors.fg.white + colors.dim +
      centerText("↑↓ Navigate │ Enter=Select │ ESC=Back", this.width - 4) +
      colors.reset
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
        case "enter":
          showCursor();
          return this.items[this.selectedIndex].id;
          break;
        case "escape":
          beep(); // Classic DOS beep on ESC
          this.isActive = false;
          return null;
        case "f1":
          // F1 for help
          beep();
          break;
        case "f10":
          // F10 for exit
          this.isActive = false;
          return "exit";
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
    try {
      Deno.stdin.setRaw(true);
    } catch (error) {
      // If setRaw fails (Windows issue), try to continue without it
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Warning: Could not set raw mode:", errorMessage);
    }

    const buffer = new Uint8Array(10);
    let n: number | null;

    try {
      n = await Deno.stdin.read(buffer);
    } catch (error) {
      try {
        Deno.stdin.setRaw(false);
      } catch {
        // Ignore setRaw errors on cleanup
      }
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      throw new Error(`Failed to read keyboard input: ${errorMessage}`);
    }

    try {
      Deno.stdin.setRaw(false);
    } catch {
      // Ignore setRaw errors
    }

    if (n === null || n === 0) return "";

    // Handle special keys
    if (buffer[0] === 27) { // ESC sequence
      if (n === 1) return "escape";
      if (buffer[1] === 91) { // Arrow keys and F-keys
        switch (buffer[2]) {
          case 65:
            return "up";
          case 66:
            return "down";
          case 67:
            return "right";
          case 68:
            return "left";
          case 49: // F-keys start
            if (n > 3 && buffer[3] === 126) return "f1";
            if (n > 3 && buffer[3] === 53 && buffer[4] === 126) return "f5";
            break;
          case 50:
            if (n > 3 && buffer[3] === 48 && buffer[4] === 126) return "f9";
            if (n > 3 && buffer[3] === 49 && buffer[4] === 126) return "f10";
            break;
        }
      } else if (buffer[1] === 79) { // F1-F4 on some terminals
        switch (buffer[2]) {
          case 80: return "f1";
          case 81: return "f2";
          case 82: return "f3";
          case 83: return "f4";
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
export async function showTopMenu(): Promise<string | null> {
  displayTurboPascalBanner();

  // Draw status bar at SVGA bottom
  drawStatusBar(" F1=Help  F10=Exit");

  const menuItems: MenuItem[] = [
    {
      id: "fix-current",
      label: "~F~ix Icons in Current Directory",
    },
    {
      id: "fix-desktop",
      label: "Fix Icons on ~D~esktop",
    },
    {
      id: "browse",
      label: "~B~rowse for Directory...",
    },
    {
      id: "select-files",
      label: "~S~elect Specific Files...",
    },
    {
      id: "refresh-all",
      label: "~R~eplace ALL Desktop Shortcuts",
    },
    {
      id: "settings",
      label: "Settings & ~O~ptions",
    },
    {
      id: "exit",
      label: "E~x~it",
    },
  ];

  // Center menu on SVGA screen (160×64)
  const width = 50;
  const height = menuItems.length + 6;
  const { x, y } = getCenteredPosition(width, height);
  const menu = new Menu("MAIN MENU", menuItems, x, y, width);
  const result = await menu.show();
  
  // Handle F-key shortcuts
  if (result === "exit") {
    return "exit";
  }
  
  return result;
}

/**
 * Displays the settings menu
 */
export async function showSettingsMenu(): Promise<void> {
  displayTurboPascalBanner();
  drawStatusBar(" F1=Help  ESC=Back");

  const settingsItems: MenuItem[] = [
    {
      id: "steam-path",
      label: "~C~onfigure Steam Path",
      action: async () => {
        beep();
        showCenteredStatus("info", "Steam path configuration coming soon!");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      },
    },
    {
      id: "backup",
      label: "Enable Icon ~B~ackup",
      action: async () => {
        showCenteredStatus("success", "Backup enabled!");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      },
    },
    {
      id: "parallel",
      label: "~P~arallel Downloads: ON",
      action: async () => {
        showCenteredStatus("success", "Parallel downloads toggled!");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      },
    },
    {
      id: "cache",
      label: "Clear Icon Cac~h~e",
      action: async () => {
        showCenteredStatus("warning", "Cache cleared!");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      },
    },
    {
      id: "back",
      label: "← ~B~ack to Main Menu",
    },
  ];

  // Center menu on SVGA screen
  const width = 50;
  const height = settingsItems.length + 6;
  const { x, y } = getCenteredPosition(width, height);
  const menu = new Menu("SETTINGS", settingsItems, x, y, width);
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
