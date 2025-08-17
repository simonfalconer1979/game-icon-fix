import { clearScreen, drawStatusBar } from './ui.js';
import { showTopMenu } from './menu.js';

let activeController = null;

function setController(ctrl) {
  if (activeController?.detach) activeController.detach();
  activeController = ctrl;
}

function boot() {
  clearScreen();
  drawStatusBar(' F1=Help  ESC=Back');
  const menu = showTopMenu();
  setController(menu);

  // Keyboard routing
  window.addEventListener('keydown', (e) => {
    if (!activeController) return;
    if (typeof activeController.handleKey === 'function') {
      activeController.handleKey(e);
    }
  });
}

window.addEventListener('DOMContentLoaded', boot);
