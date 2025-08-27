using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Windows.Forms;
using System.Runtime.InteropServices;

namespace SteamIconFixer.UI
{
    /// <summary>
    /// Main form that hosts the modern DPI-aware console display
    /// </summary>
    public partial class ConsoleForm : Form
    {
        private ConsolePanel consolePanel = null!;
        private System.Windows.Forms.Timer refreshTimer = null!;
        
        // Modern SVGA 256-color palette with beautiful gradients
        public static readonly Color[] SVGAPalette = GenerateModernPalette();
        
        private static Color[] GenerateModernPalette()
        {
            var palette = new Color[256];
            
            // Core Modern Colors (0-31) - Beautiful base colors
            palette[0] = Color.FromArgb(0x0A, 0x0E, 0x1A);      // 0: Deep Space Black
            palette[1] = Color.FromArgb(0x1E, 0x2A, 0x3A);      // 1: Midnight Blue
            palette[2] = Color.FromArgb(0x2E, 0x3C, 0x4E);      // 2: Dark Slate
            palette[3] = Color.FromArgb(0x3E, 0x4E, 0x60);      // 3: Gunmetal
            palette[4] = Color.FromArgb(0x4E, 0x60, 0x72);      // 4: Steel Blue
            palette[5] = Color.FromArgb(0x5E, 0x72, 0x84);      // 5: Slate Blue
            palette[6] = Color.FromArgb(0x6E, 0x84, 0x96);      // 6: Cool Gray
            palette[7] = Color.FromArgb(0x8E, 0xA4, 0xB8);      // 7: Light Steel
            palette[8] = Color.FromArgb(0xAE, 0xC4, 0xDA);      // 8: Pale Blue
            palette[9] = Color.FromArgb(0xCE, 0xE4, 0xFC);      // 9: Ice Blue
            palette[10] = Color.FromArgb(0xF0, 0xF4, 0xF8);     // 10: Snow White
            palette[11] = Color.FromArgb(0xFF, 0xFF, 0xFF);     // 11: Pure White
            
            // Accent Colors - Vibrant Modern Palette (12-31)
            palette[12] = Color.FromArgb(0x00, 0xD9, 0xFF);     // 12: Cyan Accent
            palette[13] = Color.FromArgb(0x00, 0xFF, 0xC1);     // 13: Aqua Mint
            palette[14] = Color.FromArgb(0x00, 0xFF, 0x88);     // 14: Spring Green
            palette[15] = Color.FromArgb(0x88, 0xFF, 0x00);     // 15: Lime
            palette[16] = Color.FromArgb(0xFF, 0xE5, 0x00);     // 16: Gold
            palette[17] = Color.FromArgb(0xFF, 0xAA, 0x00);     // 17: Amber
            palette[18] = Color.FromArgb(0xFF, 0x66, 0x00);     // 18: Orange
            palette[19] = Color.FromArgb(0xFF, 0x33, 0x33);     // 19: Coral Red
            palette[20] = Color.FromArgb(0xFF, 0x00, 0x66);     // 20: Hot Pink
            palette[21] = Color.FromArgb(0xCC, 0x00, 0xFF);     // 21: Purple
            palette[22] = Color.FromArgb(0x66, 0x00, 0xFF);     // 22: Deep Purple
            palette[23] = Color.FromArgb(0x00, 0x66, 0xFF);     // 23: Azure
            
            // Success/Warning/Error Colors (24-27)
            palette[24] = Color.FromArgb(0x00, 0xE6, 0x76);     // 24: Success Green
            palette[25] = Color.FromArgb(0xFF, 0xD6, 0x00);     // 25: Warning Yellow
            palette[26] = Color.FromArgb(0xFF, 0x44, 0x44);     // 26: Error Red
            palette[27] = Color.FromArgb(0x00, 0xAA, 0xFF);     // 27: Info Blue
            
            // Gradient Colors (28-63) - Smooth transitions
            for (int i = 28; i < 44; i++)
            {
                float t = (i - 28) / 15f;
                palette[i] = LerpColor(
                    Color.FromArgb(0x00, 0x1A, 0x33),
                    Color.FromArgb(0x00, 0x66, 0xCC),
                    t);
            }
            
            for (int i = 44; i < 60; i++)
            {
                float t = (i - 44) / 15f;
                palette[i] = LerpColor(
                    Color.FromArgb(0xFF, 0x00, 0x88),
                    Color.FromArgb(0x88, 0x00, 0xFF),
                    t);
            }
            
            // Gray Scale (60-91) - 32 shades
            for (int i = 60; i < 92; i++)
            {
                int gray = (int)((i - 60) * 255 / 31);
                palette[i] = Color.FromArgb(gray, gray, gray);
            }
            
            // Rainbow Spectrum (92-155)
            for (int i = 92; i < 156; i++)
            {
                float hue = (i - 92) * 360f / 64f;
                palette[i] = HslToRgb(hue, 0.8f, 0.5f);
            }
            
            // Pastel Colors (156-191)
            for (int i = 156; i < 192; i++)
            {
                float hue = (i - 156) * 360f / 36f;
                palette[i] = HslToRgb(hue, 0.5f, 0.8f);
            }
            
            // Deep/Dark Colors (192-223)
            for (int i = 192; i < 224; i++)
            {
                float hue = (i - 192) * 360f / 32f;
                palette[i] = HslToRgb(hue, 0.7f, 0.3f);
            }
            
            // Material Design Inspired (224-255)
            for (int i = 224; i < 256; i++)
            {
                float hue = (i - 224) * 360f / 32f;
                palette[i] = HslToRgb(hue, 0.6f, 0.6f);
            }
            
            return palette;
        }
        
        private static Color LerpColor(Color a, Color b, float t)
        {
            return Color.FromArgb(
                (int)(a.R + (b.R - a.R) * t),
                (int)(a.G + (b.G - a.G) * t),
                (int)(a.B + (b.B - a.B) * t));
        }
        
        private static Color HslToRgb(float h, float s, float l)
        {
            float c = (1 - Math.Abs(2 * l - 1)) * s;
            float x = c * (1 - Math.Abs(((h / 60) % 2) - 1));
            float m = l - c / 2;
            float r = 0, g = 0, b = 0;
            
            if (h < 60) { r = c; g = x; b = 0; }
            else if (h < 120) { r = x; g = c; b = 0; }
            else if (h < 180) { r = 0; g = c; b = x; }
            else if (h < 240) { r = 0; g = x; b = c; }
            else if (h < 300) { r = x; g = 0; b = c; }
            else { r = c; g = 0; b = x; }
            
            return Color.FromArgb(
                (int)((r + m) * 255),
                (int)((g + m) * 255),
                (int)((b + m) * 255));
        }
        

        public ConsoleForm()
        {
            InitializeComponent();
            InitializeConsole();
        }

        private void InitializeComponent()
        {
            // Enable DPI awareness
            this.AutoScaleMode = AutoScaleMode.Dpi;
            
            // Form settings for modern look
            this.Text = "Steam Icon Fixer v2.0 - DPI-Aware Edition";
            this.BackColor = Color.FromArgb(20, 20, 25);
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;

            // Create console panel
            consolePanel = new ConsolePanel();
            consolePanel.EnableDpiAwareness();
            float charWidth = consolePanel.CharWidth;
            float charHeight = consolePanel.CharHeight;
            int consoleWidth = (int)(120 * charWidth);
            int consoleHeight = (int)(40 * charHeight);
            this.ClientSize = new Size(consoleWidth + 20, consoleHeight + 20); // Add padding
            consolePanel.Location = new Point(10, 10);
            consolePanel.Size = new Size(consoleWidth, consoleHeight);
            consolePanel.BackColor = Color.Black;
            this.Controls.Add(consolePanel);
            
            // Setup refresh timer for smooth updates
            refreshTimer = new System.Windows.Forms.Timer();
            refreshTimer.Interval = 16; // ~60 FPS
            refreshTimer.Tick += (s, e) => consolePanel.Invalidate();
            refreshTimer.Start();
            
            // Handle keyboard input
            this.KeyPreview = true;
            this.KeyDown += OnKeyDown;
        }

        private void InitializeConsole()
        {
            // Initialize the modern console system
            ModernConsole.Initialize(consolePanel);
        }

        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            // Forward key events to the console system
            ModernConsole.HandleKeyPress(e);
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            refreshTimer?.Stop();
            refreshTimer?.Dispose();
            base.OnFormClosed(e);
        }
    }

    /// <summary>
    /// Custom panel for rendering the modern DPI-aware console display
    /// </summary>
    public class ConsolePanel : Panel
    {
        private float dpiScale = 1.0f;
        private Font consoleFont = null!;
        private Bitmap? backBuffer;
        private Graphics? backBufferGraphics;
        private float charWidth;
        private float charHeight;

        public ConsolePanel()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | 
                    ControlStyles.UserPaint | 
                    ControlStyles.DoubleBuffer | 
                    ControlStyles.ResizeRedraw |
                    ControlStyles.Opaque, true);
            
            LoadModernFont();
            CalculateCharDimensions();
        }

        public void EnableDpiAwareness()
        {
            using (var g = this.CreateGraphics())
            {
                dpiScale = g.DpiX / 96f;
            }
            LoadModernFont();
            CalculateCharDimensions();
        }

        private void CalculateCharDimensions()
        {
            using (var tempBitmap = new Bitmap(1, 1))
            using (var tempGraphics = Graphics.FromImage(tempBitmap))
            {
                tempGraphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
                var size = tempGraphics.MeasureString("W", consoleFont, PointF.Empty, StringFormat.GenericTypographic);
                charWidth = size.Width;
                charHeight = consoleFont.GetHeight(tempGraphics);
            }
        }

        private void LoadModernFont()
        {
            float fontSize = 10f * dpiScale;
            
            try
            {
                // Try Cascadia Code first (modern Windows Terminal font)
                consoleFont = new Font("Cascadia Code", fontSize, FontStyle.Regular, GraphicsUnit.Point);
            }
            catch
            {
                try
                {
                    // Fallback to Consolas
                    consoleFont = new Font("Consolas", fontSize, FontStyle.Regular, GraphicsUnit.Point);
                }
                catch
                {
                    // Final fallback
                    consoleFont = new Font(FontFamily.GenericMonospace, fontSize, FontStyle.Regular);
                }
            }
        }

        protected override void OnSizeChanged(EventArgs e)
        {
            base.OnSizeChanged(e);
            
            // Recreate back buffer when size changes
            backBuffer?.Dispose();
            backBufferGraphics?.Dispose();
            
            if (Width > 0 && Height > 0)
            {
                backBuffer = new Bitmap(Width, Height);
                backBufferGraphics = Graphics.FromImage(backBuffer);
                backBufferGraphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
                backBufferGraphics.SmoothingMode = SmoothingMode.HighQuality;
                backBufferGraphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                backBufferGraphics.CompositingQuality = CompositingQuality.HighQuality;
                backBufferGraphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            }
        }

        public void RenderConsole(char[,] chars, byte[,] foreColors, byte[,] backColors)
        {
            if (backBufferGraphics == null) return;

            // Clear background
            backBufferGraphics.Clear(Color.Black);

            // Use actual character dimensions for SVGA
            float cellWidth = charWidth;
            float cellHeight = charHeight;

            // Setup text rendering for high quality display
            backBufferGraphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
            backBufferGraphics.SmoothingMode = SmoothingMode.HighQuality;

            // Use StringFormat for precise character alignment
            using (var stringFormat = new StringFormat(StringFormat.GenericTypographic))
            {
                stringFormat.FormatFlags = StringFormatFlags.MeasureTrailingSpaces;
                stringFormat.Alignment = StringAlignment.Near;
                stringFormat.LineAlignment = StringAlignment.Near;

                // Render each character
                int gridHeight = chars.GetLength(0);
                int gridWidth = chars.GetLength(1);
                for (int y = 0; y < gridHeight; y++)
                {
                    for (int x = 0; x < gridWidth; x++)
                    {
                        char c = chars[y, x];

                        // Get colors (support extended SVGA palette)
                        int foreIndex = Math.Min(foreColors[y, x], ConsoleForm.SVGAPalette.Length - 1);
                        int backIndex = Math.Min(backColors[y, x], ConsoleForm.SVGAPalette.Length - 1);
                        Color foreColor = ConsoleForm.SVGAPalette[foreIndex];
                        Color backColor = ConsoleForm.SVGAPalette[backIndex];

                        float px = x * cellWidth;
                        float py = y * cellHeight;

                        // Create rectangle for this cell
                        RectangleF cellRect = new RectangleF(px, py, cellWidth, cellHeight);

                        // Draw background (always, even for spaces)
                        using (var backBrush = new SolidBrush(backColor))
                        {
                            backBufferGraphics.FillRectangle(backBrush, cellRect);
                        }

                        // Draw character if not empty
                        if (c != '\0' && c != ' ')
                        {
                            using (var foreBrush = new SolidBrush(foreColor))
                            {
                                backBufferGraphics.DrawString(c.ToString(), consoleFont, foreBrush, cellRect, stringFormat);
                            }
                        }
                    }
                }
            }

            // Force repaint
            Invalidate();
        }

        public void RenderModernConsole(char[,] chars, Color[,] foreColors, Color[,] backColors)
        {
            if (backBufferGraphics == null) return;

            // Clear background with modern color
            backBufferGraphics.Clear(Color.FromArgb(20, 20, 25));

            float cellWidth = charWidth;
            float cellHeight = charHeight;

            // Setup text rendering for best quality
            backBufferGraphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
            backBufferGraphics.SmoothingMode = SmoothingMode.HighQuality;

            using (var stringFormat = new StringFormat(StringFormat.GenericTypographic))
            {
                stringFormat.FormatFlags = StringFormatFlags.MeasureTrailingSpaces;
                stringFormat.Alignment = StringAlignment.Near;
                stringFormat.LineAlignment = StringAlignment.Near;

                int gridHeight = chars.GetLength(0);
                int gridWidth = chars.GetLength(1);
                
                for (int y = 0; y < gridHeight; y++)
                {
                    for (int x = 0; x < gridWidth; x++)
                    {
                        char c = chars[y, x];
                        Color foreColor = foreColors[y, x];
                        Color backColor = backColors[y, x];

                        float px = x * cellWidth;
                        float py = y * cellHeight;

                        RectangleF cellRect = new RectangleF(px, py, cellWidth, cellHeight);

                        // Draw background
                        using (var backBrush = new SolidBrush(backColor))
                        {
                            backBufferGraphics.FillRectangle(backBrush, cellRect);
                        }

                        // Draw character
                        if (c != '\0' && c != ' ')
                        {
                            using (var foreBrush = new SolidBrush(foreColor))
                            {
                                backBufferGraphics.DrawString(c.ToString(), consoleFont, foreBrush, cellRect, stringFormat);
                            }
                        }
                    }
                }
            }

            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            if (backBuffer != null)
            {
                e.Graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
                e.Graphics.DrawImage(backBuffer, 0, 0);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                consoleFont?.Dispose();
                backBuffer?.Dispose();
                backBufferGraphics?.Dispose();
            }
            base.Dispose(disposing);
        }

        public float CharWidth => charWidth;
        public float CharHeight => charHeight;
    }
}

