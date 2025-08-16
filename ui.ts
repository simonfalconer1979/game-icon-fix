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

/**
 * Returns the logical screen size for SVGA text mode (1280×1024).
 * Using an 8×16 font, this maps to 160 columns × 64 rows.
 */
export function getScreenSize() {
  return { width: 160, height: 64 };
}

/**
 * Computes the top-left coordinates to center a box within the SVGA grid
 * @param boxWidth - Box width in characters
 * @param boxHeight - Box height in characters
 * @returns { x, y } starting coordinates (1-indexed)
 */
export function getCenteredPosition(boxWidth: number, boxHeight: number): { x: number; y: number } {
  const { width, height } = getScreenSize();
  const x = Math.floor((width - boxWidth) / 2) + 1;
  const y = Math.floor((height - boxHeight) / 2) + 1;
  return { x, y };
}

/**
 * Draws a centered box with shadow and returns its geometry for content placement
 * @param boxWidth - Box width
 * @param boxHeight - Box height
 * @returns { x, y, width, height } geometry of the box
 */
export function drawCenteredBoxWithShadow(
  boxWidth: number,
  boxHeight: number,
  frameColor = turboPascal.windowFrame,
  fillBg = turboPascal.windowBg,
): { x: number; y: number; width: number; height: number } {
  const { x, y } = getCenteredPosition(boxWidth, boxHeight);
  drawBoxWithShadow(x, y, boxWidth, boxHeight, frameColor, fillBg);
  return { x, y, width: boxWidth, height: boxHeight };
}

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
 * Writes text at current cursor position without newline
 */
export function write(text: string): void {
  Deno.stdout.writeSync(new TextEncoder().encode(text));
}

/**
 * Writes text at specific position without newline
 */
export function writeAt(row: number, col: number, text: string): void {
  moveCursor(row, col);
  write(text);
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
  writeAt(y, x, color + topLeft + horizontal.repeat(width - 2) + topRight + colors.reset);

  // Side borders
  for (let i = 1; i < height - 1; i++) {
    writeAt(y + i, x, color + vertical + " ".repeat(width - 2) + vertical + colors.reset);
  }

  // Bottom border
  writeAt(y + height - 1, x, color + bottomLeft + horizontal.repeat(width - 2) + bottomRight + colors.reset);
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
    writeAt(row++, 20, colors.fg.cyan + colors.bright + line + colors.reset);
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
  writeAt(y, x, colors.fg.yellow + loadingFrames[loadingIndex] + " " + message + colors.reset);
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

  writeAt(y, x,
    colors.fg.cyan + "[" +
    colors.fg.green + "█".repeat(filled) +
    colors.fg.gray + "░".repeat(empty) +
    colors.fg.cyan + "] " +
    colors.fg.white + percentage + "% " + label +
    colors.reset
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

  writeAt(y, x,
    statusColors[type] + colors.bright + icons[type] + " " + colors.reset +
    statusColors[type] + message + colors.reset
  );
}

/**
 * Displays a centered status message on the screen
 * @param type - The type of status (success, error, warning, info)
 * @param message - The status message to display
 * @param y - Optional row override; defaults to vertical center of the screen
 */
export function showCenteredStatus(
  type: "success" | "error" | "warning" | "info",
  message: string,
  y?: number,
): void {
  const config = ConsoleConfig.getInstance();
  const iconSet = config.getIcons();
  const icon = iconSet[type];
  const { width, height } = getScreenSize();
  const renderedLen = icon.length + 1 + message.length; // icon + space + text
  const x = Math.floor((width - renderedLen) / 2) + 1;
  const row = y ?? Math.floor(height / 2);
  showStatus(type, message, x, row);
}

/**
 * Displays a centered status message within a specific box geometry
 * @param type - The type of status (success, error, warning, info)
 * @param message - The status message
 * @param geom - Box geometry returned by drawCenteredBoxWithShadow()
 * @param rowOffset - Optional relative row offset from the box's vertical center
 */
export function showStatusInBox(
  type: "success" | "error" | "warning" | "info",
  message: string,
  geom: { x: number; y: number; width: number; height: number },
  rowOffset = 0,
): void {
  const config = ConsoleConfig.getInstance();
  const iconSet = config.getIcons();
  const icon = iconSet[type];
  const renderedLen = icon.length + 1 + message.length;
  const x = geom.x + Math.max(0, Math.floor((geom.width - renderedLen) / 2));
  const y = geom.y + Math.floor(geom.height / 2) + rowOffset;
  showStatus(type, message, x, y);
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
  
  if (isSelected) {
    const prefix = config.isAsciiMode() ? " > " : " " + arrow + " ";
    writeAt(y, x,
      colors.bg.blue + colors.fg.white + colors.bright +
      prefix + text.padEnd(width - prefix.length) +
      colors.reset
    );
  } else {
    writeAt(y, x,
      colors.fg.gray + "   " + text.padEnd(width - 3) + colors.reset
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
  writeAt(y, x, color + dividerChar.repeat(width) + colors.reset);
}

/**
 * Displays text with a blinking effect
 * Note: Blinking may not work in all terminals
 * @param text - The text to display
 * @param x - Column position
 * @param y - Row position
 */
export function blinkText(text: string, x: number, y: number): void {
  writeAt(y, x, colors.blink + colors.fg.brightYellow + text + colors.reset);
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
  writeAt(y + 1, x + 1, colors.fg.black + colors.dim + text + colors.reset);
  // Draw text
  writeAt(y, x, color + colors.bright + text + colors.reset);
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
    writeAt(y + i + 1, x + width, colors.fg.black + shadowChar.repeat(2) + colors.reset);
  }
  writeAt(y + height, x + 2, colors.fg.black + shadowChar.repeat(width) + colors.reset);
  
  // Draw the filled box
  const box = config.getBox();
  
  // Top border
  writeAt(y, x,
    frameColor + fillBg + box.topLeft + box.horizontal.repeat(width - 2) + box.topRight + colors.reset
  );
  
  // Side borders with filled background
  for (let i = 1; i < height - 1; i++) {
    writeAt(y + i, x,
      frameColor + fillBg + box.vertical + " ".repeat(width - 2) + box.vertical + colors.reset
    );
  }
  
  // Bottom border
  writeAt(y + height - 1, x,
    frameColor + fillBg + box.bottomLeft + box.horizontal.repeat(width - 2) + box.bottomRight + colors.reset
  );
}

/**
 * Draws a DOS-style status bar at the bottom of the screen
 * You can call as:
 *  - drawStatusBar("message")
 *  - drawStatusBar(width, height, message)
 */
export function drawStatusBar(widthOrMessage?: number | string, height?: number, message?: string): void {
  // Support both legacy signature (width, height, message) and simplified (message)
  // If first arg is a string, treat it as message and use SVGA defaults
  let w: number;
  let h: number;
  let msg = "";
  if (typeof widthOrMessage === "string") {
    msg = widthOrMessage;
    const size = getScreenSize();
    w = size.width;
    h = size.height;
  } else {
    const size = getScreenSize();
    w = widthOrMessage ?? size.width;
    h = height ?? size.height;
    msg = message ?? "";
  }

  const time = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  const leftText = msg || " F1=Help  F10=Exit";
  const rightText = ` SVGA 1280×1024 │ ${time} `;
  const padding = w - leftText.length - rightText.length;

  writeAt(h, 1,
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
    writeAt(y, x,
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
    
    writeAt(y, x, output + " ".repeat(Math.max(0, width - prefix.length - cleanText.length)) + colors.reset);
  }
}

/**
 * Displays the Turbo Pascal style banner (VGA 80×30)
 */
export function displayTurboPascalBanner(): void {
  clearScreen();
  const { width, height } = getScreenSize();

  // Fill background with blue to full SVGA text grid
  for (let i = 1; i <= height; i++) {
    writeAt(i, 1, turboPascal.background + " ".repeat(width) + colors.reset);
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
      "          ═══[ Version 1.0 - SVGA 1280×1024 ]═══",
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
      "       ═══[ SVGA 1280×1024 Edition ]═══",
    ];
  
  let row = 3;
  for (const line of banner) {
    writeAt(row++, Math.floor((width - line.length) / 2) + 1,
      turboPascal.background + turboPascal.text + colors.bright + line + colors.reset
    );
  }
}

/**
 * Draws a Turbo Pascal style top menu bar with highlight on the selected index
 * @param titles - Array of top-level menu titles
 * @param selectedIndex - The index of the currently selected top-level menu
 */
export function drawMenuBar(titles: string[], selectedIndex: number): void {
  const { width } = getScreenSize();
  // Menu bar background across the full width
  writeAt(1, 1, turboPascal.menuBar + " ".repeat(width) + colors.reset);

  // Layout titles with a space between
  let x = 2;
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    if (i === selectedIndex) {
      writeAt(1, x,
        turboPascal.menuHighlight + turboPascal.highlightText + colors.bright +
        ` ${title} ` + colors.reset
      );
      x += title.length + 3; // account for spaces around title
    } else {
      writeAt(1, x, turboPascal.menuBar + turboPascal.menuText + ` ${title} ` + colors.reset);
      x += title.length + 3;
    }
    x += 1; // gap
  }
}

/**
 * Draws a pulldown menu window with shadow and items, highlighting selection
 * @param x - Left column of the pulldown window
 * @param y - Top row of the pulldown window
 * @param width - Window width
 * @param items - Array of item labels (supporting ~hotkey~ underline markers)
 * @param selectedIndex - Highlighted item index
 */
export function drawPulldownMenu(
  x: number,
  y: number,
  width: number,
  items: string[],
  selectedIndex: number,
): void {
  const height = items.length + 2;
  drawBoxWithShadow(x, y, width, height);
  for (let i = 0; i < items.length; i++) {
    drawMenuItemWithHotkey(items[i], x + 2, y + 1 + i, i === selectedIndex, width - 4);
  }
}
