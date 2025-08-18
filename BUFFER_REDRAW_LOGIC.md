# Buffer and Redraw Logic Documentation

## Overview
The Steam Icon Fixer web interface uses a double-buffering system for smooth screen updates and proper popup rendering.

## Menu Items (Numbered)
1. Detect Steam Installation
2. Scan for Installed Games  
3. Fix Icons on Desktop
4. Shutdown

## Buffer System Architecture

### Main Buffers (ui.js)
- `buffer`: Main display buffer (80x25 character grid)
- `colorBuffer`: Stores color information for each line
- `backBuffer`: Back buffer for double buffering
- `backColorBuffer`: Back buffer for colors

### Key Functions
- `clearScreen()`: Clears buffer and immediately flushes
- `putText(x, y, text, color)`: Writes text to buffer at position
- `flush()`: Renders buffer contents to screen
- `beginDraw()`: Starts drawing to back buffer
- `endDraw()`: Swaps buffers and flushes

## Menu Redraw Logic

### Main Menu (Menu class)
- `draw()`: Clears screen, draws content, flushes
- `drawContent()`: Renders menu items with numbers
- `drawToBuffer()`: Alias for drawContent (for popup compatibility)

### Status Messages
- `setStatus()`: Updates status message and redraws menu
- `showProgress()`: Shows cyan progress message
- `showMessage()`: Shows colored message with 3-second timeout

## Entry/Exit Points for Each Menu Item

### 1. Detect Steam Installation
**Entry:**
- Shows progress message
- Calls Steam detection API
**Exit:**
- Success: Opens showLibrariesPopup() OR shows success message
- Error: Shows error message
- Both paths redraw menu via setStatus()

### 2. Scan for Installed Games  
**Entry:**
- Shows progress "Scanning Steam libraries..."
- Calls API to get installed games
**Exit:**
- Success with games: Opens showGamesPopup()
- Success no games: Shows warning message
- Error: Shows error message
- All paths redraw menu

### 3. Fix Icons on Desktop
**Entry:**
- Shows progress "Scanning desktop..."
- Gets desktop shortcuts
- Shows progress "Fixing icons..."
**Exit:**
- Shows success/error message
- Redraws menu via setStatus()

### 4. Replace ALL Desktop Shortcuts
**Entry:**
- Shows progress message
- Calls fix desktop API
**Exit:**  
- Shows success/error message
- Redraws menu via setStatus()

### 5. Exit
**Entry:**
- Clears screen completely
- Shows DOS prompt
- Starts cursor blink animation
**Exit:**
- On keypress: Clears interval, removes handler, calls showTopMenu()

### 6. Shutdown
**Entry:**
- Clears screen
- Shows shutdown sequence animation
**Exit:**
- Attempts window.close()
- Falls back to "close this window" message

## Popup Buffer Management

### showLibrariesPopup()
**Entry:**
- Uses beginDraw() to start back buffer
- Calls currentMenu.drawToBuffer() to preserve background
- Draws popup content
- Uses endDraw() to swap and flush
**Exit (ESC/Enter):**
- Removes popup handler
- Calls currentMenu.draw() to restore menu
- Re-attaches menu handler
- Shows success message

### showGamesPopup()  
**Entry:**
- Uses beginDraw() to start back buffer
- Calls currentMenu.drawToBuffer() to preserve background
- Draws popup with game list
- Uses endDraw() to swap and flush
**Exit (ESC):**
- Removes popup handler
- Calls currentMenu.draw() to restore menu
- Re-attaches menu handler
**Exit (Enter):**
- Shows "Creating shortcut" message
- Closes popup and restores menu

## Key Redraw Patterns

1. **Direct Menu Updates**: Use `setStatus()` which calls `menu.draw()`
2. **Popup Overlays**: Use `beginDraw()`/`endDraw()` with background preservation
3. **Screen Transitions**: Use `clearScreen()` followed by direct `putText()` calls
4. **Animation Sequences**: Multiple `flush()` calls with delays

## Buffer State Guarantees

- Buffer is always initialized via `initBuffers()` 
- clearScreen() always initializes if needed
- putText() always initializes if needed
- Popups preserve and restore menu state
- Event handlers properly swap on popup entry/exit