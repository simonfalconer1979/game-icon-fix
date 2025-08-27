using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;
using System.Threading;
using System.Globalization;

namespace SteamIconFixer.UI
{
    /// <summary>
    /// SVGA console implementation for Windows Forms
    /// </summary>
    internal static class SVGAFormConsole
    {
        // Screen dimensions (SVGA 800x600 with 8x16 font = 100x37 text mode)
        public const int Width = 100;
        public const int Height = 37;

        // Character and color buffers
        private static char[,] charBuffer = new char[Height, Width];
        private static byte[,] foreColorBuffer = new byte[Height, Width];
        private static byte[,] backColorBuffer = new byte[Height, Width];
        // Removed unused cursorX, cursorY
        // Current colors
        private static byte currentForeColor = 10; // Snow White
        private static byte currentBackColor; // Black (default 0, removed explicit init)
        // Reference to the console panel
        private static ConsolePanel? consolePanel;
        // Key input queue
        private static Queue<ConsoleKeyInfo> keyQueue = new Queue<ConsoleKeyInfo>();

        // Modern color indices for beautiful UI
        internal static class Colors
        {
            // Core Theme Colors
            public const byte Background = 0;         // Deep Space Black
            public const byte BackgroundLight = 1;    // Midnight Blue
            public const byte Surface = 2;            // Dark Slate
            public const byte SurfaceLight = 3;       // Gunmetal
            public const byte Border = 4;             // Steel Blue
            public const byte BorderLight = 5;        // Slate Blue
            public const byte Text = 10;              // Snow White
            public const byte TextDim = 8;            // Pale Blue
            public const byte TextBright = 11;        // Pure White
            
            // Accent Colors
            public const byte AccentCyan = 12;        // Cyan Accent
            public const byte AccentMint = 13;        // Aqua Mint
            public const byte AccentGreen = 14;       // Spring Green
            public const byte AccentLime = 15;        // Lime
            public const byte AccentGold = 16;        // Gold
            public const byte AccentAmber = 17;       // Amber
            public const byte AccentOrange = 18;      // Orange
            public const byte AccentCoral = 19;       // Coral Red
            public const byte AccentPink = 20;        // Hot Pink
            public const byte AccentPurple = 21;      // Purple
            public const byte AccentDeepPurple = 22;  // Deep Purple
            public const byte AccentAzure = 23;       // Azure
            
            // Status Colors
            public const byte Success = 24;           // Success Green
            public const byte Warning = 25;           // Warning Yellow  
            public const byte Error = 26;             // Error Red
            public const byte Info = 27;              // Info Blue
            
            // Gradient Start Points
            public const byte GradientBlue = 28;      // Start of blue gradient
            public const byte GradientPink = 44;      // Start of pink gradient
            public const byte GrayScale = 60;         // Start of grayscale
        }


        public static void Initialize(ConsolePanel panel)
        {
            consolePanel = panel;
            // Set the panel size to match the font metrics and grid
            if (panel != null)
            {
                float charWidth = panel.CharWidth;
                float charHeight = panel.CharHeight;
                panel.Size = new Size((int)(Width * charWidth), (int)(Height * charHeight));
            }
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
            Render();
        }


        public static void WriteAt(int x, int y, string text, byte foreColor)
        {
            if (text == null) throw new ArgumentNullException(nameof(text));
            if (y < 0 || y >= Height) { return; }
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


        public static void WriteCentered(int y, string text, byte foreColor)
        {
            if (text == null) throw new ArgumentNullException(nameof(text));
            int x = (Width - text.Length) / 2;
            WriteAt(x, y, text, foreColor);
        }


        public static void DrawBox(int x, int y, int width, int height, byte foreColor)
        {
            WriteAt(x, y, "┌", foreColor);
            for (int i = 1; i < width - 1; i++)
            {
                WriteAt(x + i, y, "─", foreColor);
            }
            WriteAt(x + width - 1, y, "┐", foreColor);
            for (int i = 1; i < height - 1; i++)
            {
                WriteAt(x, y + i, "│", foreColor);
                WriteAt(x + width - 1, y + i, "│", foreColor);
            }
            WriteAt(x, y + height - 1, "└", foreColor);
            for (int i = 1; i < width - 1; i++)
            {
                WriteAt(x + i, y + height - 1, "─", foreColor);
            }
            WriteAt(x + width - 1, y + height - 1, "┘", foreColor);
        }

        // Draw a modern rounded box with subtle shadows
        public static void DrawModernBox(int x, int y, int width, int height, byte borderColor, byte fillColor)
        {
            // Fill the box background
            for (int dy = 1; dy < height - 1; dy++)
            {
                for (int dx = 1; dx < width - 1; dx++)
                {
                    int px = x + dx;
                    int py = y + dy;
                    if (px >= 0 && px < Width && py >= 0 && py < Height)
                    {
                        charBuffer[py, px] = ' ';
                        backColorBuffer[py, px] = fillColor;
                    }
                }
            }
            
            // Draw subtle borders (using spaces with background colors)
            for (int i = 0; i < width; i++)
            {
                if (x + i < Width)
                {
                    charBuffer[y, x + i] = ' ';
                    charBuffer[y + height - 1, x + i] = ' ';
                    backColorBuffer[y, x + i] = borderColor;
                    backColorBuffer[y + height - 1, x + i] = borderColor;
                }
            }
            for (int i = 1; i < height - 1; i++)
            {
                if (y + i < Height)
                {
                    charBuffer[y + i, x] = ' ';
                    charBuffer[y + i, x + width - 1] = ' ';
                    backColorBuffer[y + i, x] = borderColor;
                    backColorBuffer[y + i, x + width - 1] = borderColor;
                }
            }
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

        // Draw a gradient fill
        public static void FillGradient(int x, int y, int width, int height, byte startColor, byte endColor)
        {
            for (int dy = 0; dy < height; dy++)
            {
                float t = (float)dy / height;
                byte color = (byte)(startColor + (int)((endColor - startColor) * t));
                for (int dx = 0; dx < width; dx++)
                {
                    int px = x + dx;
                    int py = y + dy;
                    if (px >= 0 && px < Width && py >= 0 && py < Height)
                    {
                        charBuffer[py, px] = ' ';
                        backColorBuffer[py, px] = color;
                    }
                }
            }
        }

        public static void DrawLogo(int y)
        {
            // Draw gradient background
            FillGradient(10, y - 1, 80, 10, Colors.GradientBlue, (byte)(Colors.GradientBlue + 12));
            
            // Modern minimalist title
            string[] title = new string[]
            {
                "STEAM ICON FIXER",
                "Modern UI Edition • v2.0"
            };
            
            // Draw main title
            WriteCentered(y + 2, title[0], Colors.TextBright);
            WriteCentered(y + 4, title[1], Colors.TextDim);
            
            // Draw accent line
            for (int i = 30; i < 70; i++)
            {
                if (i < Width && y + 6 < Height)
                {
                    charBuffer[y + 6, i] = ' ';
                    backColorBuffer[y + 6, i] = Colors.AccentCyan;
                }
            }
        }

        // Modern status banner
        public static void DrawStatusBanner(int y, string status, byte statusColor = 0)
        {
            // Use default color if not specified
            if (statusColor == 0) statusColor = Colors.Info;
            
            // Draw clean background with subtle gradient
            DrawModernBox(15, y - 1, 70, 5, Colors.Border, Colors.Surface);
            
            // Draw status text
            WriteCentered(y + 1, status, Colors.TextBright);
        }

        public static void PlayStartupSound()
        {
            new Thread(() =>
            {
                try
                {
                    int baseDelay = 80;
                    Console.Beep(880, baseDelay);  // A5
                    Thread.Sleep(20);
                    Console.Beep(1046, baseDelay); // C6
                    Thread.Sleep(20);
                    Console.Beep(1318, baseDelay); // E6
                    Thread.Sleep(40);
                    Console.Beep(1568, baseDelay * 2); // G6
                }
                catch (Exception) { }
            }) { IsBackground = true }.Start();
        }

        public static void PlayIBMSound()
        {
            new Thread(() =>
            {
                try
                {
                    // IBM BIOS POST jingle: E4, C5, G4, E4
                    Console.Beep(330, 150); // E4
                    Thread.Sleep(30);
                    Console.Beep(523, 150); // C5
                    Thread.Sleep(30);
                    Console.Beep(392, 150); // G4
                    Thread.Sleep(30);
                    Console.Beep(330, 200); // E4
                }
                catch (Exception) { }
            }) { IsBackground = true }.Start();
        }

        public static void PlayMenuMoveSound()
        {
            new Thread(() =>
            {
                try { Console.Beep(1200, 40); } catch (Exception) { }
            }) { IsBackground = true }.Start();
        }

        public static void PlayMenuExitSound()
        {
            new Thread(() =>
            {
                try { Console.Beep(1800, 80); } catch (Exception) { }
            }) { IsBackground = true }.Start();
        }

        public static void Render()
        {
            consolePanel?.RenderConsole(charBuffer, foreColorBuffer, backColorBuffer);
        }

        public static ConsoleKeyInfo WaitForKey()
        {
            while (keyQueue.Count == 0)
            {
                System.Threading.Thread.Sleep(10);
                System.Windows.Forms.Application.DoEvents();
            }
            return keyQueue.Dequeue();
        }

        public static void HandleKeyPress(KeyEventArgs e)
        {
            if (e == null) throw new ArgumentNullException(nameof(e));
            ConsoleKey consoleKey = ConvertToConsoleKey(e.KeyCode);
            char keyChar = GetKeyChar(e);
            var keyInfo = new ConsoleKeyInfo(keyChar, consoleKey, e.Shift, e.Alt, e.Control);
            keyQueue.Enqueue(keyInfo);
        }

        private static ConsoleKey ConvertToConsoleKey(Keys key)
        {
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
                    if (key >= Keys.A && key <= Keys.Z)
                    {
                        return Enum.Parse<ConsoleKey>(key.ToString());
                    }
                    return ConsoleKey.NoName;
            }
        }

        private static char GetKeyChar(KeyEventArgs e)
        {
            if (e.KeyCode >= Keys.A && e.KeyCode <= Keys.Z)
            {
                char c = (char)('A' + (e.KeyCode - Keys.A));
                return e.Shift ? c : char.ToLower(c, CultureInfo.InvariantCulture);
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


        public static void CleanupForExit()
        {
            Clear();
        }

        public static void DrawProgressBar(int x, int y, int width, int value, int max)
        {
            int filled = (int)((double)value / max * width);
            
            // Draw progress background
            for (int i = 0; i < width; i++)
            {
                if (x + i < Width && y < Height)
                {
                    charBuffer[y, x + i] = ' ';
                    backColorBuffer[y, x + i] = Colors.Surface;
                }
            }
            
            // Draw filled portion with gradient
            for (int i = 0; i < filled; i++)
            {
                if (x + i < Width && y < Height)
                {
                    // Create gradient effect
                    float t = (float)i / width;
                    byte gradientColor = (byte)(Colors.AccentCyan + (int)(8 * t));
                    charBuffer[y, x + i] = ' ';
                    backColorBuffer[y, x + i] = gradientColor;
                }
            }
        }

        // Draw a loading spinner animation
        private static int spinnerFrame = 0;
        private static readonly string[] spinnerChars = { "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏" };
        private static readonly string[] spinnerCharsSimple = { "/", "-", "\\", "|" };
        
        public static void DrawLoadingIndicator(int x, int y, string message, bool useSimple = false)
        {
            var chars = useSimple ? spinnerCharsSimple : spinnerChars;
            string spinner = chars[spinnerFrame % chars.Length];
            WriteAt(x, y, $"{spinner} {message}", Colors.AccentCyan);
            spinnerFrame++;
        }

        // Draw an animated loading bar
        public static void DrawAnimatedLoadingBar(int x, int y, int width, string label)
        {
            // Draw label
            WriteCentered(y - 1, label, Colors.Text);
            
            // Draw box
            DrawBox(x, y, width, 3, Colors.AccentCyan);
            
            // Animate the bar
            int animFrame = (Environment.TickCount / 50) % (width * 2);
            int pos = animFrame < width ? animFrame : width * 2 - animFrame;
            
            for (int i = 1; i < width - 1; i++)
            {
                int distance = Math.Abs(i - pos);
                char c = ' ';
                byte color = Colors.Surface;
                
                if (distance < 5)
                {
                    color = (byte)(Colors.AccentCyan + distance);
                    c = distance == 0 ? '█' : distance == 1 ? '▓' : distance == 2 ? '▒' : '░';
                }
                
                WriteAt(x + i, y + 1, c.ToString(), color);
            }
        }

        // Show a confirmation dialog
        public static bool ShowConfirmDialog(string title, string message, string yesText = "Yes", string noText = "No")
        {
            int boxWidth = Math.Max(50, message.Length + 4);
            int boxHeight = 8;
            int boxX = (Width - boxWidth) / 2;
            int boxY = (Height - boxHeight) / 2;
            
            bool confirmed = false;
            bool selection = false; // false = No, true = Yes
            
            while (true)
            {
                // Draw dialog box
                FillBox(boxX, boxY, boxWidth, boxHeight, ' ', Colors.Text, Colors.Background);
                DrawBox(boxX, boxY, boxWidth, boxHeight, Colors.Warning);
                
                // Title
                WriteCentered(boxY + 1, title, Colors.Warning);
                DrawHorizontalLine(boxX + 1, boxY + 2, boxWidth - 2, Colors.Warning);
                
                // Message
                WriteCentered(boxY + 3, message, Colors.Text);
                
                // Options
                int optionY = boxY + 5;
                int yesX = boxX + boxWidth / 3 - yesText.Length / 2;
                int noX = boxX + 2 * boxWidth / 3 - noText.Length / 2;
                
                if (selection)
                {
                    WriteAt(yesX - 2, optionY, $"[ {yesText} ]", Colors.Success);
                    WriteAt(noX, optionY, noText, Colors.TextDim);
                }
                else
                {
                    WriteAt(yesX, optionY, yesText, Colors.TextDim);
                    WriteAt(noX - 2, optionY, $"[ {noText} ]", Colors.Error);
                }
                
                // Help text
                WriteCentered(boxY + 6, "←/→: Select | ENTER: Confirm | ESC: Cancel", Colors.TextDim);
                
                Render();
                
                var key = WaitForKey();
                switch (key.Key)
                {
                    case ConsoleKey.LeftArrow:
                    case ConsoleKey.RightArrow:
                        selection = !selection;
                        PlayMenuMoveSound();
                        break;
                    case ConsoleKey.Enter:
                        confirmed = selection;
                        PlayMenuExitSound();
                        return confirmed;
                    case ConsoleKey.Escape:
                        PlayMenuExitSound();
                        return false;
                    case ConsoleKey.Y:
                        return true;
                    case ConsoleKey.N:
                        return false;
                }
            }
        }
    }
}

