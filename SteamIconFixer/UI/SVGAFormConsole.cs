using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace SteamIconFixer.UI
{
    /// <summary>
    /// SVGA console implementation for Windows Forms
    /// </summary>
    public static class SVGAFormConsole
    {
        // Screen dimensions (SVGA 800x600 with 8x16 font = 100x37 text mode)
        public const int Width = 100;
        public const int Height = 37;

        // Character and color buffers
        private static char[,] charBuffer = new char[Height, Width];
        private static byte[,] foreColorBuffer = new byte[Height, Width];
        private static byte[,] backColorBuffer = new byte[Height, Width];
        
        // Current cursor position
        private static int cursorX = 0;
        private static int cursorY = 0;
        
        // Current colors
        private static byte currentForeColor = 7; // Light Gray
        private static byte currentBackColor = 0; // Black
        
        // Reference to the console panel
        private static ConsolePanel? consolePanel;
        
        // Key input queue
        private static Queue<ConsoleKeyInfo> keyQueue = new Queue<ConsoleKeyInfo>();
        
        // Color constants matching SVGA 256-color palette (using string for compatibility)
        public static class Colors
        {
            // Primary colors
            public const string Black = "#000000";
            public const string White = "#FFFFFF";
            public const string Red = "#FF0000";
            public const string Green = "#00FF00";
            public const string Blue = "#0000FF";
            public const string Yellow = "#FFFF00";
            public const string Cyan = "#00FFFF";
            public const string Magenta = "#FF00FF";
            
            // Extended palette
            public const string Orange = "#FF9900";
            public const string Purple = "#9900FF";
            public const string Pink = "#FF66CC";
            public const string Lime = "#99FF00";
            public const string Teal = "#00CC99";
            public const string Navy = "#000099";
            public const string Maroon = "#990000";
            public const string Olive = "#999900";
            
            // Grays (8-level grayscale)
            public const string Gray10 = "#1A1A1A";
            public const string Gray20 = "#333333";
            public const string Gray30 = "#4D4D4D";
            public const string Gray40 = "#666666";
            public const string Gray50 = "#808080";
            public const string Gray60 = "#999999";
            public const string Gray70 = "#B3B3B3";
            public const string Gray80 = "#CCCCCC";
            public const string Gray90 = "#E6E6E6";
            
            // Legacy CGA colors for compatibility
            public const string Brown = "#AA5500";
            public const string LightGray = "#AAAAAA";
            public const string DarkGray = "#555555";
            public const string LightBlue = "#5555FF";
            public const string LightGreen = "#55FF55";
            public const string LightCyan = "#55FFFF";
            public const string LightRed = "#FF5555";
            public const string LightMagenta = "#FF55FF";
        }

        // Color mapping from string-based system (extended for SVGA)
        private static readonly Dictionary<string, byte> ColorMap = new Dictionary<string, byte>
        {
            // Primary colors
            { "#000000", 0 },    // Black
            { "#FFFFFF", 15 },   // White
            { "#FF0000", 4 },    // Red
            { "#00FF00", 2 },    // Green
            { "#0000FF", 1 },    // Blue
            { "#FFFF00", 14 },   // Yellow
            { "#00FFFF", 3 },    // Cyan
            { "#FF00FF", 5 },    // Magenta
            
            // Extended colors
            { "#FF9900", 20 },   // Orange
            { "#9900FF", 21 },   // Purple
            { "#FF66CC", 22 },   // Pink
            { "#99FF00", 23 },   // Lime
            { "#00CC99", 24 },   // Teal
            { "#000099", 25 },   // Navy
            { "#990000", 26 },   // Maroon
            { "#999900", 27 },   // Olive
            
            // Grays
            { "#1A1A1A", 28 },   // Gray10
            { "#333333", 29 },   // Gray20
            { "#4D4D4D", 30 },   // Gray30
            { "#666666", 31 },   // Gray40
            { "#808080", 32 },   // Gray50
            { "#999999", 33 },   // Gray60
            { "#B3B3B3", 34 },   // Gray70
            { "#CCCCCC", 35 },   // Gray80
            { "#E6E6E6", 36 },   // Gray90
            
            // Legacy CGA mappings
            { "#0000AA", 1 },    // Blue (CGA)
            { "#00AA00", 2 },    // Green (CGA)
            { "#00AAAA", 3 },    // Cyan (CGA)
            { "#AA0000", 4 },    // Red (CGA)
            { "#AA00AA", 5 },    // Magenta (CGA)
            { "#AA5500", 6 },    // Brown
            { "#AAAAAA", 7 },    // LightGray
            { "#555555", 8 },    // DarkGray
            { "#5555FF", 9 },    // LightBlue
            { "#55FF55", 10 },   // LightGreen
            { "#55FFFF", 11 },   // LightCyan
            { "#FF5555", 12 },   // LightRed
            { "#FF55FF", 13 },   // LightMagenta
            { "#FFFF55", 14 }    // Yellow (CGA)
        };

        public static void Initialize(ConsolePanel panel)
        {
            consolePanel = panel;
            Clear();
        }

        public static void Clear()
        {
            for (int y = 0; y < Height; y++)
            {
                for (int x = 0; x < Width; x++)
                {
                    charBuffer[y, x] = ' ';
                    foreColorBuffer[y, x] = currentForeColor;
                    backColorBuffer[y, x] = currentBackColor;
                }
            }
            cursorX = 0;
            cursorY = 0;
            Render();
        }

        public static void WriteAt(int x, int y, string text, string colorHex)
        {
            byte color = GetColorFromHex(colorHex);
            WriteAt(x, y, text, color);
        }

        public static void WriteAt(int x, int y, string text, byte foreColor)
        {
            if (y < 0 || y >= Height) return;
            
            for (int i = 0; i < text.Length && x + i < Width; i++)
            {
                if (x + i >= 0)
                {
                    charBuffer[y, x + i] = text[i];
                    foreColorBuffer[y, x + i] = foreColor;
                    backColorBuffer[y, x + i] = currentBackColor;
                }
            }
        }

        public static void WriteCentered(int y, string text, string colorHex)
        {
            byte color = GetColorFromHex(colorHex);
            WriteCentered(y, text, color);
        }

        public static void WriteCentered(int y, string text, byte foreColor)
        {
            int x = (Width - text.Length) / 2;
            WriteAt(x, y, text, foreColor);
        }

        public static void DrawBox(int x, int y, int width, int height, string colorHex)
        {
            byte color = GetColorFromHex(colorHex);
            DrawBox(x, y, width, height, color);
        }

        public static void DrawBox(int x, int y, int width, int height, byte foreColor)
        {
            // Top line
            WriteAt(x, y, "┌", foreColor);
            for (int i = 1; i < width - 1; i++)
                WriteAt(x + i, y, "─", foreColor);
            WriteAt(x + width - 1, y, "┐", foreColor);
            
            // Vertical lines
            for (int i = 1; i < height - 1; i++)
            {
                WriteAt(x, y + i, "│", foreColor);
                WriteAt(x + width - 1, y + i, "│", foreColor);
            }
            
            // Bottom line
            WriteAt(x, y + height - 1, "└", foreColor);
            for (int i = 1; i < width - 1; i++)
                WriteAt(x + i, y + height - 1, "─", foreColor);
            WriteAt(x + width - 1, y + height - 1, "┘", foreColor);
        }

        public static void FillBox(int x, int y, int width, int height, char ch, string colorHex)
        {
            byte color = GetColorFromHex(colorHex);
            FillBox(x, y, width, height, ch, color, currentBackColor);
        }

        public static void FillBox(int x, int y, int width, int height, char ch, byte foreColor, byte backColor)
        {
            for (int dy = 0; dy < height; dy++)
            {
                for (int dx = 0; dx < width; dx++)
                {
                    int px = x + dx;
                    int py = y + dy;
                    if (px >= 0 && px < Width && py >= 0 && py < Height)
                    {
                        charBuffer[py, px] = ch;
                        foreColorBuffer[py, px] = foreColor;
                        backColorBuffer[py, px] = backColor;
                    }
                }
            }
        }

        public static void DrawHorizontalLine(int x, int y, int width, string colorHex)
        {
            byte color = GetColorFromHex(colorHex);
            DrawHorizontalLine(x, y, width, color);
        }

        public static void DrawHorizontalLine(int x, int y, int width, byte foreColor)
        {
            for (int i = 0; i < width; i++)
            {
                if (x + i < Width)
                {
                    WriteAt(x + i, y, "─", foreColor);
                }
            }
        }

        public static void DrawLogo(int x, int y)
        {
            // Steam Icon Fixer ASCII logo
            string[] logo = new string[]
            {
                " ███████╗████████╗███████╗ █████╗ ███╗   ███╗",
                " ██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║",
                " ███████╗   ██║   █████╗  ███████║██╔████╔██║",
                " ╚════██║   ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║",
                " ███████║   ██║   ███████╗██║  ██║██║ ╚═╝ ██║",
                " ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝",
                "",
                "    ██╗ ██████╗ ██████╗ ███╗   ██╗",
                "    ██║██╔════╝██╔═══██╗████╗  ██║",
                "    ██║██║     ██║   ██║██╔██╗ ██║",
                "    ██║██║     ██║   ██║██║╚██╗██║",
                "    ██║╚██████╗╚██████╔╝██║ ╚████║",
                "    ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝"
            };

            for (int i = 0; i < logo.Length; i++)
            {
                WriteCentered(y + i, logo[i], Colors.Cyan);
            }
        }

        public static void Render()
        {
            consolePanel?.RenderConsole(charBuffer, foreColorBuffer, backColorBuffer);
        }

        public static ConsoleKeyInfo WaitForKey()
        {
            // Wait for a key press
            while (keyQueue.Count == 0)
            {
                System.Threading.Thread.Sleep(10);
                System.Windows.Forms.Application.DoEvents(); // Process Windows messages
            }
            
            return keyQueue.Dequeue();
        }

        public static void HandleKeyPress(KeyEventArgs e)
        {
            // Convert Windows Forms key to ConsoleKeyInfo
            ConsoleKey consoleKey = ConvertToConsoleKey(e.KeyCode);
            char keyChar = GetKeyChar(e);
            
            var keyInfo = new ConsoleKeyInfo(keyChar, consoleKey, e.Shift, e.Alt, e.Control);
            keyQueue.Enqueue(keyInfo);
        }

        private static ConsoleKey ConvertToConsoleKey(Keys key)
        {
            // Map common keys
            switch (key)
            {
                case Keys.Enter: return ConsoleKey.Enter;
                case Keys.Escape: return ConsoleKey.Escape;
                case Keys.Up: return ConsoleKey.UpArrow;
                case Keys.Down: return ConsoleKey.DownArrow;
                case Keys.Left: return ConsoleKey.LeftArrow;
                case Keys.Right: return ConsoleKey.RightArrow;
                case Keys.Space: return ConsoleKey.Spacebar;
                case Keys.Back: return ConsoleKey.Backspace;
                case Keys.Tab: return ConsoleKey.Tab;
                case Keys.D1: return ConsoleKey.D1;
                case Keys.D2: return ConsoleKey.D2;
                case Keys.D3: return ConsoleKey.D3;
                case Keys.D4: return ConsoleKey.D4;
                case Keys.D5: return ConsoleKey.D5;
                case Keys.D6: return ConsoleKey.D6;
                case Keys.D7: return ConsoleKey.D7;
                case Keys.D8: return ConsoleKey.D8;
                case Keys.D9: return ConsoleKey.D9;
                case Keys.D0: return ConsoleKey.D0;
                default:
                    // Try to parse letter keys
                    if (key >= Keys.A && key <= Keys.Z)
                    {
                        return (ConsoleKey)Enum.Parse(typeof(ConsoleKey), key.ToString());
                    }
                    return ConsoleKey.NoName;
            }
        }

        private static char GetKeyChar(KeyEventArgs e)
        {
            // Simple character mapping
            if (e.KeyCode >= Keys.A && e.KeyCode <= Keys.Z)
            {
                char c = (char)('A' + (e.KeyCode - Keys.A));
                return e.Shift ? c : char.ToLower(c);
            }
            
            if (e.KeyCode >= Keys.D0 && e.KeyCode <= Keys.D9)
            {
                return (char)('0' + (e.KeyCode - Keys.D0));
            }
            
            switch (e.KeyCode)
            {
                case Keys.Space: return ' ';
                case Keys.Enter: return '\r';
                case Keys.Escape: return (char)27;
                default: return '\0';
            }
        }

        private static byte GetColorFromHex(string colorHex)
        {
            if (ColorMap.TryGetValue(colorHex, out byte color))
            {
                return color;
            }
            return 15; // Default to white (15) if not found
        }

        public static void CleanupForExit()
        {
            // Nothing special needed for Forms version
            Clear();
        }
    }
}