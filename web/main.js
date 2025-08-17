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

window.addEventListener('DOMContentLoaded', () => {
  boot();
  
  // Power button functionality
  const powerButton = document.getElementById('power-button');
  if (powerButton) {
    powerButton.addEventListener('click', () => {
      // Play click sound if you want
      const screen = document.querySelector('.monitor-screen');
      const led = document.querySelector('.power-led');
      
      // Add power-off animation
      screen.classList.add('powering-off');
      led.classList.add('off');
      
      // Wait for animation then close
      setTimeout(() => {
        // Try to close the window/tab
        window.close();
        // If that doesn't work (browsers block it), show a message
        setTimeout(() => {
          document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial; color: #666;">
              <div style="text-align: center;">
                <h2>Monitor Powered Off</h2>
                <p>You can now close this tab.</p>
              </div>
            </div>
          `;
        }, 100);
      }, 1500);
    });
  }
});
