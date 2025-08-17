// CGA 80x25 text mode renderer for browser
export const CGA = {
  cols: 80,
  rows: 25,
};

let buffer;
let colorBuffer;

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
  flush();
}

export function flush() {
  const screen = document.getElementById("screen");
  if (screen) {
    // Build HTML with color spans
    let html = '';
    for (let y = 0; y < CGA.rows; y++) {
      const row = buffer[y];
      const colors = colorBuffer[y];
      
      if (colors.length === 0) {
        html += row + '\n';
      } else {
        let result = row;
        let output = '';
        let lastPos = 0;
        
        // Apply color spans
        for (const span of colors) {
          output += result.substring(lastPos, span.start);
          const spanText = result.substring(span.start, span.end);
          output += `<span class="cga-${span.color}">${spanText}</span>`;
          lastPos = span.end;
        }
        output += result.substring(lastPos);
        html += output + '\n';
      }
    }
    screen.innerHTML = html;
  }
}

export function putText(x, y, text, color = null) {
  if (!buffer || y < 0 || y >= CGA.rows || x < 0) return;
  if (text.length === 0) return;
  
  const row = buffer[y] || " ".repeat(CGA.cols);
  const safeText = text.substring(0, CGA.cols - x);
  buffer[y] = row.substring(0, x) + safeText + row.substring(x + safeText.length);
  
  // Store color information
  if (color && colorBuffer[y]) {
    colorBuffer[y].push({
      start: x,
      end: x + safeText.length,
      color: color
    });
  }
}

export function drawBox(x, y, width, height, color = null) {
  // Simple ASCII box using standard characters
  const h = "═";
  const v = "║";
  const tl = "╔";
  const tr = "╗";
  const bl = "╚";
  const br = "╝";
  
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