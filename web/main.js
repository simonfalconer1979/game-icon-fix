import { clearScreen } from './ui.js';
import { showTopMenu } from './menu.js';
import { setController } from './controller.js';

function boot() {
  clearScreen();
  const menu = showTopMenu();
  setController(menu);
}

window.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure everything is loaded
  setTimeout(() => {
    boot();
  }, 100);
  
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
