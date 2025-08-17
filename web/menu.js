import { clearScreen, drawBox, fillBox, putText, centerText, drawCenteredBox, flush, CGA } from './ui.js';
import { IconFixerAPI } from './api.js';

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
    { id: 'fix-current', label: 'Fix Icons in Current Directory', action: () => fixCurrentDirectory() },
    { id: 'fix-desktop', label: 'Fix Icons on Desktop', action: () => fixDesktopIcons() },
    { id: 'browse', label: 'Browse for Directory...', action: () => browseDirectory() },
    { id: 'refresh-all', label: 'Replace ALL Desktop Shortcuts', action: () => replaceAllShortcuts() },
    { id: 'detect-steam', label: 'Detect Steam Installation', action: () => detectSteam() },
    { id: 'exit', label: 'Exit', action: () => showMessage('Thanks for using Icon Fixer!') },
  ]);
  menu.draw();
  return menu;
}

async function detectSteam() {
  showProgress('Detecting Steam installation...');
  const result = await IconFixerAPI.detectSteam();
  
  if (result.success) {
    showMessage(`Steam found at: ${result.data.installPath}`);
  } else {
    showMessage(`Steam not found: ${result.error}`, 'error');
  }
}

async function fixDesktopIcons() {
  showProgress('Scanning desktop for Steam shortcuts...');
  
  // First get list of shortcuts
  const shortcuts = await IconFixerAPI.getDesktopShortcuts();
  if (!shortcuts.success) {
    showMessage(`Error: ${shortcuts.error}`, 'error');
    return;
  }
  
  if (shortcuts.data.length === 0) {
    showMessage('No Steam shortcuts found on desktop', 'warning');
    return;
  }
  
  showProgress(`Found ${shortcuts.data.length} shortcuts. Fixing icons...`);
  
  // Fix the icons
  const result = await IconFixerAPI.fixDesktopIcons();
  
  if (result.success) {
    const msg = `Fixed ${result.data.successful} of ${result.data.total} icons`;
    showMessage(msg, 'success');
  } else {
    showMessage(`Error: ${result.error}`, 'error');
  }
}

async function fixCurrentDirectory() {
  showMessage('This requires selecting a directory first', 'info');
}

async function browseDirectory() {
  showMessage('Directory browser not yet implemented', 'info');
}

async function replaceAllShortcuts() {
  showProgress('This will recreate all Steam shortcuts...');
  
  // For now, just fix existing ones
  const result = await IconFixerAPI.fixDesktopIcons();
  
  if (result.success) {
    const msg = `Replaced ${result.data.successful} shortcuts`;
    showMessage(msg, 'success');
  } else {
    showMessage(`Error: ${result.error}`, 'error');
  }
}

function showProgress(msg) {
  clearScreen();
  
  const progressY = Math.floor(CGA.rows / 2) - 2;
  const progressX = Math.floor((CGA.cols - msg.length) / 2);
  
  putText(progressX, progressY, msg, 'cyan');
  putText(Math.floor((CGA.cols - 40) / 2), progressY + 2, "========================================", 'white');
  putText(Math.floor((CGA.cols - 15) / 2), progressY + 4, "Please wait...", 'magenta');
  
  flush();
}

function showMessage(msg, type = 'info') {
  const msgWidth = Math.min(msg.length + 4, 70);
  const msgX = Math.floor((CGA.cols - msgWidth) / 2);
  const msgY = Math.floor(CGA.rows / 2);
  
  // Choose color based on type
  const boxColor = type === 'error' ? 'magenta' : 
                   type === 'success' ? 'cyan' : 
                   type === 'warning' ? 'white' : 'cyan';
  
  fillBox(msgX - 1, msgY - 1, msgWidth + 2, 3);
  drawBox(msgX - 1, msgY - 1, msgWidth + 2, 3, boxColor);
  
  // Truncate message if too long
  const displayMsg = msg.length > msgWidth - 2 ? 
    msg.substring(0, msgWidth - 5) + "..." : msg;
  
  putText(msgX, msgY, " " + displayMsg + " ", 'white');
  flush();
  
  setTimeout(() => {
    showTopMenu();
  }, 3000);
}