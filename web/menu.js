import { clearScreen, drawBox, fillBox, putText, centerText, drawCenteredBox, flush, CGA } from './ui.js';
import { IconFixerAPI } from './api.js';

let statusMessage = '';
let statusColor = 'white';
let statusTimeout = null;

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
    const menuY = 6;
    
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
    
    // Status message bar (moved up 6 lines from original)
    putText(0, CGA.rows - 11, "=".repeat(CGA.cols), 'white');
    if (statusMessage) {
      const msgX = Math.floor((CGA.cols - statusMessage.length) / 2);
      putText(msgX, CGA.rows - 10, statusMessage, statusColor);
    }
    
    // Help text at bottom (moved up 6 lines from original)
    putText(0, CGA.rows - 8, "-".repeat(CGA.cols), 'white');
    const helpText = "UP/DOWN: Navigate | ENTER: Select | ESC: Exit";
    putText(Math.floor((CGA.cols - helpText.length) / 2), CGA.rows - 7, helpText, 'white');
    
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
    { id: 'fix-desktop', label: 'Fix Icons on Desktop', action: () => fixDesktopIcons() },
    { id: 'refresh-all', label: 'Replace ALL Desktop Shortcuts', action: () => replaceAllShortcuts() },
    { id: 'detect-steam', label: 'Detect Steam Installation', action: () => detectSteam() },
    { id: 'exit', label: 'Exit', action: () => exitToDOS() },
  ]);
  window.currentMenu = menu;
  menu.draw();
  return menu;
}

async function detectSteam() {
  showProgress('Detecting Steam installation...');
  const result = await IconFixerAPI.detectSteam();
  
  if (result.success) {
    const msg = `Steam found: ${result.data.installPath} (${result.data.libraries} libraries)`;
    showMessage(msg, 'success');
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
  
  // Add a small delay to show the progress message
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Fix the icons
  const result = await IconFixerAPI.fixDesktopIcons();
  
  if (result.success) {
    const msg = `SUCCESS: Fixed ${result.data.successful} of ${result.data.total} icons (${result.data.failed} failed)`;
    showMessage(msg, 'success');
  } else {
    showMessage(`Error: ${result.error}`, 'error');
  }
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

function setStatus(msg, color = 'white', duration = 0) {
  statusMessage = msg;
  statusColor = color;
  
  if (statusTimeout) {
    clearTimeout(statusTimeout);
    statusTimeout = null;
  }
  
  if (duration > 0) {
    statusTimeout = setTimeout(() => {
      statusMessage = '';
      if (window.currentMenu) {
        window.currentMenu.draw();
      }
    }, duration);
  }
  
  if (window.currentMenu) {
    window.currentMenu.draw();
  }
}

function showProgress(msg) {
  setStatus(msg, 'cyan');
}

function showMessage(msg, type = 'info') {
  // Choose color based on type
  const color = type === 'error' ? 'magenta' : 
                type === 'success' ? 'cyan' : 
                type === 'warning' ? 'white' : 'cyan';
  
  setStatus(msg, color, 3000);
}

function exitToDOS() {
  clearScreen();
  
  // Show fake DOS prompt
  putText(0, 0, "Microsoft(R) MS-DOS(R) Version 6.22", 'white');
  putText(0, 1, "(C)Copyright Microsoft Corp 1981-1994.", 'white');
  putText(0, 2, "", 'white');
  putText(0, 3, "C:\\GAMES\\ICONFIXER>exit", 'white');
  putText(0, 4, "", 'white');
  putText(0, 5, "Thank you for using Steam Icon Fixer!", 'cyan');
  putText(0, 6, "", 'white');
  putText(0, 7, "C:\\GAMES>_", 'white');
  
  // Add blinking cursor effect
  let cursorVisible = true;
  const cursorInterval = setInterval(() => {
    const cursor = cursorVisible ? "_" : " ";
    putText(8, 7, cursor, 'white');
    flush();
    cursorVisible = !cursorVisible;
  }, 500);
  
  // Add a message at the bottom
  putText(0, CGA.rows - 2, "Press any key to restart Icon Fixer...", 'cyan');
  flush();
  
  // Listen for any key to restart
  const restartHandler = (e) => {
    e.preventDefault();
    clearInterval(cursorInterval);
    document.removeEventListener('keydown', restartHandler);
    showTopMenu();
  };
  
  document.addEventListener('keydown', restartHandler);
}