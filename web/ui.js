// CGA 80x25 text mode renderer for browser
export const CGA = {
  cols: 80,
  rows: 25,
};

let buffer;
let colorBuffer;
let backBuffer;
let backColorBuffer;

// CGA Palette 0 color codes
const CGA_COLORS = {
  black: '\x1b[30m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

export function clearScreen(fill = " ") {
  buffer = Array.from({ length: CGA.rows }, () => fill.repeat(CGA.cols));
  colorBuffer = Array.from({ length: CGA.rows }, () => []);
  backBuffer = Array.from({ length: CGA.rows }, () => fill.repeat(CGA.cols));
  backColorBuffer = Array.from({ length: CGA.rows }, () => []);
  flush();
}

// Begin drawing to back buffer
export function beginDraw() {
  if (!backBuffer) {
    backBuffer = Array.from({ length: CGA.rows }, () => " ".repeat(CGA.cols));
    backColorBuffer = Array.from({ length: CGA.rows }, () => []);
  }
  // Clear back buffer
  for (let y = 0; y < CGA.rows; y++) {
    backBuffer[y] = " ".repeat(CGA.cols);
    backColorBuffer[y] = [];
  }
}

// End drawing and swap buffers
export function endDraw() {
  if (backBuffer) {
    buffer = [...backBuffer];
    colorBuffer = backColorBuffer.map(row => [...row]);
    flush();
  }
}

export function flush() {
  const screen = document.getElementById("screen");
  if (screen) {
    // Build HTML with color spans
    let html = '';
    for (let y = 0; y < CGA.rows; y++) {
      const row = buffer[y];
      const colors = colorBuffer[y];
      
      if (!colors || colors.length === 0) {
        // Escape HTML characters
        html += escapeHtml(row);
      } else {
        let result = row;
        let output = '';
        let lastPos = 0;
        
        // Sort color spans by start position
        colors.sort((a, b) => a.start - b.start);
        
        // Apply color spans
        for (const span of colors) {
          output += escapeHtml(result.substring(lastPos, span.start));
          const spanText = escapeHtml(result.substring(span.start, span.end));
          output += `<span class="cga-${span.color}">${spanText}</span>`;
          lastPos = span.end;
        }
        output += escapeHtml(result.substring(lastPos));
        html += output;
      }
      if (y < CGA.rows - 1) html += '\n';
    }
    screen.innerHTML = html;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function putText(x, y, text, color = null) {
  if (y < 0 || y >= CGA.rows || x < 0) return;
  if (text.length === 0) return;
  
  // Initialize buffers if they don't exist
  if (!buffer) {
    buffer = Array.from({ length: CGA.rows }, () => " ".repeat(CGA.cols));
    colorBuffer = Array.from({ length: CGA.rows }, () => []);
  }
  
  // Use back buffer if we're in drawing mode, otherwise front buffer
  const targetBuffer = backBuffer ? backBuffer : buffer;
  const targetColorBuffer = backBuffer ? backColorBuffer : colorBuffer;
  
  if (!targetBuffer) return;
  
  const row = targetBuffer[y] || " ".repeat(CGA.cols);
  const safeText = text.substring(0, CGA.cols - x);
  targetBuffer[y] = row.substring(0, x) + safeText + row.substring(x + safeText.length);
  
  // Store color information
  if (color && targetColorBuffer[y]) {
    targetColorBuffer[y].push({
      start: x,
      end: x + safeText.length,
      color: color
    });
  }
}

export function drawBox(x, y, width, height, color = null) {
  // Simple ASCII box using standard characters
  const h = "-";
  const v = "|";
  const tl = "+";
  const tr = "+";
  const bl = "+";
  const br = "+";
  
  // Top
  putText(x, y, tl + h.repeat(width - 2) + tr, color);
  
  // Sides
  for (let i = 1; i < height - 1; i++) {
    putText(x, y + i, v, color);
    putText(x + width - 1, y + i, v, color);
  }
  
  // Bottom
  putText(x, y + height - 1, bl + h.repeat(width - 2) + br, color);
}

export function fillBox(x, y, width, height, char = " ") {
  for (let i = 0; i < height; i++) {
    putText(x, y + i, char.repeat(width));
  }
}

export function centerText(text, width) {
  const pad = Math.floor((width - text.length) / 2);
  return " ".repeat(Math.max(0, pad)) + text;
}

export function drawCenteredBox(width, height) {
  const x = Math.floor((CGA.cols - width) / 2);
  const y = Math.floor((CGA.rows - height) / 2);
  drawBox(x, y, width, height);
  return { x, y, width, height };
}

// Initialize buffers
buffer = Array.from({ length: CGA.rows }, () => " ".repeat(CGA.cols));
colorBuffer = Array.from({ length: CGA.rows }, () => []);