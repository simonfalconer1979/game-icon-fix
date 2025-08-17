import { clearScreen, drawCenteredBoxWithShadow, putText, centerText, showCenteredStatus, SVGA } from './ui.js';

export class Menu {
  constructor(title, items) {
    this.title = title;
    this.items = items;
    this.index = 0;
  }

  draw() {
    clearScreen();
    const width = 50;
    const height = this.items.length + 6;
    const dlg = drawCenteredBoxWithShadow(width, height, `═══[ ${this.title} ]═══`);

    // items
    for (let i = 0; i < this.items.length; i++) {
      const label = this.items[i].label;
      const prefix = i === this.index ? '▶ ' : '  ';
      const line = `${prefix}${label}`.padEnd(width - 4, ' ');
      putText(dlg.x + 2, dlg.y + 3 + i, line);
    }

    // footer/help
    putText(dlg.x + 2, dlg.y + height - 2, centerText('↑↓ Navigate │ Enter=Select │ ESC=Back', width - 4));
  }

  handleKey(e) {
    if (e.key === 'ArrowUp') {
      this.index = (this.index - 1 + this.items.length) % this.items.length;
      this.draw();
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      this.index = (this.index + 1) % this.items.length;
      this.draw();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const item = this.items[this.index];
      if (item && typeof item.action === 'function') item.action();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      if (typeof this.onCancel === 'function') this.onCancel();
      e.preventDefault();
    }
  }
}

export function showTopMenu() {
  const menu = new Menu('MAIN MENU', [
    { id: 'fix-current', label: 'Fix Icons in Current Directory', action: () => showCenteredStatus('info', 'Not available in web build') },
    { id: 'fix-desktop', label: 'Fix Icons on Desktop', action: () => showCenteredStatus('info', 'Not available in web build') },
    { id: 'browse', label: 'Browse for Directory...', action: () => showCenteredStatus('info', 'Not available in web build') },
    { id: 'select-files', label: 'Select Specific Files...', action: () => showCenteredStatus('info', 'Not available in web build') },
    { id: 'refresh-all', label: 'Replace ALL Desktop Shortcuts', action: () => showCenteredStatus('info', 'Not available in web build') },
    { id: 'settings', label: 'Settings & Options', action: () => showCenteredStatus('info', 'Settings coming soon') },
    { id: 'exit', label: 'Exit', action: () => showCenteredStatus('success', 'Thanks for viewing!') },
  ]);
  menu.draw();
  return menu;
}
