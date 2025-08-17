/**
 * API client for communicating with the backend server
 */

const API_BASE = 'http://localhost:5173/api';

export class IconFixerAPI {
  /**
   * Detect Steam installation
   */
  static async detectSteam() {
    try {
      const response = await fetch(`${API_BASE}/steam/detect`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to detect Steam:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get list of desktop shortcuts
   */
  static async getDesktopShortcuts() {
    try {
      const response = await fetch(`${API_BASE}/shortcuts/desktop`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get shortcuts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix all desktop icons
   */
  static async fixDesktopIcons() {
    try {
      const response = await fetch(`${API_BASE}/fix/desktop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fix desktop icons:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix specific files
   */
  static async fixSpecificFiles(files) {
    try {
      const response = await fetch(`${API_BASE}/fix/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fix files:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Browse directory
   */
  static async browseDirectory(path = null) {
    try {
      const response = await fetch(`${API_BASE}/browse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to browse directory:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get list of installed Steam games
   */
  static async getInstalledGames() {
    try {
      const response = await fetch(`${API_BASE}/games/installed`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get installed games:', error);
      return { success: false, error: error.message };
    }
  }
}