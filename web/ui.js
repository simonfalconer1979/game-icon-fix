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

export function drawCenteredBoxWithShadow(width, height, title, customY) {
  const x = Math.floor((SVGA.cols - width) / 2);
  const y = customY !== undefined ? customY : Math.floor((SVGA.rows - height) / 2);
  drawBoxWithShadow(x, y, width, height, title);
  return { x, y, width, height };
}

export function drawProfessionalMenu(width, height, customY) {
  const x = Math.floor((SVGA.cols - width) / 2);
  const y = customY !== undefined ? customY : Math.floor((SVGA.rows - height) / 2);
  
  // Draw double-line border for premium 90s look
  const dtl = "╔", dtr = "╗", dbl = "╚", dbr = "╝";
  const dh = "═", dv = "║";
  
  // Top border
  putText(x, y, dtl + dh.repeat(width - 2) + dtr);
  
  // Sides
  for (let r = 1; r < height - 1; r++) {
    putText(x, y + r, dv + " ".repeat(width - 2) + dv);
  }
  
  // Bottom border
  putText(x, y + height - 1, dbl + dh.repeat(width - 2) + dbr);
  
  // 3D shadow effect (classic 90s)
  const shadowChar = "▓";
  for (let r = 1; r < height; r++) {
    putText(x + width, y + r, shadowChar);
  }
  putText(x + 2, y + height, shadowChar.repeat(width - 1));
  
  // Subtle inner shadow for depth
  const innerShadow = "░";
  for (let r = 1; r < 3; r++) {
    putText(x + width - 2, y + r, innerShadow);
  }
  
  return { x, y, width, height };
}

export function drawStatusBar(message) {
  // Draw a professional 90s status bar at the bottom
  const barY = SVGA.rows - 3;
  const barWidth = SVGA.cols;
  
  // Clear the status bar area
  for (let i = 0; i < 3; i++) {
    putText(0, barY + i, " ".repeat(barWidth));
  }
  
  // Draw double-line separator
  putText(0, barY, "╠" + "═".repeat(barWidth - 2) + "╣");
  
  // Status bar content
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  const leftText = " Ready";
  const centerMsg = "F1=Help  F10=Menu  Alt+X=Exit";
  const rightText = `[${time}] `;
  
  // Calculate positions
  const centerX = Math.floor((barWidth - centerMsg.length) / 2);
  const rightX = barWidth - rightText.length;
  
  // Draw status items
  putText(1, barY + 1, leftText);
  putText(centerX, barY + 1, centerMsg);
  putText(rightX, barY + 1, rightText);
  
  // Bottom border
  putText(0, barY + 2, "╚" + "═".repeat(barWidth - 2) + "╝");
  
  // Update HTML status bar if message provided
  if (message) {
    const el = document.getElementById("status-bar");
    if (el) el.textContent = message;
  }
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
