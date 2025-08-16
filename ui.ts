/**
 * UI utility module for terminal-based retro ASCII interface
 * Provides ANSI color codes, drawing functions, and terminal manipulation
 */

import { UIManager } from "./ui_manager.ts";
import { ConsoleConfig } from "./console_utils.ts";

// ANSI color codes for retro terminal styling
export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  // Foreground colors
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
    brightRed: "\x1b[91m",
    brightGreen: "\x1b[92m",
    brightYellow: "\x1b[93m",
    brightBlue: "\x1b[94m",
    brightMagenta: "\x1b[95m",
    brightCyan: "\x1b[96m",
    brightWhite: "\x1b[97m",
  },

  // Background colors
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
    gray: "\x1b[100m",
    brightRed: "\x1b[101m",
    brightGreen: "\x1b[102m",
    brightYellow: "\x1b[103m",
    brightBlue: "\x1b[104m",
    brightMagenta: "\x1b[105m",
    brightCyan: "\x1b[106m",
    brightWhite: "\x1b[107m",
  },
};

// Turbo Pascal IDE Color Scheme (circa 1990s)
export const turboPascal = {
  // Main UI colors
  background: colors.bg.blue,           // Classic blue background
  menuBar: colors.bg.cyan,              // Cyan menu bar
  menuText: colors.fg.black,            // Black text on cyan
  menuHighlight: colors.bg.green,       // Green selection bar
  windowFrame: colors.fg.brightWhite,   // Bright white window frames
  windowBg: colors.bg.blue,             // Blue window background
  text: colors.fg.brightYellow,         // Yellow text (high contrast)
  textDim: colors.fg.white,             // White for secondary text
  shadow: colors.fg.black,              // Black for shadows
  statusBar: colors.bg.cyan,            // Cyan status bar
  statusText: colors.fg.black,          // Black status text
  errorBg: colors.bg.red,               // Red error background
  errorText: colors.fg.brightWhite,     // White error text
  highlightBg: colors.bg.cyan,          // Cyan highlight
  highlightText: colors.fg.black,       // Black highlighted text
  hotkey: colors.fg.brightRed,          // Red for hotkey letters
};

/**
 * Clears the terminal screen and moves cursor to top-left position
 * Uses ANSI escape codes: 2J (clear screen) and H (home position)
 */
export function clearScreen(): void {
  const ui = UIManager.getInstance();
  ui.clearScreen();
}

/**
 * Moves the terminal cursor to a specific position
 * @param row - The row number (1-indexed)
 * @param col - The column number (1-indexed)
 */
export function moveCursor(row: number, col: number): void {
  const ui = UIManager.getInstance();
  ui.moveCursor(row, col);
}

/**
 * Hides the terminal cursor
 * Useful during menu navigation to prevent cursor flicker
 */
export function hideCursor(): void {
  const ui = UIManager.getInstance();
  ui.pushCursor(false);
}

/**
 * Shows the terminal cursor
 * Should be called when exiting interactive modes
 */
export function showCursor(): void {
  const ui = UIManager.getInstance();
  ui.popCursor();
}

/**
 * Draws a box using double-line box drawing characters
 * @param x - Starting column position
 * @param y - Starting row position
 * @param width - Box width in characters
 * @param height - Box height in characters
 * @param color - ANSI color code for the box (default: cyan)
 */
export function drawBox(
  x: number,
  y: number,
  width: number,
  height: number,
  color = colors.fg.cyan,
): void {
  // Validate inputs
  if (width < 3 || height < 3) {
    throw new Error("Box dimensions must be at least 3x3");
  }
  if (x < 1 || y < 1) {
    throw new Error("Box position must be positive");
  }

  const config = ConsoleConfig.getInstance();
  const box = config.getBox();
  const horizontal = box.horizontal;
  const vertical = box.vertical;
  const topLeft = box.topLeft;
  const topRight = box.topRight;
  const bottomLeft = box.bottomLeft;
  const bottomRight = box.bottomRight;

  // Top border
  moveCursor(y, x);
  console.log(
    color + topLeft + horizontal.repeat(width - 2) + topRight + colors.reset,
  );

  // Side borders
  for (let i = 1; i < height - 1; i++) {
    moveCursor(y + i, x);
    console.log(
      color + vertical + " ".repeat(width - 2) + vertical + colors.reset,
    );
  }

  // Bottom border
  moveCursor(y + height - 1, x);
  console.log(
    color + bottomLeft + horizontal.repeat(width - 2) + bottomRight +
      colors.reset,
  );
}

/**
 * Centers text within a given width by adding padding
 * @param text - The text to center
 * @param width - The total width to center within
 * @returns The centered text with padding
 */
export function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(padding) + text;
}

/**
 * Displays the main application banner with ASCII art
 * Clears the screen first and positions the banner at the top
 */
export function displayBanner(): void {
  const config = ConsoleConfig.getInstance();
  
  // Create dynamic banner with appropriate characters
  const banner = config.isAsciiMode() ? 
    // ASCII version
    [
      "",
      "   GGGGG   AAA  M   M EEEEE",
      "  G       A   A MM MM E    ",
      "  G  GGG  AAAAA M M M EEE  ",
      "  G    G  A   A M   M E    ",
      "   GGGGG  A   A M   M EEEEE",
      "",
      "  III  CCC   OOO  N   N",
      "   I  C   C O   O NN  N",
      "   I  C     O   O N N N",
      "   I  C   C O   O N  NN",
      "  III  CCC   OOO  N   N",
      "",
      "  FFFFF III X   X EEEEE RRRR ",
      "  F      I   X X  E     R   R",
      "  FFF    I    X   EEE   RRRR ",
      "  F      I   X X  E     R  R ",
      "  F     III X   X EEEEE R   R",
      "",
      "          Version 1.0",
    ] :
    // UTF-8 version
    [
      "",
      "   ██████╗  █████╗ ███╗   ███╗███████╗",
      "  ██╔════╝ ██╔══██╗████╗ ████║██╔════╝",
      "  ██║  ███╗███████║██╔████╔██║█████╗  ",
      "  ██║   ██║██╔══██║██║╚██╔╝██║██╔══╝  ",
      "  ╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗",
      "   ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝",
      "",
      "  ██╗ ██████╗ ██████╗ ███╗   ██╗",
      "  ██║██╔════╝██╔═══██╗████╗  ██║",
      "  ██║██║     ██║   ██║██╔██╗ ██║",
      "  ██║██║     ██║   ██║██║╚██╗██║",
      "  ██║╚██████╗╚██████╔╝██║ ╚████║",
      "  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝",
      "",
      "  ███████╗██╗██╗  ██╗███████╗██████╗ ",
      "  ██╔════╝██║╚██╗██╔╝██╔════╝██╔══██╗",
      "  █████╗  ██║ ╚███╔╝ █████╗  ██████╔╝",
      "  ██╔══╝  ██║ ██╔██╗ ██╔══╝  ██╔══██╗",
      "  ██║     ██║██╔╝ ██╗███████╗██║  ██║",
      "  ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝",
      "",
      "             Version 1.0",
    ];

  clearScreen();
  let row = 2;
  for (const line of banner) {
    moveCursor(row++, 20);
    console.log(colors.fg.cyan + colors.bright + line + colors.reset);
  }
}

/**
 * Loading animation frames using Unicode Braille characters
 * Creates a smooth rotating effect
 */
const loadingFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let loadingIndex = 0;

/**
 * Displays an animated loading indicator with a message
 * @param message - The loading message to display
 * @param x - Column position
 * @param y - Row position
 */
export function showLoading(message: string, x: number, y: number): void {
  moveCursor(y, x);
  console.log(
    colors.fg.yellow + loadingFrames[loadingIndex] + " " + message +
      colors.reset,
  );
  loadingIndex = (loadingIndex + 1) % loadingFrames.length;
}

/**
 * Draws a progress bar with percentage
 * @param x - Column position
 * @param y - Row position
 * @param width - Progress bar width
 * @param current - Current progress value
 * @param total - Total/maximum value
 * @param label - Optional label to display after percentage
 */
export function drawProgressBar(
  x: number,
  y: number,
  width: number,
  current: number,
  total: number,
  label = "",
): void {
  const filled = Math.floor((current / total) * width);
  const empty = width - filled;
  const percentage = Math.floor((current / total) * 100);

  moveCursor(y, x);
  console.log(
    colors.fg.cyan + "[" +
      colors.fg.green + "█".repeat(filled) +
      colors.fg.gray + "░".repeat(empty) +
      colors.fg.cyan + "] " +
      colors.fg.white + percentage + "% " + label +
      colors.reset,
  );
}

/**
 * Displays a status message with an appropriate icon and color
 * @param type - The type of status (success, error, warning, info)
 * @param message - The status message to display
 * @param x - Column position
 * @param y - Row position
 */
export function showStatus(
  type: "success" | "error" | "warning" | "info",
  message: string,
  x: number,
  y: number,
): void {
  const config = ConsoleConfig.getInstance();
  const iconSet = config.getIcons();
  const icons = {
    success: iconSet.success,
    error: iconSet.error,
    warning: iconSet.warning,
    info: iconSet.info,
  };

  const statusColors = {
    success: colors.fg.green,
    error: colors.fg.red,
    warning: colors.fg.yellow,
    info: colors.fg.cyan,
  };

  moveCursor(y, x);
  console.log(
    statusColors[type] + colors.bright + icons[type] + " " + colors.reset +
      statusColors[type] + message + colors.reset,
  );
}

/**
 * Draws a menu item with selection highlighting
 * @param text - The menu item text
 * @param x - Column position
 * @param y - Row position
 * @param isSelected - Whether this item is currently selected
 * @param width - Total width for the menu item
 */
export function drawMenuItem(
  text: string,
  x: number,
  y: number,
  isSelected: boolean,
  width: number,
): void {
  const config = ConsoleConfig.getInstance();
  const icons = config.getIcons();
  const arrow = icons.arrow;
  
  moveCursor(y, x);
  if (isSelected) {
    const prefix = config.isAsciiMode() ? " > " : " " + arrow + " ";
    console.log(
      colors.bg.blue + colors.fg.white + colors.bright +
        prefix + text.padEnd(width - prefix.length) +
        colors.reset,
    );
  } else {
    console.log(
      colors.fg.gray + "   " + text.padEnd(width - 3) + colors.reset,
    );
  }
}

/**
 * Draws a horizontal divider line
 * @param x - Starting column position
 * @param y - Row position
 * @param width - Length of the divider
 * @param color - ANSI color code (default: gray)
 */
export function drawDivider(
  x: number,
  y: number,
  width: number,
  color = colors.fg.gray,
): void {
  const config = ConsoleConfig.getInstance();
  const dividerChar = config.isAsciiMode() ? "-" : "─";
  moveCursor(y, x);
  console.log(color + dividerChar.repeat(width) + colors.reset);
}

/**
 * Displays text with a blinking effect
 * Note: Blinking may not work in all terminals
 * @param text - The text to display
 * @param x - Column position
 * @param y - Row position
 */
export function blinkText(text: string, x: number, y: number): void {
  moveCursor(y, x);
  console.log(colors.blink + colors.fg.brightYellow + text + colors.reset);
}

/**
 * Draws text with a shadow effect for depth
 * @param text - The text to display
 * @param x - Column position
 * @param y - Row position
 * @param color - Text color (default: white)
 */
export function drawTextWithShadow(
  text: string,
  x: number,
  y: number,
  color = colors.fg.white,
): void {
  // Draw shadow
  moveCursor(y + 1, x + 1);
  console.log(colors.fg.black + colors.dim + text + colors.reset);
  // Draw text
  moveCursor(y, x);
  console.log(color + colors.bright + text + colors.reset);
}

/**
 * Draws a box with 3D shadow effect - Classic DOS style
 * @param x - Starting column position
 * @param y - Starting row position
 * @param width - Box width in characters
 * @param height - Box height in characters
 * @param frameColor - Color for the box frame
 * @param fillBg - Background color to fill the box
 */
export function drawBoxWithShadow(
  x: number,
  y: number,
  width: number,
  height: number,
  frameColor = turboPascal.windowFrame,
  fillBg = turboPascal.windowBg,
): void {
  const config = ConsoleConfig.getInstance();
  const shadowChar = config.isAsciiMode() ? "#" : "▒";
  
  // Draw shadow first (offset by 1,1)
  for (let i = 1; i < height; i++) {
    moveCursor(y + i + 1, x + width);
    console.log(colors.fg.black + shadowChar.repeat(2) + colors.reset);
  }
  moveCursor(y + height, x + 2);
  console.log(colors.fg.black + shadowChar.repeat(width) + colors.reset);
  
  // Draw the filled box
  const box = config.getBox();
  
  // Top border
  moveCursor(y, x);
  console.log(
    frameColor + fillBg + box.topLeft + box.horizontal.repeat(width - 2) + box.topRight + colors.reset
  );
  
  // Side borders with filled background
  for (let i = 1; i < height - 1; i++) {
    moveCursor(y + i, x);
    console.log(
      frameColor + fillBg + box.vertical + " ".repeat(width - 2) + box.vertical + colors.reset
    );
  }
  
  // Bottom border
  moveCursor(y + height - 1, x);
  console.log(
    frameColor + fillBg + box.bottomLeft + box.horizontal.repeat(width - 2) + box.bottomRight + colors.reset
  );
}

/**
 * Draws a DOS-style status bar at the bottom of the screen
 * @param width - Width of the status bar (80 for VGA)
 * @param height - Screen height (30 for VGA)
 * @param message - Optional message to display on the left
 */
export function drawStatusBar(width: number = 80, height: number = 30, message = ""): void {
  moveCursor(height, 1);
  
  const time = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const leftText = message || " F1=Help  F10=Exit";
  const rightText = ` VGA 640×480 │ ${time} `;
  const padding = width - leftText.length - rightText.length;
  
  console.log(
    turboPascal.statusBar + turboPascal.statusText + colors.bright +
    leftText + " ".repeat(Math.max(0, padding)) + rightText + colors.reset
  );
}

/**
 * Plays a PC speaker beep (error sound)
 * Works on Windows terminals that support bell character
 */
export function beep(): void {
  // ASCII bell character (will make a beep on supported terminals)
  Deno.stdout.writeSync(new Uint8Array([7]));
}

/**
 * Draws menu item with hotkey highlighting (underscored letter)
 * @param text - Menu text with ~ before the hotkey letter (e.g., "~F~ile")
 * @param x - Column position
 * @param y - Row position
 * @param isSelected - Whether this item is selected
 * @param width - Total width for the menu item
 */
export function drawMenuItemWithHotkey(
  text: string,
  x: number,
  y: number,
  isSelected: boolean,
  width: number,
): void {
  const config = ConsoleConfig.getInstance();
  const icons = config.getIcons();
  
  moveCursor(y, x);
  
  // Parse text for hotkey (marked with ~)
  let displayText = "";
  let hotkeyIndex = -1;
  let cleanText = "";
  
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "~" && i + 1 < text.length) {
      hotkeyIndex = cleanText.length;
      i++; // Skip the ~
    }
    cleanText += text[i];
  }
  
  if (isSelected) {
    const prefix = config.isAsciiMode() ? " > " : " " + icons.arrow + " ";
    console.log(
      turboPascal.menuHighlight + turboPascal.highlightText + colors.bright +
      prefix + cleanText.padEnd(width - prefix.length) + colors.reset
    );
  } else {
    // Build the text with hotkey highlighting
    const prefix = "   ";
    let output = turboPascal.text + prefix;
    
    for (let i = 0; i < cleanText.length; i++) {
      if (i === hotkeyIndex) {
        output += turboPascal.hotkey + colors.underscore + cleanText[i] + 
                  colors.reset + turboPascal.text;
      } else {
        output += cleanText[i];
      }
    }
    
    console.log(output + " ".repeat(Math.max(0, width - prefix.length - cleanText.length)) + colors.reset);
  }
}

/**
 * Displays the Turbo Pascal style banner (VGA 80×30)
 */
export function displayTurboPascalBanner(): void {
  clearScreen();
  
  // Fill background with blue (VGA 80 columns × 30 rows)
  for (let i = 1; i <= 30; i++) {
    moveCursor(i, 1);
    console.log(turboPascal.background + " ".repeat(80) + colors.reset);
  }
  
  const config = ConsoleConfig.getInstance();
  // Compact banner for VGA 80×30 display
  const banner = config.isAsciiMode() ? 
    [
      "  ##### ##### ##### #   #    ##### ### #   # ##### ####",
      "  #       #   #     #   #    #      #   # #  #     #   #",
      "  #####   #   ####  #####    ####   #    #   ####  ####",
      "      #   #   #     #   #    #      #   # #  #     #  #",
      "  #####   #   ##### #   #    #     ###  # #  ##### #   #",
      "",
      "          ═══[ Version 1.0 - VGA Mode ]═══",
    ] :
    [
      "  ███████╗████████╗███████╗ █████╗ ███╗   ███╗",
      "  ██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║",
      "  ███████╗   ██║   █████╗  ███████║██╔████╔██║",
      "  ╚════██║   ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║",
      "  ███████║   ██║   ███████╗██║  ██║██║ ╚═╝ ██║",
      "",
      "  ███████╗██╗██╗  ██╗███████╗██████╗",
      "  ██╔════╝██║╚██╗██╔╝██╔════╝██╔══██╗",
      "  █████╗  ██║ ╚███╔╝ █████╗  ██████╔╝",
      "  ██╔══╝  ██║ ██╔██╗ ██╔══╝  ██╔══██╗",
      "  ██║     ██║██╔╝ ██╗███████╗██║  ██║",
      "",
      "       ═══[ VGA 640×480 Edition ]═══",
    ];
  
  let row = 3;
  for (const line of banner) {
    moveCursor(row++, Math.floor((80 - line.length) / 2) + 1);
    console.log(turboPascal.background + turboPascal.text + colors.bright + line + colors.reset);
  }
}
