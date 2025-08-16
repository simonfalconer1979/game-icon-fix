/**
 * Fixed Console Window Management for Windows
 * Creates a non-resizable console window with specific dimensions
 */

export interface ConsoleConfig {
  width: number;
  height: number;
  title?: string;
  centerOnScreen?: boolean;
  disableResize?: boolean;
  disableMaximize?: boolean;
  disableQuickEdit?: boolean;
}

export class FixedConsole {
  private config: Required<ConsoleConfig>;
  
  constructor(config: ConsoleConfig) {
    this.config = {
      width: config.width,
      height: config.height,
      title: config.title || "Steam Icon Fixer",
      centerOnScreen: config.centerOnScreen ?? true,
      disableResize: config.disableResize ?? true,
      disableMaximize: config.disableMaximize ?? true,
      disableQuickEdit: config.disableQuickEdit ?? true,
    };
  }
  
  /**
   * Setup the fixed console window
   */
  async setup(): Promise<boolean> {
    if (Deno.build.os !== "windows") {
      return false;
    }
    
    try {
      // Set console title
      await this.setTitle();
      
      // Set console size and buffer
      await this.setSize();
      
      // Disable quick edit mode (prevents accidental text selection)
      if (this.config.disableQuickEdit) {
        await this.disableQuickEditMode();
      }
      
      // Lock window size (disable resize and maximize)
      if (this.config.disableResize || this.config.disableMaximize) {
        await this.lockWindowSize();
      }
      
      // Center window on screen
      if (this.config.centerOnScreen) {
        await this.centerWindow();
      }
      
      return true;
    } catch (error) {
      console.error("Failed to setup fixed console:", error);
      return false;
    }
  }
  
  /**
   * Set console window title
   */
  private async setTitle(): Promise<void> {
    const encoder = new TextEncoder();
    await Deno.stdout.write(encoder.encode(`\x1b]0;${this.config.title}\x07`));
  }
  
  /**
   * Set console size using mode command
   */
  private async setSize(): Promise<void> {
    // Set both window size and buffer size to prevent scrollbars
    const cmd = new Deno.Command("cmd", {
      args: [
        "/c",
        `mode con: cols=${this.config.width} lines=${this.config.height}`,
      ],
      stdout: "null",
      stderr: "null",
    });
    
    await cmd.output();
    
    // Also set buffer size to match using PowerShell
    const psCmd = new Deno.Command("powershell", {
      args: [
        "-NoProfile",
        "-Command",
        `$host.UI.RawUI.BufferSize = New-Object System.Management.Automation.Host.Size(${this.config.width}, ${this.config.height})`,
      ],
      stdout: "null",
      stderr: "null",
    });
    
    await psCmd.output();
  }
  
  /**
   * Disable Quick Edit mode to prevent accidental selection
   */
  private async disableQuickEditMode(): Promise<void> {
    const script = `
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class ConsoleMode {
        [DllImport("kernel32.dll")]
        public static extern IntPtr GetStdHandle(int nStdHandle);
        
        [DllImport("kernel32.dll")]
        public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
        
        [DllImport("kernel32.dll")]
        public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
        
        public const int STD_INPUT_HANDLE = -10;
        public const uint ENABLE_QUICK_EDIT = 0x0040;
        public const uint ENABLE_EXTENDED_FLAGS = 0x0080;
    }
"@
    
    $handle = [ConsoleMode]::GetStdHandle([ConsoleMode]::STD_INPUT_HANDLE)
    $mode = 0
    [ConsoleMode]::GetConsoleMode($handle, [ref]$mode)
    
    # Disable Quick Edit Mode
    $mode = $mode -band -bnot [ConsoleMode]::ENABLE_QUICK_EDIT
    $mode = $mode -bor [ConsoleMode]::ENABLE_EXTENDED_FLAGS
    
    [ConsoleMode]::SetConsoleMode($handle, $mode)
    `;
    
    const cmd = new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script],
      stdout: "null",
      stderr: "null",
    });
    
    await cmd.output();
  }
  
  /**
   * Lock the console window size (disable resize and maximize)
   */
  private async lockWindowSize(): Promise<void> {
    const script = `
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class Window {
        [DllImport("kernel32.dll")]
        public static extern IntPtr GetConsoleWindow();
        
        [DllImport("user32.dll")]
        public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
        
        [DllImport("user32.dll")]
        public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
        
        [DllImport("user32.dll")]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter,
            int X, int Y, int cx, int cy, uint uFlags);
        
        public const int GWL_STYLE = -16;
        public const int WS_SIZEBOX = 0x00040000;
        public const int WS_MAXIMIZEBOX = 0x00010000;
        public const int WS_MINIMIZEBOX = 0x00020000;
        public const uint SWP_FRAMECHANGED = 0x0020;
        public const uint SWP_NOMOVE = 0x0002;
        public const uint SWP_NOSIZE = 0x0001;
        public const uint SWP_NOZORDER = 0x0004;
    }
"@
    
    $hwnd = [Window]::GetConsoleWindow()
    $style = [Window]::GetWindowLong($hwnd, [Window]::GWL_STYLE)
    
    # Remove resize capability
    ${this.config.disableResize ? '$style = $style -band -bnot [Window]::WS_SIZEBOX' : ''}
    
    # Remove maximize button
    ${this.config.disableMaximize ? '$style = $style -band -bnot [Window]::WS_MAXIMIZEBOX' : ''}
    
    [Window]::SetWindowLong($hwnd, [Window]::GWL_STYLE, $style)
    
    # Force window to update its style
    [Window]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, 0, 0, 
        [Window]::SWP_FRAMECHANGED -bor [Window]::SWP_NOMOVE -bor 
        [Window]::SWP_NOSIZE -bor [Window]::SWP_NOZORDER)
    `;
    
    const cmd = new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script],
      stdout: "null",
      stderr: "null",
    });
    
    await cmd.output();
  }
  
  /**
   * Center the console window on the primary screen
   */
  private async centerWindow(): Promise<void> {
    const script = `
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class Window {
        [DllImport("kernel32.dll")]
        public static extern IntPtr GetConsoleWindow();
        
        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
        
        [DllImport("user32.dll")]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter,
            int X, int Y, int cx, int cy, uint uFlags);
        
        [DllImport("user32.dll")]
        public static extern int GetSystemMetrics(int nIndex);
        
        public struct RECT {
            public int Left, Top, Right, Bottom;
        }
        
        public const int SM_CXSCREEN = 0;
        public const int SM_CYSCREEN = 1;
        public const uint SWP_NOSIZE = 0x0001;
        public const uint SWP_NOZORDER = 0x0004;
    }
"@
    
    $hwnd = [Window]::GetConsoleWindow()
    $rect = New-Object Window+RECT
    [Window]::GetWindowRect($hwnd, [ref]$rect)
    
    $windowWidth = $rect.Right - $rect.Left
    $windowHeight = $rect.Bottom - $rect.Top
    
    $screenWidth = [Window]::GetSystemMetrics([Window]::SM_CXSCREEN)
    $screenHeight = [Window]::GetSystemMetrics([Window]::SM_CYSCREEN)
    
    $x = [Math]::Max(0, ($screenWidth - $windowWidth) / 2)
    $y = [Math]::Max(0, ($screenHeight - $windowHeight) / 2)
    
    [Window]::SetWindowPos($hwnd, [IntPtr]::Zero, [int]$x, [int]$y, 0, 0, 
        [Window]::SWP_NOSIZE -bor [Window]::SWP_NOZORDER)
    `;
    
    const cmd = new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", script],
      stdout: "null",
      stderr: "null",
    });
    
    await cmd.output();
  }
  
  /**
   * Reset console to default state
   */
  async reset(): Promise<void> {
    if (Deno.build.os !== "windows") return;
    
    try {
      // Re-enable resize and maximize
      const script = `
      Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Window {
          [DllImport("kernel32.dll")]
          public static extern IntPtr GetConsoleWindow();
          
          [DllImport("user32.dll")]
          public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
          
          [DllImport("user32.dll")]
          public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
          
          public const int GWL_STYLE = -16;
          public const int WS_SIZEBOX = 0x00040000;
          public const int WS_MAXIMIZEBOX = 0x00010000;
      }
"@
      
      $hwnd = [Window]::GetConsoleWindow()
      $style = [Window]::GetWindowLong($hwnd, [Window]::GWL_STYLE)
      $style = $style -bor [Window]::WS_SIZEBOX -bor [Window]::WS_MAXIMIZEBOX
      [Window]::SetWindowLong($hwnd, [Window]::GWL_STYLE, $style)
      `;
      
      const cmd = new Deno.Command("powershell", {
        args: ["-NoProfile", "-Command", script],
        stdout: "null",
        stderr: "null",
      });
      
      await cmd.output();
    } catch {
      // Ignore errors during reset
    }
  }
}

/**
 * Quick setup helper for VGA 640x480 console (80x30 characters)
 * Standard VGA text mode for professional DOS applications
 */
export async function setupFixedConsole(
  width: number = 80,  // VGA standard 80 columns
  height: number = 30, // VGA 480p = 30 rows with 8x16 font
  title: string = "Steam Icon Fixer"
): Promise<boolean> {
  const console = new FixedConsole({
    width,
    height,
    title,
    centerOnScreen: true,
    disableResize: true,
    disableMaximize: true,
    disableQuickEdit: true,
  });
  
  return await console.setup();
}