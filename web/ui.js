// Simple SVGA 160x64 text buffer renderer for browser
export const SVGA = {
  cols: 160,
  rows: 64,
};

let buffer = [];

export function clearScreen(fill = " ") {
  buffer = Array.from({ length: SVGA.rows }, () => fill.repeat(SVGA.cols));
  flush();
}

export function flush() {
  const screen = document.getElementById("screen");
  if (screen) screen.textContent = buffer.join("\n");
}

export function putText(x, y, text) {
  if (y < 0 || y >= SVGA.rows) return;
  if (text.length === 0) return;
  const row = buffer[y] ?? " ".repeat(SVGA.cols);
  const left = row.slice(0, Math.max(0, x));
  const rightStart = Math.min(SVGA.cols, x + text.length);
  const right = row.slice(rightStart);
  const mid = text.slice(0, Math.max(0, SVGA.cols - x));
  buffer[y] = (left + mid).padEnd(SVGA.cols).slice(0, SVGA.cols - right.length) + right;
}

export function centerText(text, width) {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text.slice(0, width).padEnd(width - pad, " ");
}

export function getCenteredPosition(width, height) {
  const x = Math.floor((SVGA.cols - width) / 2);
  const y = Math.floor((SVGA.rows - height) / 2);
  return { x, y };
}

export function drawBox(x, y, width, height, title) {
  const tl = "╭", tr = "╮", bl = "╰", br = "╯";
  const h = "─", v = "│";
  // top
  putText(x, y, tl + h.repeat(width - 2) + tr);
  // title (optional)
  if (title) {
    const bar = " "+title+" ";
    const barX = x + Math.max(0, Math.floor((width - bar.length) / 2));
    putText(barX, y, bar);
  }
  // sides
  for (let r = 1; r < height - 1; r++) {
    putText(x, y + r, v + " ".repeat(width - 2) + v);
  }
  // bottom
  putText(x, y + height - 1, bl + h.repeat(width - 2) + br);
}

export function drawBoxWithShadow(x, y, width, height, title) {
  drawBox(x, y, width, height, title);
  // simple drop shadow
  const shadowChar = "░";
  for (let r = 1; r < height; r++) putText(x + width, y + r, shadowChar);
  putText(x + 1, y + height, shadowChar.repeat(width));
}

export function drawCenteredBoxWithShadow(width, height, title) {
  const { x, y } = getCenteredPosition(width, height);
  drawBoxWithShadow(x, y, width, height, title);
  return { x, y, width, height };
}

export function drawStatusBar(message) {
  const el = document.getElementById("status-bar");
  if (el) el.textContent = message;
}

export function showCenteredStatus(type, message, y) {
  const icon = ({
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "i",
  })[type] || "i";
  const txt = `${icon} ${message}`;
  const row = y ?? Math.floor(SVGA.rows / 2);
  const x = Math.floor((SVGA.cols - txt.length) / 2);
  putText(x, row, txt);
}

// Initialize buffer once loaded
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => clearScreen());
}
