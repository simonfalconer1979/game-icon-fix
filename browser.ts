/**
 * Directory browser module for file system navigation
 * Provides interactive file/folder selection with keyboard control
 */

import { dirname, join, resolve } from "@std/path";
import {
  centerText,
  clearScreen,
  colors,
  displayTurboPascalBanner,
  drawBox,
  drawDivider,
  drawTextWithShadow,
  getScreenSize,
  hideCursor,
  moveCursor,
  showCursor,
  showCenteredStatus,
  getCenteredPosition,
  turboPascal,
  writeAt,
} from "./ui.ts";

/**
 * Represents a file system entry
 */
interface PathEntry {
  /** Display name of the entry */
  name: string;
  /** Full path to the entry */
  path: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** Selection state for multi-select mode */
  isSelected: boolean;
}

/**
 * Interactive path browser for directory navigation
 */
export class PathBrowser {
  private currentPath: string;
  private entries: PathEntry[] = [];
  private selectedIndex = 0;
  private scrollOffset = 0;
  private readonly displayHeight = 15;
  private readonly multiSelect: boolean;
  private selectedPaths: Set<string> = new Set();
  // Centered layout base coordinates (computed in draw)
  private baseX = 10;
  private baseY = 26;

  /**
   * Creates a new PathBrowser instance
   * @param startPath - Initial directory path
   * @param multiSelect - Enable multi-selection mode
   */
  constructor(startPath: string, multiSelect = false) {
    this.currentPath = resolve(startPath);
    this.multiSelect = multiSelect;
  }

  /**
   * Loads directory entries for the current path
   */
  private async loadEntries(): Promise<void> {
    this.entries = [];

    // Add parent directory option
    if (
      this.currentPath !== "/" && dirname(this.currentPath) !== this.currentPath
    ) {
      this.entries.push({
        name: ".. [Parent Directory]",
        path: dirname(this.currentPath),
        isDirectory: true,
        isSelected: false,
      });
    }

    try {
      // Read directory contents
      for await (const entry of Deno.readDir(this.currentPath)) {
        const fullPath = join(this.currentPath, entry.name);

        // Filter to show only directories and .url files
        if (entry.isDirectory || entry.name.endsWith(".url")) {
          this.entries.push({
            name: entry.isDirectory ? `📁 ${entry.name}` : `🎮 ${entry.name}`,
            path: fullPath,
            isDirectory: entry.isDirectory,
            isSelected: this.selectedPaths.has(fullPath),
          });
        }
      }

      // Sort: directories first, then files
      this.entries.sort((a, b) => {
        if (a.name.startsWith("..")) return -1;
        if (b.name.startsWith("..")) return 1;
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      if (error instanceof Error) {
        showCenteredStatus(
          "error",
          `Failed to read directory: ${error.message}`,
        );
      } else {
        showCenteredStatus("error", "Failed to read directory");
      }
      // Add a dummy entry to prevent empty display
      this.entries.push({
        name: "[Unable to read directory]",
        path: this.currentPath,
        isDirectory: false,
        isSelected: false,
      });
    }
  }

  /**
   * Draws the browser interface
   */
  private draw(): void {
    clearScreen();
    displayTurboPascalBanner();

    // Draw title bar at top
    const { width: screenWidth } = getScreenSize();
    writeAt(1, 1, turboPascal.menuBar + centerText("Steam Icon Fixer - File Browser", screenWidth) + colors.reset);

    const width = 65;
    const height = this.displayHeight + 19; // title + path box + main + help/stats
    const { x, y } = getCenteredPosition(width, height);
    this.baseX = x;
    this.baseY = y - 5;

    // Draw current path (centered title within width)
    const title = "DIRECTORY BROWSER";
    const titleX = this.baseX + Math.max(0, Math.floor((width - title.length) / 2));
    drawTextWithShadow(title, titleX, this.baseY, colors.fg.yellow);

    // Path display box
    drawBox(this.baseX, this.baseY + 2, width, 3, colors.fg.cyan);
    moveCursor(this.baseY + 3, this.baseX + 2);
    console.log(
      colors.fg.brightCyan + "Path: " + colors.fg.white +
        this.truncatePath(this.currentPath, width - 10) + colors.reset,
    );

    // Main browser box
    drawBox(this.baseX, this.baseY + 6, width, this.displayHeight + 4, colors.fg.magenta);

    // Column headers
    moveCursor(this.baseY + 7, this.baseX + 2);
    console.log(
      colors.fg.brightMagenta + colors.underscore +
        "Name".padEnd(width - 20) + "Type".padEnd(10) +
        colors.reset,
    );

    drawDivider(this.baseX + 1, this.baseY + 8, width - 2, colors.fg.magenta);

    // Display entries
    const visibleEntries = this.entries.slice(
      this.scrollOffset,
      this.scrollOffset + this.displayHeight,
    );

    visibleEntries.forEach((entry, index) => {
      const globalIndex = index + this.scrollOffset;
      const isHighlighted = globalIndex === this.selectedIndex;

      moveCursor(this.baseY + 9 + index, this.baseX + 2);

      // Selection indicator and highlighting
      if (isHighlighted) {
        console.log(colors.bg.blue + colors.fg.white + colors.bright);
      } else if (entry.isSelected) {
        console.log(colors.fg.green);
      } else {
        console.log(colors.fg.gray);
      }

      // Checkbox for multi-select
      const checkbox = this.multiSelect
        ? (entry.isSelected ? "[✓] " : "[ ] ")
        : (isHighlighted ? " ▶ " : "   ");

      const name = this.truncateName(entry.name, width - 20);
      const type = entry.isDirectory ? "DIR" : "FILE";

      console.log(
        checkbox + name.padEnd(width - 18) + type.padEnd(10) + colors.reset,
      );
    });

    // Scrollbar
    if (this.entries.length > this.displayHeight) {
      this.drawScrollbar();
    }

    // Help text
    moveCursor(this.baseY + 6 + this.displayHeight + 3, this.baseX + 2);
    console.log(
      colors.fg.gray + colors.dim +
        centerText(this.getHelpText(), width - 4) +
        colors.reset,
    );

    // Stats
    this.drawStats();
  }

  /**
   * Draws the scrollbar indicator
   */
  private drawScrollbar(): void {
    const scrollbarHeight = this.displayHeight;
    const scrollPosition = this.entries.length > 1
      ? Math.floor(
        (this.selectedIndex / (this.entries.length - 1)) *
          (scrollbarHeight - 1),
      )
      : 0;

    for (let i = 0; i < scrollbarHeight; i++) {
      moveCursor(this.baseY + 9 + i, this.baseX + 65 - 1);
      if (i === scrollPosition) {
        console.log(colors.fg.brightCyan + "█" + colors.reset);
      } else {
        console.log(colors.fg.gray + "│" + colors.reset);
      }
    }
  }

  private drawStats() {
    const stats = this.multiSelect
      ? `Selected: ${this.selectedPaths.size} │ Total: ${this.entries.length}`
      : `Items: ${this.entries.length}`;

    const width = 65;
    const height = this.displayHeight + 19;
    moveCursor(this.baseY + height - 2, this.baseX + 2);
    console.log(colors.fg.yellow + stats + colors.reset);
  }

  private getHelpText(): string {
    if (this.multiSelect) {
      return "↑↓ Navigate │ Space Select │ Enter Confirm │ A Select All │ ESC Cancel";
    }
    return "↑↓ Navigate │ Enter Select │ ESC Cancel";
  }

  /**
   * Truncates a path to fit within a maximum length
   * @param path - The path to truncate
   * @param maxLength - Maximum allowed length
   * @returns Truncated path with ellipsis if needed
   */
  private truncatePath(path: string, maxLength: number): string {
    if (path.length <= maxLength) return path;

    const parts = path.split(/[\\\/]/);
    let result = parts[parts.length - 1];

    for (let i = parts.length - 2; i >= 0; i--) {
      const testResult = parts[i] + "/" + result;
      if (testResult.length > maxLength - 3) {
        return ".../" + result;
      }
      result = testResult;
    }

    return result;
  }

  private truncateName(name: string, maxLength: number): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + "...";
  }

  /**
   * Opens the browser and handles user interaction
   * @returns Array of selected paths or null if cancelled
   */
  async browse(): Promise<string[] | null> {
    hideCursor();
    await this.loadEntries();

    while (true) {
      this.draw();

      const key = await this.getKeypress();

      switch (key) {
        case "up":
          this.moveSelection(-1);
          break;

        case "down":
          this.moveSelection(1);
          break;

        case "enter": {
          const selected = this.entries[this.selectedIndex];
          if (selected) {
            if (selected.isDirectory) {
              this.currentPath = selected.path;
              this.selectedIndex = 0;
              this.scrollOffset = 0;
              await this.loadEntries();
            } else if (this.multiSelect) {
              showCursor();
              return Array.from(this.selectedPaths);
            } else {
              showCursor();
              return [selected.path];
            }
          }
          break;
        }

        case "space":
          if (this.multiSelect) {
            this.toggleSelection();
          }
          break;

        case "a":
        case "A":
          if (this.multiSelect) {
            this.selectAll();
          }
          break;

        case "escape":
          showCursor();
          return null;
      }
    }
  }

  private moveSelection(delta: number) {
    this.selectedIndex = Math.max(
      0,
      Math.min(this.entries.length - 1, this.selectedIndex + delta),
    );

    // Adjust scroll offset
    if (this.selectedIndex < this.scrollOffset) {
      this.scrollOffset = this.selectedIndex;
    } else if (this.selectedIndex >= this.scrollOffset + this.displayHeight) {
      this.scrollOffset = this.selectedIndex - this.displayHeight + 1;
    }
  }

  private toggleSelection() {
    const entry = this.entries[this.selectedIndex];
    if (!entry || entry.isDirectory) return;

    if (this.selectedPaths.has(entry.path)) {
      this.selectedPaths.delete(entry.path);
      entry.isSelected = false;
    } else {
      this.selectedPaths.add(entry.path);
      entry.isSelected = true;
    }
  }

  private selectAll() {
    const allSelected = this.entries
      .filter((e) => !e.isDirectory)
      .every((e) => e.isSelected);

    this.entries.forEach((entry) => {
      if (!entry.isDirectory) {
        if (allSelected) {
          this.selectedPaths.delete(entry.path);
          entry.isSelected = false;
        } else {
          this.selectedPaths.add(entry.path);
          entry.isSelected = true;
        }
      }
    });
  }

  /**
   * Reads a single keypress from stdin
   * @returns The key pressed as a string
   */
  private async getKeypress(): Promise<string> {
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
        }
      }
    }

    // Handle Enter key
    if (buffer[0] === 13 || buffer[0] === 10) return "enter";

    // Handle Space
    if (buffer[0] === 32) return "space";

    // Handle regular characters
    return new TextDecoder().decode(buffer.slice(0, n));
  }
}

 
