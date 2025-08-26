using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Windows.Forms;

namespace SteamIconFixer.UI
{
    /// <summary>
    /// Main form that hosts the SVGA console display
    /// </summary>
    public partial class ConsoleForm : Form
    {
        private ConsolePanel consolePanel = null!;
        private System.Windows.Forms.Timer refreshTimer = null!;
        
        // SVGA 256-color palette (subset of web-safe colors)
        public static readonly Color[] SVGAPalette = new Color[]
        {
            // Primary colors (0-15, legacy CGA compatible)
            Color.FromArgb(0x00, 0x00, 0x00),    // 0: Black
            Color.FromArgb(0x00, 0x00, 0xAA),    // 1: Blue (CGA)
            Color.FromArgb(0x00, 0xAA, 0x00),    // 2: Green (CGA)
            Color.FromArgb(0x00, 0xAA, 0xAA),    // 3: Cyan (CGA)
            Color.FromArgb(0xAA, 0x00, 0x00),    // 4: Red (CGA)
            Color.FromArgb(0xAA, 0x00, 0xAA),    // 5: Magenta (CGA)
            Color.FromArgb(0xAA, 0x55, 0x00),    // 6: Brown
            Color.FromArgb(0xAA, 0xAA, 0xAA),    // 7: Light Gray
            Color.FromArgb(0x55, 0x55, 0x55),    // 8: Dark Gray
            Color.FromArgb(0x55, 0x55, 0xFF),    // 9: Light Blue
            Color.FromArgb(0x55, 0xFF, 0x55),    // 10: Light Green
            Color.FromArgb(0x55, 0xFF, 0xFF),    // 11: Light Cyan
            Color.FromArgb(0xFF, 0x55, 0x55),    // 12: Light Red
            Color.FromArgb(0xFF, 0x55, 0xFF),    // 13: Light Magenta
            Color.FromArgb(0xFF, 0xFF, 0x55),    // 14: Yellow
            Color.FromArgb(0xFF, 0xFF, 0xFF),    // 15: White
            
            // Extended SVGA colors (16-36)
            Color.FromArgb(0xFF, 0x00, 0x00),    // 16: Pure Red
            Color.FromArgb(0x00, 0xFF, 0x00),    // 17: Pure Green
            Color.FromArgb(0x00, 0x00, 0xFF),    // 18: Pure Blue
            Color.FromArgb(0xFF, 0xFF, 0x00),    // 19: Pure Yellow
            Color.FromArgb(0xFF, 0x99, 0x00),    // 20: Orange
            Color.FromArgb(0x99, 0x00, 0xFF),    // 21: Purple
            Color.FromArgb(0xFF, 0x66, 0xCC),    // 22: Pink
            Color.FromArgb(0x99, 0xFF, 0x00),    // 23: Lime
            Color.FromArgb(0x00, 0xCC, 0x99),    // 24: Teal
            Color.FromArgb(0x00, 0x00, 0x99),    // 25: Navy
            Color.FromArgb(0x99, 0x00, 0x00),    // 26: Maroon
            Color.FromArgb(0x99, 0x99, 0x00),    // 27: Olive
            Color.FromArgb(0x1A, 0x1A, 0x1A),    // 28: Gray10
            Color.FromArgb(0x33, 0x33, 0x33),    // 29: Gray20
            Color.FromArgb(0x4D, 0x4D, 0x4D),    // 30: Gray30
            Color.FromArgb(0x66, 0x66, 0x66),    // 31: Gray40
            Color.FromArgb(0x80, 0x80, 0x80),    // 32: Gray50
            Color.FromArgb(0x99, 0x99, 0x99),    // 33: Gray60
            Color.FromArgb(0xB3, 0xB3, 0xB3),    // 34: Gray70
            Color.FromArgb(0xCC, 0xCC, 0xCC),    // 35: Gray80
            Color.FromArgb(0xE6, 0xE6, 0xE6)     // 36: Gray90
        };
        
        static ConsoleForm()
        {
            // Extend palette to 256 colors if needed
            var extendedPalette = new System.Collections.Generic.List<Color>(SVGAPalette);
            
            // Add remaining colors up to 256 (web-safe palette)
            while (extendedPalette.Count < 256)
            {
                extendedPalette.Add(Color.Black);
            }
            
            SVGAPalette = extendedPalette.ToArray();
        }

        public ConsoleForm()
        {
            InitializeComponent();
            InitializeConsole();
        }

        private void InitializeComponent()
        {
            // Form settings for authentic SVGA look
            this.Text = "Steam Icon Fixer v2.0 - SVGA Mode";
            this.BackColor = Color.Black;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            
            // Set size for 100x37 character display (SVGA 800x600)
            // Using Courier New 10pt Bold typically needs about 8x16 pixels per character
            int charWidth = 8;
            int charHeight = 16;
            int consoleWidth = 100 * charWidth;   // 800 pixels
            int consoleHeight = 37 * charHeight;  // 592 pixels (~600)
            
            this.ClientSize = new Size(consoleWidth + 20, consoleHeight + 20); // Add padding
            
            // Create console panel
            consolePanel = new ConsolePanel();
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
            // Initialize the SVGA console system
            SVGAFormConsole.Initialize(consolePanel);
        }

        private void OnKeyDown(object sender, KeyEventArgs e)
        {
            // Forward key events to the console system
            SVGAFormConsole.HandleKeyPress(e);
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            refreshTimer?.Stop();
            refreshTimer?.Dispose();
            base.OnFormClosed(e);
        }
    }

    /// <summary>
    /// Custom panel for rendering the console display
    /// </summary>
    public class ConsolePanel : Panel
    {
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
                    ControlStyles.ResizeRedraw, true);
            
            // Use a proper monospace font
            // Courier New is more reliable for SVGA-style rendering
            try
            {
                consoleFont = new Font("Courier New", 10, FontStyle.Bold);
            }
            catch
            {
                consoleFont = new Font(FontFamily.GenericMonospace, 10, FontStyle.Bold);
            }
            
            // Calculate character dimensions
            using (var tempBitmap = new Bitmap(1, 1))
            using (var tempGraphics = Graphics.FromImage(tempBitmap))
            {
                var size = tempGraphics.MeasureString("W", consoleFont);
                charWidth = size.Width;
                charHeight = size.Height;
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
                backBufferGraphics.TextRenderingHint = TextRenderingHint.SingleBitPerPixelGridFit;
                backBufferGraphics.SmoothingMode = SmoothingMode.None;
                backBufferGraphics.InterpolationMode = InterpolationMode.NearestNeighbor;
                backBufferGraphics.CompositingQuality = CompositingQuality.HighSpeed;
            }
        }

        public void RenderConsole(char[,] chars, byte[,] foreColors, byte[,] backColors)
        {
            if (backBufferGraphics == null) return;

            // Clear background
            backBufferGraphics.Clear(Color.Black);

            // Use pre-calculated character dimensions for SVGA
            float cellWidth = Width / 100f;
            float cellHeight = Height / 37f;

            // Setup text rendering for crisp display
            backBufferGraphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.SingleBitPerPixelGridFit;
            
            // Use StringFormat for better character alignment
            using (var stringFormat = new StringFormat())
            {
                stringFormat.Alignment = StringAlignment.Near;
                stringFormat.LineAlignment = StringAlignment.Near;
                
                // Render each character
                for (int y = 0; y < 37; y++)
                {
                    for (int x = 0; x < 100; x++)
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

        protected override void OnPaint(PaintEventArgs e)
        {
            if (backBuffer != null)
            {
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
    }
}