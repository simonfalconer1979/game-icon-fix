/**
 * Authentic retro video buffer system
 * Simulates direct video memory access like old CGA/VGA systems
 */

export class VideoBuffer {
  constructor(cols = 80, rows = 25) {
    this.cols = cols;
    this.rows = rows;
    
    // Simulate video memory - each cell has char + attribute
    // In real CGA: 0xB8000 was the video memory address
    this.videoMemory = new Array(rows * cols);
    this.backBuffer = new Array(rows * cols);
    
    // Initialize with spaces and default color
    const defaultCell = { char: ' ', attr: 0x07 }; // white on black
    for (let i = 0; i < this.videoMemory.length; i++) {
      this.videoMemory[i] = { ...defaultCell };
      this.backBuffer[i] = { ...defaultCell };
    }
    
    // Dirty region tracking for optimized rendering
    this.dirtyRegions = [];
    this.fullDirty = true;
    
    // Color attribute mapping (CGA style)
    this.colorMap = {
      'black': 0x0,
      'blue': 0x1,
      'green': 0x2,
      'cyan': 0x3,
      'red': 0x4,
      'magenta': 0x5,
      'brown': 0x6,
      'white': 0x7,
      'gray': 0x8,
      'lightblue': 0x9,
      'lightgreen': 0xA,
      'lightcyan': 0xB,
      'lightred': 0xC,
      'lightmagenta': 0xD,
      'yellow': 0xE,
      'brightwhite': 0xF
    };
    
    // Current page (for page flipping)
    this.activePage = 0;
    
    // DOM element cache
    this.screenElement = null;
    this.canvasElement = null;
    this.useCanvas = false; // Can switch to canvas for even better performance
  }
  
  /**
   * Initialize DOM rendering
   */
  init(elementId = 'screen') {
    this.screenElement = document.getElementById(elementId);
    if (!this.screenElement) {
      console.error('Screen element not found');
      return;
    }
    
    // Create character grid
    this.createCharacterGrid();
  }
  
  /**
   * Create a grid of span elements for each character position
   * This is more efficient than innerHTML updates
   */
  createCharacterGrid() {
    // Create a document fragment for efficiency
    const fragment = document.createDocumentFragment();
    
    // Pre-create all character cells
    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      const row = [];
      for (let x = 0; x < this.cols; x++) {
        const span = document.createElement('span');
        span.className = 'cell';
        span.textContent = ' ';
        fragment.appendChild(span);
        row.push(span);
      }
      // Add newline except for last row
      if (y < this.rows - 1) {
        fragment.appendChild(document.createTextNode('\n'));
      }
    }
    
    // Clear and append all at once
    this.screenElement.innerHTML = '';
    this.screenElement.appendChild(fragment);
  }
  
  /**
   * Write a character directly to video memory (like old INT 10h)
   */
  writeChar(x, y, char, fgColor = 'white', bgColor = 'black') {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
    
    const offset = y * this.cols + x;
    const fg = this.colorMap[fgColor] || 0x7;
    const bg = this.colorMap[bgColor] || 0x0;
    const attr = (bg << 4) | fg;
    
    // Write to back buffer
    this.backBuffer[offset] = { char: char || ' ', attr };
    
    // Mark region as dirty
    this.markDirty(x, y, 1, 1);
  }
  
  /**
   * Write string to video memory
   */
  writeString(x, y, text, fgColor = 'white', bgColor = 'black') {
    for (let i = 0; i < text.length && x + i < this.cols; i++) {
      this.writeChar(x + i, y, text[i], fgColor, bgColor);
    }
  }
  
  /**
   * Clear screen with specific character and color
   */
  cls(char = ' ', fgColor = 'white', bgColor = 'black') {
    const fg = this.colorMap[fgColor] || 0x7;
    const bg = this.colorMap[bgColor] || 0x0;
    const attr = (bg << 4) | fg;
    
    for (let i = 0; i < this.backBuffer.length; i++) {
      this.backBuffer[i] = { char, attr };
    }
    
    this.fullDirty = true;
  }
  
  /**
   * Mark a region as dirty (needs redraw)
   */
  markDirty(x, y, width, height) {
    // For simplicity, we'll just track if we need full redraw
    // In a real implementation, you'd track rectangles
    this.dirtyRegions.push({ x, y, width, height });
  }
  
  /**
   * Page flip - swap buffers instantly
   */
  flip() {
    // Swap buffers
    [this.videoMemory, this.backBuffer] = [this.backBuffer, this.videoMemory];
    
    // Render only dirty regions
    this.render();
    
    // Clear dirty flags
    this.dirtyRegions = [];
    this.fullDirty = false;
  }
  
  /**
   * Render video memory to DOM (optimized)
   */
  render() {
    if (!this.cells) return;
    
    if (this.fullDirty) {
      // Full screen update
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          const offset = y * this.cols + x;
          const cell = this.videoMemory[offset];
          const span = this.cells[y][x];
          
          // Only update if changed
          if (span.textContent !== cell.char) {
            span.textContent = cell.char;
          }
          
          // Update color class
          const fg = cell.attr & 0x0F;
          const bg = (cell.attr >> 4) & 0x0F;
          const className = `c${fg} b${bg}`;
          if (span.className !== className) {
            span.className = className;
          }
        }
      }
    } else {
      // Optimized: only update dirty regions
      for (const region of this.dirtyRegions) {
        for (let dy = 0; dy < region.height; dy++) {
          for (let dx = 0; dx < region.width; dx++) {
            const x = region.x + dx;
            const y = region.y + dy;
            if (x >= this.cols || y >= this.rows) continue;
            
            const offset = y * this.cols + x;
            const cell = this.videoMemory[offset];
            const span = this.cells[y][x];
            
            span.textContent = cell.char;
            const fg = cell.attr & 0x0F;
            const bg = (cell.attr >> 4) & 0x0F;
            span.className = `c${fg} b${bg}`;
          }
        }
      }
    }
  }
  
  /**
   * Direct VRAM-style access (for compatibility)
   */
  poke(offset, value) {
    if (offset < 0 || offset >= this.backBuffer.length * 2) return;
    
    const cellIndex = Math.floor(offset / 2);
    if (offset % 2 === 0) {
      // Character byte
      this.backBuffer[cellIndex].char = String.fromCharCode(value);
    } else {
      // Attribute byte
      this.backBuffer[cellIndex].attr = value;
    }
    
    const x = cellIndex % this.cols;
    const y = Math.floor(cellIndex / this.cols);
    this.markDirty(x, y, 1, 1);
  }
  
  /**
   * Box drawing with line characters (like old DOS programs)
   */
  drawBox(x, y, width, height, style = 'single') {
    const chars = {
      single: { h: '─', v: '│', tl: '┌', tr: '┐', bl: '└', br: '┘' },
      double: { h: '═', v: '║', tl: '╔', tr: '╗', bl: '╚', br: '╝' },
      ascii: { h: '-', v: '|', tl: '+', tr: '+', bl: '+', br: '+' }
    };
    
    const box = chars[style] || chars.single;
    
    // Top line
    this.writeChar(x, y, box.tl);
    for (let i = 1; i < width - 1; i++) {
      this.writeChar(x + i, y, box.h);
    }
    this.writeChar(x + width - 1, y, box.tr);
    
    // Sides
    for (let i = 1; i < height - 1; i++) {
      this.writeChar(x, y + i, box.v);
      this.writeChar(x + width - 1, y + i, box.v);
    }
    
    // Bottom line
    this.writeChar(x, y + height - 1, box.bl);
    for (let i = 1; i < width - 1; i++) {
      this.writeChar(x + i, y + height - 1, box.h);
    }
    this.writeChar(x + width - 1, y + height - 1, box.br);
  }
}

// CSS for the character cells
export const videoBufferCSS = `
  #screen {
    font-family: 'Perfect DOS VGA 437', 'Courier New', monospace;
    white-space: pre;
    line-height: 1;
  }
  
  /* CGA color classes */
  .c0 { color: #000000; } /* black */
  .c1 { color: #0000AA; } /* blue */
  .c2 { color: #00AA00; } /* green */
  .c3 { color: #00AAAA; } /* cyan */
  .c4 { color: #AA0000; } /* red */
  .c5 { color: #AA00AA; } /* magenta */
  .c6 { color: #AA5500; } /* brown */
  .c7 { color: #AAAAAA; } /* white */
  .c8 { color: #555555; } /* gray */
  .c9 { color: #5555FF; } /* light blue */
  .c10 { color: #55FF55; } /* light green */
  .c11 { color: #55FFFF; } /* light cyan */
  .c12 { color: #FF5555; } /* light red */
  .c13 { color: #FF55FF; } /* light magenta */
  .c14 { color: #FFFF55; } /* yellow */
  .c15 { color: #FFFFFF; } /* bright white */
  
  /* Background colors */
  .b0 { background-color: #000000; }
  .b1 { background-color: #0000AA; }
  .b2 { background-color: #00AA00; }
  .b3 { background-color: #00AAAA; }
  .b4 { background-color: #AA0000; }
  .b5 { background-color: #AA00AA; }
  .b6 { background-color: #AA5500; }
  .b7 { background-color: #AAAAAA; }
`;