import { clearScreen, drawBox, fillBox, putText, centerText, drawCenteredBox, flush, CGA } from './ui.js';

export class Menu {
  constructor(title, items) {
    this.title = title;
    this.items = items;
    this.index = 0;
  }

  draw() {
    clearScreen();
    
    // Simple title at top
    const titleLine = "=== STEAM ICON FIXER v3.0 ===";
    putText(Math.floor((CGA.cols - titleLine.length) / 2), 1, titleLine);
    putText(Math.floor((CGA.cols - 30) / 2), 2, "Fix Your Steam Desktop Icons");
    
    // Draw menu box
    const menuWidth = 50;
    const menuHeight = this.items.length + 4;
    const menuX = Math.floor((CGA.cols - menuWidth) / 2);
    const menuY = 5;
    
    // Clear area and draw box
    fillBox(menuX, menuY, menuWidth, menuHeight);
    drawBox(menuX, menuY, menuWidth, menuHeight);
    
    // Menu title
    putText(menuX + 2, menuY + 1, centerText(this.title, menuWidth - 4));
    
    // Menu items
    for (let i = 0; i < this.items.length; i++) {
      const prefix = (i === this.index) ? "> " : "  ";
      const text = prefix + this.items[i].label;
      putText(menuX + 2, menuY + 2 + i, text);
    }
    
    // Help text at bottom
    const helpText = "[UP/DOWN] Navigate  [ENTER] Select  [ESC] Exit";
    putText(Math.floor((CGA.cols - helpText.length) / 2), CGA.rows - 2, helpText);
    
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
  drawBox(msgX - 1, msgY - 1, msgWidth + 2, 3);
  putText(msgX, msgY, " " + msg + " ");
  flush();
  
  setTimeout(() => {
    showTopMenu();
  }, 2000);
}