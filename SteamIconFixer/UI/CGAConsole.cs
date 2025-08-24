using System;
using System.Runtime.InteropServices;
using System.Text;
using Pastel;

namespace SteamIconFixer.UI
{
    /// <summary>
    /// CGA-style console emulator with authentic 80x25 text mode
    /// </summary>
    public static class CGAConsole
    {
        // CGA color palette (authentic 16-color palette)
        public static class Colors
        {
            public const string Black = "#000000";
            public const string Blue = "#0000AA";
            public const string Green = "#00AA00";
            public const string Cyan = "#00AAAA";
            public const string Red = "#AA0000";
            public const string Magenta = "#AA00AA";
            public const string Brown = "#AA5500";
            public const string LightGray = "#AAAAAA";
            public const string DarkGray = "#555555";
            public const string LightBlue = "#5555FF";
            public const string LightGreen = "#55FF55";
            public const string LightCyan = "#55FFFF";
            public const string LightRed = "#FF5555";
            public const string LightMagenta = "#FF55FF";
            public const string Yellow = "#FFFF55";
            public const string White = "#FFFFFF";
        }

        // Screen dimensions (authentic CGA text mode)
        public const int Width = 80;
        public const int Height = 25;

        // Double buffering for flicker-free rendering
        private static char[,] _frontBuffer = new char[Height, Width];
        private static char[,] _backBuffer = new char[Height, Width];
        private static string[,] _colorBuffer = new string[Height, Width];

        // Windows console API imports for proper console control
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GetStdHandle(int nStdHandle);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetConsoleScreenBufferSize(IntPtr hConsoleOutput, COORD size);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetConsoleWindowInfo(IntPtr hConsoleOutput, bool bAbsolute, ref SMALL_RECT lpConsoleWindow);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetConsoleCursorPosition(IntPtr hConsoleOutput, COORD dwCursorPosition);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool GetConsoleScreenBufferInfo(IntPtr hConsoleOutput, out CONSOLE_SCREEN_BUFFER_INFO lpConsoleScreenBufferInfo);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetConsoleCursorInfo(IntPtr hConsoleOutput, ref CONSOLE_CURSOR_INFO lpConsoleCursorInfo);

        [StructLayout(LayoutKind.Sequential)]
        private struct COORD
        {
            public short X;
            public short Y;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct SMALL_RECT
        {
            public short Left;
            public short Top;
            public short Right;
            public short Bottom;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct CONSOLE_SCREEN_BUFFER_INFO
        {
            public COORD dwSize;
            public COORD dwCursorPosition;
            public short wAttributes;
            public SMALL_RECT srWindow;
            public COORD dwMaximumWindowSize;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct CONSOLE_CURSOR_INFO
        {
            public uint dwSize;
            public bool bVisible;
        }

        private const int STD_OUTPUT_HANDLE = -11;

        static CGAConsole()
        {
            Initialize();
        }

        /// <summary>
        /// Initialize the CGA console with proper dimensions and settings
        /// </summary>
        public static void Initialize()
        {
            try
            {
                // Clear any existing output first
                Console.Clear();
                
                // Set console to UTF-8 for proper character display
                Console.OutputEncoding = Encoding.UTF8;
                Console.InputEncoding = Encoding.UTF8;

                // Get console handle
                IntPtr handle = GetStdHandle(STD_OUTPUT_HANDLE);

                // Set up console buffer and window
                // First set a large buffer to avoid issues
                COORD largeBuffer = new COORD { X = Width, Y = 9999 };
                SetConsoleScreenBufferSize(handle, largeBuffer);
                
                // Set the window size
                SMALL_RECT windowSize = new SMALL_RECT
                {
                    Left = 0,
                    Top = 0,
                    Right = (short)(Width - 1),
                    Bottom = (short)(Height - 1)
                };
                SetConsoleWindowInfo(handle, true, ref windowSize);
                
                // Now set the exact buffer size
                COORD bufferSize = new COORD { X = Width, Y = Height };
                SetConsoleScreenBufferSize(handle, bufferSize);

                // Hide cursor for authentic CGA feel
                CONSOLE_CURSOR_INFO cursorInfo = new CONSOLE_CURSOR_INFO
                {
                    dwSize = 1,
                    bVisible = false
                };
                SetConsoleCursorInfo(handle, ref cursorInfo);

                // Set console properties
                try
                {
                    Console.SetWindowSize(Width, Height);
                    Console.SetBufferSize(Width, Height);
                }
                catch
                {
                    // Some environments don't support these operations
                }
                
                Console.CursorVisible = false;
                Console.Title = "Steam Icon Fixer v2.0 - CGA Mode";

                // Clear buffers and screen completely
                Clear();
                Console.Clear();
            }
            catch (Exception ex)
            {
                // Fallback for environments where console manipulation fails
                Console.Clear();
                Console.WriteLine($"Warning: Could not set console to exact CGA mode: {ex.Message}");
            }
        }

        /// <summary>
        /// Clear the screen with CGA-style instant clear
        /// </summary>
        public static void Clear()
        {
            // Clear buffers
            for (int y = 0; y < Height; y++)
            {
                for (int x = 0; x < Width; x++)
                {
                    _backBuffer[y, x] = ' ';
                    _frontBuffer[y, x] = ' ';
                    _colorBuffer[y, x] = Colors.Black;
                }
            }
            
            // Force complete screen clear
            try
            {
                Console.Clear();
                Console.SetCursorPosition(0, 0);
                
                // Write blank lines to ensure full clear
                string blankLine = new string(' ', Width);
                for (int i = 0; i < Height; i++)
                {
                    if (i < Height - 1)
                        Console.WriteLine(blankLine);
                    else
                        Console.Write(blankLine); // No newline on last line
                }
                Console.SetCursorPosition(0, 0);
            }
            catch
            {
                // Fallback if console operations fail
                Console.WriteLine("\x1b[2J\x1b[H"); // ANSI clear screen
            }
        }

        /// <summary>
        /// Put a single character at position with color
        /// </summary>
        public static void PutChar(int x, int y, char c, string? color = null)
        {
            if (x >= 0 && x < Width && y >= 0 && y < Height)
            {
                _backBuffer[y, x] = c;
                _colorBuffer[y, x] = color ?? Colors.LightGray;
            }
        }

        /// <summary>
        /// Write text at position with color
        /// </summary>
        public static void WriteAt(int x, int y, string text, string? color = null)
        {
            color = color ?? Colors.LightGray;
            for (int i = 0; i < text.Length && x + i < Width; i++)
            {
                PutChar(x + i, y, text[i], color);
            }
        }

        /// <summary>
        /// Write centered text
        /// </summary>
        public static void WriteCentered(int y, string text, string? color = null)
        {
            int x = (Width - text.Length) / 2;
            WriteAt(x, y, text, color);
        }

        /// <summary>
        /// Draw a box with single-line border characters
        /// </summary>
        public static void DrawBox(int x, int y, int width, int height, string? color = null)
        {
            color = color ?? Colors.LightGray;

            // Top border
            PutChar(x, y, '┌', color);
            for (int i = 1; i < width - 1; i++)
                PutChar(x + i, y, '─', color);
            PutChar(x + width - 1, y, '┐', color);

            // Sides
            for (int i = 1; i < height - 1; i++)
            {
                PutChar(x, y + i, '│', color);
                PutChar(x + width - 1, y + i, '│', color);
            }

            // Bottom border
            PutChar(x, y + height - 1, '└', color);
            for (int i = 1; i < width - 1; i++)
                PutChar(x + i, y + height - 1, '─', color);
            PutChar(x + width - 1, y + height - 1, '┘', color);
        }

        /// <summary>
        /// Draw a filled box
        /// </summary>
        public static void FillBox(int x, int y, int width, int height, char fillChar = ' ', string? color = null)
        {
            for (int dy = 0; dy < height; dy++)
            {
                for (int dx = 0; dx < width; dx++)
                {
                    PutChar(x + dx, y + dy, fillChar, color);
                }
            }
        }

        /// <summary>
        /// Draw a horizontal line
        /// </summary>
        public static void DrawHorizontalLine(int x, int y, int length, string? color = null)
        {
            for (int i = 0; i < length; i++)
            {
                PutChar(x + i, y, '─', color);
            }
        }

        /// <summary>
        /// Draw a progress bar
        /// </summary>
        public static void DrawProgressBar(int x, int y, int width, int value, int max, string? color = null)
        {
            color = color ?? Colors.Cyan;
            int filled = (int)((double)value / max * (width - 2));

            PutChar(x, y, '[', Colors.White);
            for (int i = 0; i < width - 2; i++)
            {
                if (i < filled)
                    PutChar(x + 1 + i, y, '█', color);
                else
                    PutChar(x + 1 + i, y, '░', Colors.DarkGray);
            }
            PutChar(x + width - 1, y, ']', Colors.White);
        }

        /// <summary>
        /// Render the back buffer to screen (double buffering)
        /// </summary>
        public static void Render()
        {
            Console.SetCursorPosition(0, 0);
            var output = new StringBuilder(Width * Height * 2);

            for (int y = 0; y < Height; y++)
            {
                for (int x = 0; x < Width; x++)
                {
                    char c = _backBuffer[y, x];
                    string color = _colorBuffer[y, x] ?? Colors.LightGray;
                    
                    // Always render with color for consistency
                    output.Append(c.ToString().Pastel(color));
                    _frontBuffer[y, x] = c;
                }
                
                // Don't add newline after last row to prevent scrolling
                if (y < Height - 1)
                {
                    output.AppendLine();
                }
                else
                {
                    // Move to start of last line instead of new line
                    output.Append('\r');
                }
            }

            Console.Write(output.ToString());
            Console.SetCursorPosition(0, 0); // Reset cursor position
        }

        /// <summary>
        /// Display ASCII art logo
        /// </summary>
        public static void DrawLogo(int x, int y)
        {
            string[] logo = new[]
            {
                @"╔═══════════════════════════════════════════════╗",
                @"║  ███████╗████████╗███████╗ █████╗ ███╗   ███╗ ║",
                @"║  ██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║ ║",
                @"║  ███████╗   ██║   █████╗  ███████║██╔████╔██║ ║",
                @"║  ╚════██║   ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║ ║",
                @"║  ███████║   ██║   ███████╗██║  ██║██║ ╚═╝ ██║ ║",
                @"║  ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ║",
                @"║        ICON FIXER v2.0 - .NET Edition          ║",
                @"╚═══════════════════════════════════════════════╝"
            };

            for (int i = 0; i < logo.Length; i++)
            {
                WriteAt(x, y + i, logo[i], Colors.Cyan);
            }
        }

        /// <summary>
        /// Show a blinking cursor at position
        /// </summary>
        public static void ShowCursor(int x, int y, bool visible = true)
        {
            Console.SetCursorPosition(x, y);
            Console.CursorVisible = visible;
        }

        /// <summary>
        /// Wait for any key press
        /// </summary>
        public static ConsoleKeyInfo WaitForKey()
        {
            return Console.ReadKey(true);
        }

        /// <summary>
        /// Check if a key is available
        /// </summary>
        public static bool KeyAvailable()
        {
            return Console.KeyAvailable;
        }

        /// <summary>
        /// Complete cleanup for exit - ensures clean screen
        /// </summary>
        public static void CleanupForExit()
        {
            try
            {
                // Reset console attributes
                Console.ResetColor();
                Console.CursorVisible = true;
                
                // Clear screen multiple times to ensure no artifacts
                Console.Clear();
                
                // Fill entire buffer with spaces
                IntPtr handle = GetStdHandle(STD_OUTPUT_HANDLE);
                if (handle != IntPtr.Zero)
                {
                    // Set cursor to top-left
                    COORD topLeft = new COORD { X = 0, Y = 0 };
                    SetConsoleCursorPosition(handle, topLeft);
                    
                    // Clear entire buffer
                    for (int y = 0; y < 50; y++) // Clear extra lines beyond visible
                    {
                        Console.WriteLine(new string(' ', Math.Min(Console.BufferWidth, 120)));
                    }
                    
                    // Reset cursor position
                    SetConsoleCursorPosition(handle, topLeft);
                }
                
                // Final clear
                Console.Clear();
            }
            catch
            {
                // Best effort - at least try ANSI clear
                Console.Write("\x1b[2J\x1b[3J\x1b[H"); // Clear screen, scrollback, and home
            }
        }
    }
}