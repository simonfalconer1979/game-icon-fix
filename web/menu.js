import { clearScreen, drawBox, fillBox, putText, centerText, drawCenteredBox, flush, CGA } from './ui.js';
import { IconFixerAPI } from './api.js';
import { setController } from './controller.js';

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
    this.drawContent();
    flush();
  }

  drawContent() {
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
    
    // Menu items - selected in MAGENTA, others in CYAN, with numbers
    for (let i = 0; i < this.items.length; i++) {
      const isSelected = (i === this.index);
      const prefix = isSelected ? "> " : "  ";
      const number = `${i + 1}. `;
      const text = prefix + number + this.items[i].label;
      const color = isSelected ? 'magenta' : 'cyan';
      const itemX = Math.floor((CGA.cols - 45) / 2);
      putText(itemX, menuY + 3 + i, text, color);
    }
    
    // Status message bar
    putText(0, CGA.rows - 11, "=".repeat(CGA.cols), 'white');
    
    // Split message into multiple lines if needed
    if (statusMessage) {
      const maxWidth = 70;
      const words = statusMessage.split(' ');
      const lines = [];
      let currentLine = '';
      
      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxWidth) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      // Display up to 3 lines of message
      for (let i = 0; i < Math.min(lines.length, 3); i++) {
        const msgX = Math.floor((CGA.cols - lines[i].length) / 2);
        putText(msgX, CGA.rows - 10 + i, lines[i], statusColor);
      }
    }
    
    // Help text at bottom
    putText(0, CGA.rows - 6, "-".repeat(CGA.cols), 'white');
    const helpText = "UP/DOWN: Navigate | ENTER: Select | ESC: Exit";
    putText(Math.floor((CGA.cols - helpText.length) / 2), CGA.rows - 5, helpText, 'white');
  }

  // Draw to back buffer for double buffering
  drawToBuffer() {
    this.drawContent();
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
    { id: 'detect-steam', label: 'Detect Steam Installation', action: () => detectSteam() },
    { id: 'scan-games', label: 'Scan for Installed Games', action: () => scanInstalledGames() },
    { id: 'fix-desktop', label: 'Fix Icons on Desktop', action: () => fixDesktopIcons() },
    { id: 'shutdown', label: 'Shutdown', action: () => shutdownSequence() },
  ]);
  window.currentMenu = menu;
  menu.draw();
  return menu;
}

async function scanInstalledGames() {
  showProgress('Scanning Steam libraries for installed games...');
  
  // Add a small delay to show the progress message
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const result = await IconFixerAPI.getInstalledGames();
  
  if (result.success) {
    const total = result.data.total;
    if (total === 0) {
      showMessage('No Steam games found. Please install games through Steam first.', 'warning');
    } else {
      // Show games in a scrollable popup
      showGamesPopup(result.data.games);
    }
  } else {
    showMessage(`Error scanning games: ${result.error}`, 'error');
  }
}

async function detectSteam() {
  showProgress('Detecting Steam installation...');
  const result = await IconFixerAPI.detectSteam();
  
  if (result.success) {
    // Get detailed library info
    const librariesResult = await IconFixerAPI.getLibraries();
    if (librariesResult.success) {
      showLibrariesPopup(result.data, librariesResult.data);
    } else {
      const msg = `Steam successfully detected! Installation path: ${result.data.installPath}. Found ${result.data.libraries} Steam libraries configured. User ID: ${result.data.userId}`;
      showMessage(msg, 'success');
    }
  } else {
    showMessage(`Steam not found: ${result.error}. Please ensure Steam is installed and has been run at least once.`, 'error');
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
    const msg = `SUCCESS: Fixed ${result.data.successful} of ${result.data.total} icons. ${result.data.failed > 0 ? `${result.data.failed} icons could not be downloaded from Steam CDN.` : 'All icons successfully downloaded and applied!'}`;
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
  
  // Show fake DOS prompt (moved 1 column right)
  putText(1, 0, "Microsoft(R) MS-DOS(R) Version 6.22", 'white');
  putText(1, 1, "(C)Copyright Microsoft Corp 1981-1994.", 'white');
  putText(1, 2, "", 'white');
  putText(1, 3, "C:\\GAMES\\ICONFIXER>exit", 'white');
  putText(1, 4, "", 'white');
  putText(1, 5, "Thank you for using Steam Icon Fixer!", 'cyan');
  putText(1, 6, "", 'white');
  putText(1, 7, "C:\\GAMES>_", 'white');
  
  // Add blinking cursor effect (also moved 1 column right)
  let cursorVisible = true;
  const cursorInterval = setInterval(() => {
    const cursor = cursorVisible ? "_" : " ";
    putText(9, 7, cursor, 'white');
    flush();
    cursorVisible = !cursorVisible;
  }, 500);
  
  // Add a message at the bottom (moved 1 column right)
  putText(1, CGA.rows - 2, "Press any key to restart Icon Fixer...", 'cyan');
  flush();
  
  // Create exit screen controller
  const exitController = {
    handleKey: (e) => {
      e.preventDefault();
      clearInterval(cursorInterval);
      const menu = showTopMenu();
      setController(menu);
    }
  };
  
  // Set exit screen as active controller
  setController(exitController);
}

function showLibrariesPopup(steamInfo, libraries) {
  const popupWidth = 70;
  const popupHeight = 12 + Math.min(libraries.length, 5); // Adjust height based on libraries
  const popupX = Math.floor((CGA.cols - popupWidth) / 2);
  const popupY = Math.floor((CGA.rows - popupHeight) / 2);
  
  const drawPopup = () => {
    // Clear and redraw everything
    clearScreen();
    
    // Draw the menu first
    if (window.currentMenu) {
      window.currentMenu.drawContent();
    }
    
    // Draw popup box on top
    fillBox(popupX, popupY, popupWidth, popupHeight, " ");
    drawBox(popupX, popupY, popupWidth, popupHeight, 'cyan');
    
    // Title
    const title = "STEAM INSTALLATION DETECTED";
    putText(popupX + Math.floor((popupWidth - title.length) / 2), popupY + 1, title, 'magenta');
    
    // Divider line
    putText(popupX + 1, popupY + 2, "-".repeat(popupWidth - 2), 'cyan');
    
    // Steam info (truncate long paths)
    let mainPath = `Main Path: ${steamInfo.installPath}`;
    if (mainPath.length > popupWidth - 4) {
      mainPath = mainPath.substring(0, popupWidth - 7) + "...";
    }
    putText(popupX + 2, popupY + 4, mainPath, 'white');
    
    let userId = `User ID: ${steamInfo.userId}`;
    if (userId.length > popupWidth - 4) {
      userId = userId.substring(0, popupWidth - 7) + "...";
    }
    putText(popupX + 2, popupY + 5, userId, 'white');
    
    putText(popupX + 2, popupY + 6, `Libraries Found: ${steamInfo.libraries}`, 'white');
    
    // Divider line
    putText(popupX + 1, popupY + 7, "-".repeat(popupWidth - 2), 'cyan');
    
    // Library paths
    putText(popupX + 2, popupY + 8, "Library Paths:", 'magenta');
    
    for (let i = 0; i < Math.min(libraries.length, 5); i++) {
      const lib = libraries[i];
      let pathDisplay = `  ${i + 1}. ${lib.path}`;
      if (lib.label) {
        pathDisplay += ` (${lib.label})`;
      }
      // Truncate if too long
      if (pathDisplay.length > popupWidth - 4) {
        pathDisplay = pathDisplay.substring(0, popupWidth - 7) + "...";
      }
      putText(popupX + 2, popupY + 9 + i, pathDisplay, 'white');
    }
    
    if (libraries.length > 5) {
      putText(popupX + 2, popupY + 14, `  ... and ${libraries.length - 5} more`, 'cyan');
    }
    
    // Close button
    putText(popupX + 1, popupY + popupHeight - 2, "-".repeat(popupWidth - 2), 'cyan');
    const closeText = "[ Press ESC or ENTER to close ]";
    putText(popupX + Math.floor((popupWidth - closeText.length) / 2), popupY + popupHeight - 1, closeText, 'white');
    
    flush();
  };
  
  // Create popup controller
  const popupController = {
    handleKey: (e) => {
      e.preventDefault();
      
      if (e.key === 'Escape' || e.key === 'Enter') {
        // Restore menu controller
        setController(window.currentMenu);
        window.currentMenu.draw();
        showMessage(`Steam ready: ${steamInfo.libraries} libraries configured`, 'success');
      }
    }
  };
  
  // Set popup as active controller
  setController(popupController);
  
  drawPopup();
}

function showGamesPopup(games) {
  const popupWidth = 60;
  const popupHeight = 15;
  const popupX = Math.floor((CGA.cols - popupWidth) / 2);
  const popupY = Math.floor((CGA.rows - popupHeight) / 2);
  
  let scrollOffset = 0;
  let selectedIndex = 0;
  const visibleItems = popupHeight - 6; // Account for borders and title
  
  const drawPopup = () => {
    // Clear and redraw everything
    clearScreen();
    
    // Draw the menu first
    if (window.currentMenu) {
      window.currentMenu.drawContent();
    }
    
    // Clear popup area with spaces first
    fillBox(popupX, popupY, popupWidth, popupHeight, " ");
    
    // Draw popup box
    drawBox(popupX, popupY, popupWidth, popupHeight, 'cyan');
    
    // Title
    const title = `INSTALLED GAMES (${games.length} Total)`;
    putText(popupX + Math.floor((popupWidth - title.length) / 2), popupY + 1, title, 'magenta');
    putText(popupX + 1, popupY + 2, "-".repeat(popupWidth - 2), 'cyan');
    
    // Draw visible games
    const endIndex = Math.min(scrollOffset + visibleItems, games.length);
    for (let i = scrollOffset; i < endIndex; i++) {
      const y = popupY + 3 + (i - scrollOffset);
      const game = games[i];
      const isSelected = i === selectedIndex;
      
      // Format game name (truncate if too long)
      let displayName = game.name;
      const maxNameLength = popupWidth - 8; // Account for margins and selection indicator
      if (displayName.length > maxNameLength) {
        displayName = displayName.substring(0, maxNameLength - 3) + "...";
      }
      
      // Create padded line
      const prefix = isSelected ? "> " : "  ";
      const paddedLine = (prefix + displayName).padEnd(popupWidth - 4, ' ');
      const color = isSelected ? 'magenta' : 'white';
      
      putText(popupX + 2, y, paddedLine, color);
    }
    
    // Clear any remaining lines in the visible area
    for (let i = endIndex; i < scrollOffset + visibleItems; i++) {
      const y = popupY + 3 + (i - scrollOffset);
      const emptyLine = " ".repeat(popupWidth - 4);
      putText(popupX + 2, y, emptyLine, 'white');
    }
    
    // Scroll indicators
    if (scrollOffset > 0) {
      putText(popupX + popupWidth - 3, popupY + 3, "^", 'cyan');
    }
    if (scrollOffset + visibleItems < games.length) {
      putText(popupX + popupWidth - 3, popupY + popupHeight - 3, "v", 'cyan');
    }
    
    // Help text
    putText(popupX + 1, popupY + popupHeight - 2, "-".repeat(popupWidth - 2), 'cyan');
    const helpText = "UP/DOWN: Scroll | ESC: Close | ENTER: Create Shortcut";
    putText(popupX + Math.floor((popupWidth - helpText.length) / 2), popupY + popupHeight - 1, helpText, 'white');
    
    flush();
  };
  
  // Create popup controller
  const popupController = {
    handleKey: (e) => {
      e.preventDefault();
      
      if (e.key === 'Escape') {
        // Restore menu controller
        setController(window.currentMenu);
        window.currentMenu.draw();
      } else if (e.key === 'ArrowUp') {
        if (selectedIndex > 0) {
          selectedIndex--;
          // Adjust scroll if needed
          if (selectedIndex < scrollOffset) {
            scrollOffset = selectedIndex;
          }
          drawPopup();
        }
      } else if (e.key === 'ArrowDown') {
        if (selectedIndex < games.length - 1) {
          selectedIndex++;
          // Adjust scroll if needed
          if (selectedIndex >= scrollOffset + visibleItems) {
            scrollOffset = selectedIndex - visibleItems + 1;
          }
          drawPopup();
        }
      } else if (e.key === 'Enter') {
        // Create shortcut for selected game
        const game = games[selectedIndex];
        showMessage(`Creating shortcut for ${game.name} (AppID: ${game.appId})...`, 'info');
        
        // Restore menu controller
        setController(window.currentMenu);
        window.currentMenu.draw();
      }
    }
  };
  
  // Set popup as active controller
  setController(popupController);
  
  drawPopup();
}

async function shutdownSequence() {
  clearScreen();
  
  // Start shutdown sequence
  putText(1, 0, "C:\\GAMES\\ICONFIXER>shutdown /s /t 0", 'white');
  flush();
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  putText(1, 2, "Windows is shutting down...", 'cyan');
  flush();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Show shutdown messages
  const messages = [
    "Closing all applications...",
    "Saving system settings...",
    "Stopping services...",
    "Flushing disk cache...",
    "Power off sequence initiated..."
  ];
  
  for (let i = 0; i < messages.length; i++) {
    putText(3, 4 + i, messages[i], 'white');
    flush();
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Final message
  putText(1, 11, "It is now safe to turn off your computer.", 'cyan');
  flush();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate CRT monitor power down
  clearScreen();
  putText(39, 12, "*", 'white');  // Single white dot in center
  flush();
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Fade to black
  clearScreen();
  flush();
  
  // Add power-off effect to the monitor
  const screen = document.querySelector('.monitor-screen');
  if (screen) {
    screen.style.transition = 'all 0.5s ease-out';
    screen.style.backgroundColor = '#000';
    screen.style.opacity = '0';
  }
  
  // Attempt to close the browser tab/window
  setTimeout(() => {
    // Try multiple methods to close the window
    try {
      // Method 1: Direct window.close()
      window.close();
      
      // Method 2: Open blank page and close
      window.open('', '_self', '');
      window.close();
      
      // Method 3: Replace location with about:blank
      window.location.href = 'about:blank';
      
    } catch (e) {
      // If all methods fail, show a black screen with instructions
      document.body.style.backgroundColor = '#000';
      document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
          <div style="text-align: center; color: #333; font-family: monospace;">
            <p>POWER OFF</p>
            <p style="font-size: 12px; margin-top: 20px;">Close this tab to complete shutdown</p>
          </div>
        </div>
      `;
    }
  }, 1000);
}