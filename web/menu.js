import { clearScreen, drawCenteredBoxWithShadow, drawProfessionalMenu, putText, centerText, showCenteredStatus, flush, SVGA } from './ui.js';

export class Menu {
  constructor(title, items) {
    this.title = title;
    this.items = items;
    this.index = 0;
  }

  draw() {
    clearScreen();
    
    // Professional 1990s ANSI banner with proper spacing
    const banner = [
      "╔══════════════════════════════════════════════════════════════════════╗",
      "║  ██╗ ██████╗ ██████╗ ███╗   ██╗    ███████╗██╗██╗  ██╗███████╗██████╗║",
      "║  ██║██╔════╝██╔═══██╗████╗  ██║    ██╔════╝██║╚██╗██╔╝██╔════╝██╔══██╗║",
      "║  ██║██║     ██║   ██║██╔██╗ ██║    █████╗  ██║ ╚███╔╝ █████╗  ██████╔╝║",
      "║  ██║██║     ██║   ██║██║╚██╗██║    ██╔══╝  ██║ ██╔██╗ ██╔══╝  ██╔══██╗║",
      "║  ██║╚██████╗╚██████╔╝██║ ╚████║    ██║     ██║██╔╝ ██╗███████╗██║  ██║║",
      "║  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝    ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝║",
      "╠══════════════════════════════════════════════════════════════════════╣",
      "║              Steam Desktop Icon Restoration Utility v3.0            ║",
      "║                    Copyright (c) 1995 SVGA Systems                  ║",
      "╚══════════════════════════════════════════════════════════════════════╝"
    ];
    
    // Draw banner with consistent top margin
    const bannerWidth = banner[0].length;
    const bannerX = Math.floor((SVGA.cols - bannerWidth) / 2);
    const bannerY = 3; // Consistent 3-line top margin
    
    for (let i = 0; i < banner.length; i++) {
      putText(bannerX, bannerY + i, banner[i]);
    }
    
    // Menu positioning with proper spacing (3 lines below banner)
    const width = 56; // Wider for better proportion
    const height = this.items.length + 7; // Extra line for better spacing
    const menuY = bannerY + banner.length + 3; // 3-line gap from banner
    
    // Draw menu with double-line border for that premium 90s look
    const dlg = drawProfessionalMenu(width, height, menuY);
    
    // Menu title with proper separator
    putText(dlg.x + 2, dlg.y + 1, "╔" + "═".repeat(width - 6) + "╗");
    putText(dlg.x + 2, dlg.y + 2, "║" + centerText('MAIN MENU', width - 6) + "║");
    putText(dlg.x + 2, dlg.y + 3, "╚" + "═".repeat(width - 6) + "╝");

    // Menu items with consistent 2-char indent
    for (let i = 0; i < this.items.length; i++) {
      const label = this.items[i].label;
      const prefix = i === this.index ? ' ▸ ' : '   '; // 3-char prefix for alignment
      const line = prefix + label;
      putText(dlg.x + 3, dlg.y + 5 + i, line); // Start at y+5 for spacing
    }
    
    // Separator line before help text
    putText(dlg.x + 2, dlg.y + height - 3, "├" + "─".repeat(width - 6) + "┤");
    
    // Help text with proper spacing
    putText(dlg.x + 2, dlg.y + height - 2, centerText('[↑↓] Navigate  [Enter] Select  [ESC] Exit', width - 4));
    
    // Professional status bar at bottom of screen
    drawStatusBar();
    
    // Flush buffer to screen
    flush();
  }

  handleKey(e) {
    if (e.key === 'ArrowUp') {
      this.index = (this.index - 1 + this.items.length) % this.items.length;
      this.draw();
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      this.index = (this.index + 1) % this.items.length;
      this.draw();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const item = this.items[this.index];
      if (item && typeof item.action === 'function') item.action();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      if (typeof this.onCancel === 'function') this.onCancel();
      e.preventDefault();
    }
  }
}

export function showTopMenu() {
  const menu = new Menu('MAIN MENU', [
    { id: 'fix-current', label: 'Fix Icons in Current Directory', action: () => { showCenteredStatus('info', 'Not available in web build'); flush(); } },
    { id: 'fix-desktop', label: 'Fix Icons on Desktop', action: () => { showCenteredStatus('info', 'Not available in web build'); flush(); } },
    { id: 'browse', label: 'Browse for Directory...', action: () => { showCenteredStatus('info', 'Not available in web build'); flush(); } },
    { id: 'refresh-all', label: 'Replace ALL Desktop Shortcuts', action: () => { showCenteredStatus('info', 'Not available in web build'); flush(); } },
    { id: 'settings', label: 'Settings & Options', action: () => { showCenteredStatus('info', 'Settings coming soon'); flush(); } },
    { id: 'exit', label: 'Exit', action: () => { showCenteredStatus('success', 'Thanks for viewing!'); flush(); } },
  ]);
  menu.draw();
  return menu;
}
