using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;
using System.Drawing.Text;

namespace SteamIconFixer.UI
{
    internal static class ModernConsole
    {
        public const int Width = 120;
        public const int Height = 40;

        private static char[,] charBuffer = new char[Height, Width];
        private static Color[,] foreColorBuffer = new Color[Height, Width];
        private static Color[,] backColorBuffer = new Color[Height, Width];

        private static Color currentForeColor = Color.White;
        private static Color currentBackColor = Color.FromArgb(20, 20, 25);

        private static ConsolePanel? consolePanel;
        private static Queue<ConsoleKeyInfo> keyQueue = new Queue<ConsoleKeyInfo>();

        internal static class Colors
        {
            public static readonly Color Background = Color.FromArgb(20, 20, 25);
            public static readonly Color Surface = Color.FromArgb(32, 34, 40);
            public static readonly Color SurfaceLight = Color.FromArgb(45, 48, 56);
            public static readonly Color Border = Color.FromArgb(60, 65, 75);
            public static readonly Color Text = Color.FromArgb(230, 230, 235);
            public static readonly Color TextDim = Color.FromArgb(150, 155, 165);
            public static readonly Color TextBright = Color.White;
            
            public static readonly Color Accent = Color.FromArgb(64, 158, 255);
            public static readonly Color AccentLight = Color.FromArgb(100, 181, 255);
            public static readonly Color AccentCyan = Color.FromArgb(0, 217, 255);
            public static readonly Color AccentGold = Color.FromArgb(255, 215, 0);
            public static readonly Color AccentAzure = Color.FromArgb(0, 127, 255);
            public static readonly Color AccentPurple = Color.FromArgb(147, 112, 219);
            public static readonly Color Success = Color.FromArgb(76, 175, 80);
            public static readonly Color Warning = Color.FromArgb(255, 193, 7);
            public static readonly Color Error = Color.FromArgb(244, 67, 54);
            public static readonly Color Info = Color.FromArgb(33, 150, 243);
        }

        public static void Initialize(ConsolePanel panel)
        {
            consolePanel = panel;
            if (panel != null)
            {
                panel.EnableDpiAwareness();
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

        public static void WriteAt(int x, int y, string text, Color foreColor)
        {
            if (text == null) return;
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

        public static void WriteAt(int x, int y, string text, Color foreColor, Color backColor)
        {
            if (text == null) return;
            if (y < 0 || y >= Height) return;
            
            for (int i = 0; i < text.Length && x + i < Width; i++)
            {
                if (x + i >= 0)
                {
                    charBuffer[y, x + i] = text[i];
                    foreColorBuffer[y, x + i] = foreColor;
                    backColorBuffer[y, x + i] = backColor;
                }
            }
        }

        public static void WriteCentered(int y, string text, Color foreColor)
        {
            if (text == null) return;
            int x = (Width - text.Length) / 2;
            WriteAt(x, y, text, foreColor);
        }

        public static void DrawBox(int x, int y, int width, int height, Color borderColor)
        {
            WriteAt(x, y, "╭", borderColor);
            for (int i = 1; i < width - 1; i++)
                WriteAt(x + i, y, "─", borderColor);
            WriteAt(x + width - 1, y, "╮", borderColor);

            for (int i = 1; i < height - 1; i++)
            {
                WriteAt(x, y + i, "│", borderColor);
                WriteAt(x + width - 1, y + i, "│", borderColor);
            }

            WriteAt(x, y + height - 1, "╰", borderColor);
            for (int i = 1; i < width - 1; i++)
                WriteAt(x + i, y + height - 1, "─", borderColor);
            WriteAt(x + width - 1, y + height - 1, "╯", borderColor);
        }

        public static void FillBox(int x, int y, int width, int height, char ch, Color foreColor, Color backColor)
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

        public static void DrawHorizontalLine(int x, int y, int width, Color foreColor)
        {
            for (int i = 0; i < width; i++)
            {
                if (x + i < Width)
                {
                    WriteAt(x + i, y, "─", foreColor);
                }
            }
        }

        public static void DrawTitle(int y)
        {
            FillBox(0, y, Width, 5, ' ', Colors.Text, Colors.Surface);
            
            WriteCentered(y + 1, "STEAM ICON FIXER", Colors.TextBright);
            WriteCentered(y + 2, "Version 2.0 • DPI-Aware Edition", Colors.TextDim);
            
            DrawHorizontalLine(20, y + 3, Width - 40, Colors.Border);
        }

        public static void DrawStatusMessage(int y, string message, Color statusColor)
        {
            FillBox(10, y, Width - 20, 3, ' ', Colors.Text, Colors.SurfaceLight);
            WriteCentered(y + 1, message, statusColor);
        }

        public static void Render()
        {
            consolePanel?.RenderModernConsole(charBuffer, foreColorBuffer, backColorBuffer);
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
            if (e == null) return;
            
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

        public static bool ShowConfirmDialog(string title, string message)
        {
            int boxWidth = Math.Max(60, message.Length + 10);
            int boxHeight = 8;
            int boxX = (Width - boxWidth) / 2;
            int boxY = (Height - boxHeight) / 2;
            
            bool selection = false;
            
            while (true)
            {
                FillBox(boxX, boxY, boxWidth, boxHeight, ' ', Colors.Text, Colors.Surface);
                DrawBox(boxX, boxY, boxWidth, boxHeight, Colors.Border);
                
                WriteCentered(boxY + 2, title, Colors.Warning);
                WriteCentered(boxY + 3, message, Colors.Text);
                
                int optionY = boxY + 5;
                string yesText = selection ? "[ YES ]" : "  YES  ";
                string noText = !selection ? "[ NO ]" : "  NO  ";
                
                WriteAt(boxX + boxWidth/3 - 3, optionY, yesText, selection ? Colors.Success : Colors.TextDim);
                WriteAt(boxX + 2*boxWidth/3 - 2, optionY, noText, !selection ? Colors.Error : Colors.TextDim);
                
                WriteCentered(boxY + 6, "Use arrows to select, Enter to confirm", Colors.TextDim);
                
                Render();
                
                var key = WaitForKey();
                switch (key.Key)
                {
                    case ConsoleKey.LeftArrow:
                    case ConsoleKey.RightArrow:
                        selection = !selection;
                        break;
                    case ConsoleKey.Enter:
                        return selection;
                    case ConsoleKey.Escape:
                        return false;
                    case ConsoleKey.Y:
                        return true;
                    case ConsoleKey.N:
                        return false;
                }
            }
        }

        public static void CleanupForExit()
        {
            Clear();
        }

        public static void DrawAnimatedLoadingBar(int x, int y, int width, string label)
        {
            DrawStatusMessage(y, label, Colors.Info);
        }

        public static void DrawModernBox(int x, int y, int width, int height, Color borderColor, Color backgroundColor)
        {
            FillBox(x, y, width, height, ' ', Colors.Text, backgroundColor);
            DrawBox(x, y, width, height, borderColor);
        }

        public static void FillGradient(int x, int y, int width, int height, Color startColor, Color endColor)
        {
            for (int dy = 0; dy < height; dy++)
            {
                float t = (float)dy / height;
                int r = (int)(startColor.R + (endColor.R - startColor.R) * t);
                int g = (int)(startColor.G + (endColor.G - startColor.G) * t);
                int b = (int)(startColor.B + (endColor.B - startColor.B) * t);
                Color gradColor = Color.FromArgb(r, g, b);
                
                for (int dx = 0; dx < width; dx++)
                {
                    int px = x + dx;
                    int py = y + dy;
                    if (px >= 0 && px < Width && py >= 0 && py < Height)
                    {
                        charBuffer[py, px] = ' ';
                        backColorBuffer[py, px] = gradColor;
                    }
                }
            }
        }
    }
}