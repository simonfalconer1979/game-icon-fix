// CGA 80x25 text mode renderer for browser
export const CGA = {
  cols: 80,
  rows: 25,
};

let buffer;

export function clearScreen(fill = " ") {
  buffer = Array.from({ length: CGA.rows }, () => fill.repeat(CGA.cols));
  flush();
}

export function flush() {
  const screen = document.getElementById("screen");
  if (screen) {
    screen.textContent = buffer.join("\n");
  }
}

export function putText(x, y, text) {
  if (!buffer || y < 0 || y >= CGA.rows || x < 0) return;
  if (text.length === 0) return;
  
  const row = buffer[y] || " ".repeat(CGA.cols);
  const safeText = text.substring(0, CGA.cols - x);
  buffer[y] = row.substring(0, x) + safeText + row.substring(x + safeText.length);
}

export function drawBox(x, y, width, height) {
  // Simple ASCII box using standard characters
  const h = "-";
  const v = "|";
  const tl = "+";
  const tr = "+";
  const bl = "+";
  const br = "+";
  
  // Top
  putText(x, y, tl + h.repeat(width - 2) + tr);
  
  // Sides
  for (let i = 1; i < height - 1; i++) {
    putText(x, y + i, v);
    putText(x + width - 1, y + i, v);
  }
  
  // Bottom
  putText(x, y + height - 1, bl + h.repeat(width - 2) + br);
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

// Initialize buffer
buffer = Array.from({ length: CGA.rows }, () => " ".repeat(CGA.cols));