import { clearScreen, drawBox, fillBox, putText, centerText, drawCenteredBox, flush, CGA } from './ui.js';

export class Menu {
  constructor(title, items) {
    this.title = title;
    this.items = items;
    this.index = 0;
  }

  draw() {
    clearScreen();
    
    // Simple ASCII title
    const title = "STEAM ICON FIXER v3.0";
    const subtitle = "Fix Your Desktop Icons";
    
    putText(Math.floor((CGA.cols - title.length) / 2), 2, title, 'magenta');
    putText(Math.floor((CGA.cols - subtitle.length) / 2), 3, subtitle, 'cyan');
    putText(0, 4, "=".repeat(CGA.cols), 'white');
    
    // Draw menu - simpler layout
    const menuY = 7;
    
    // Menu title
    putText(Math.floor((CGA.cols - this.title.length) / 2), menuY, this.title, 'white');
    putText(Math.floor((CGA.cols - 40) / 2), menuY + 1, "----------------------------------------", 'white');
    
    // Menu items - selected in MAGENTA, others in CYAN
    for (let i = 0; i < this.items.length; i++) {
      const isSelected = (i === this.index);
      const prefix = isSelected ? "> " : "  ";
      const text = prefix + this.items[i].label;
      const color = isSelected ? 'magenta' : 'cyan';
      const itemX = Math.floor((CGA.cols - 40) / 2);
      putText(itemX, menuY + 3 + i, text, color);
    }
    
    // Help text at bottom in WHITE
    putText(0, CGA.rows - 3, "=".repeat(CGA.cols), 'white');
    const helpText = "UP/DOWN: Navigate | ENTER: Select | ESC: Exit";
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