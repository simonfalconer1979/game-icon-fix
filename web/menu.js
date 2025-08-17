import { clearScreen, drawBox, fillBox, putText, centerText, drawCenteredBox, flush, CGA } from './ui.js';

export class Menu {
  constructor(title, items) {
    this.title = title;
    this.items = items;
    this.index = 0;
  }

  draw() {
    clearScreen();
    
    // Title in MAGENTA
    const titleLine1 = "╔════════════════════════════════╗";
    const titleLine2 = "║    STEAM ICON FIXER v3.0       ║";
    const titleLine3 = "║    Fix Your Desktop Icons      ║";
    const titleLine4 = "╚════════════════════════════════╝";
    
    const titleX = Math.floor((CGA.cols - titleLine1.length) / 2);
    putText(titleX, 1, titleLine1, 'magenta');
    putText(titleX, 2, titleLine2, 'magenta');
    putText(titleX, 3, titleLine3, 'cyan');
    putText(titleX, 4, titleLine4, 'magenta');
    
    // Draw menu box in WHITE
    const menuWidth = 50;
    const menuHeight = this.items.length + 4;
    const menuX = Math.floor((CGA.cols - menuWidth) / 2);
    const menuY = 7;
    
    // Clear area and draw box
    fillBox(menuX, menuY, menuWidth, menuHeight);
    drawBox(menuX, menuY, menuWidth, menuHeight, 'white');
    
    // Menu title in WHITE
    putText(menuX + 2, menuY + 1, centerText(this.title, menuWidth - 4), 'white');
    
    // Menu items - selected in MAGENTA, others in CYAN
    for (let i = 0; i < this.items.length; i++) {
      const isSelected = (i === this.index);
      const prefix = isSelected ? "► " : "  ";
      const text = prefix + this.items[i].label;
      const color = isSelected ? 'magenta' : 'cyan';
      putText(menuX + 2, menuY + 2 + i, text, color);
    }
    
    // Help text at bottom in WHITE
    const helpText = "[↑↓] Navigate  [ENTER] Select  [ESC] Exit";
    putText(Math.floor((CGA.cols - helpText.length) / 2), CGA.rows - 2, helpText, 'white');
    
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
      if (item && typeof item.action === 'function') {
        item.action();
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      if (typeof this.onCancel === 'function') {
        this.onCancel();
      }
      e.preventDefault();
    }
  }
}

export function showTopMenu() {
  const menu = new Menu('MAIN MENU', [
    { id: 'fix-current', label: 'Fix Icons in Current Directory', action: () => showMessage('Feature coming soon!') },
    { id: 'fix-desktop', label: 'Fix Icons on Desktop', action: () => showMessage('Feature coming soon!') },
    { id: 'browse', label: 'Browse for Directory...', action: () => showMessage('Feature coming soon!') },
    { id: 'refresh-all', label: 'Replace ALL Desktop Shortcuts', action: () => showMessage('Feature coming soon!') },
    { id: 'settings', label: 'Settings & Options', action: () => showMessage('Feature coming soon!') },
    { id: 'exit', label: 'Exit', action: () => showMessage('Thanks for using Icon Fixer!') },
  ]);
  menu.draw();
  return menu;
}

function showMessage(msg) {
  const msgWidth = msg.length + 4;
  const msgX = Math.floor((CGA.cols - msgWidth) / 2);
  const msgY = Math.floor(CGA.rows / 2);
  
  fillBox(msgX - 1, msgY - 1, msgWidth + 2, 3);
  drawBox(msgX - 1, msgY - 1, msgWidth + 2, 3, 'magenta');
  putText(msgX, msgY, " " + msg + " ", 'white');
  flush();
  
  setTimeout(() => {
    showTopMenu();
  }, 2000);
}