// Controller management - separate module to avoid circular dependencies

let activeController = null;

export function setController(ctrl) {
  if (activeController?.detach) activeController.detach();
  activeController = ctrl;
}

export function getController() {
  return activeController;
}

// Register global keyboard handler
window.addEventListener('keydown', (e) => {
  if (!activeController) return;
  if (typeof activeController.handleKey === 'function') {
    activeController.handleKey(e);
  }
});