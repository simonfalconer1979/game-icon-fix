using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SteamIconFixer.UI
{
    /// <summary>
    /// Modern menu system with breadcrumb navigation
    /// </summary>
    public class Menu
    {
        public string Title { get; set; }
        public List<MenuItem> Items { get; set; }
        public int SelectedIndex { get; set; }
        public bool IsActive { get; set; }
        public string? ParentMenu { get; set; }
        public string? Breadcrumb { get; set; }

        private int _lastSelectedIndex = -1;

        public Menu(string title)
        {
            Title = title;
            Items = new List<MenuItem>();
            SelectedIndex = 0;
            IsActive = true;
        }

        public void AddItem(string label, Func<Task> action, string? id = null)
        {
            Items.Add(new MenuItem
            {
                Id = id ?? Guid.NewGuid().ToString(),
                Label = label,
                Action = action
            });
        }

        public void Draw(int x = 0, int y = 0)
        {
            _lastSelectedIndex = SelectedIndex;

            // Draw menu background
            int menuWidth = 80;
            int menuHeight = Items.Count + 8;
            int menuX = (ModernConsole.Width - menuWidth) / 2;
            int menuY = y == 0 ? 10 : y;
            
            ModernConsole.FillBox(menuX, menuY, menuWidth, menuHeight, ' ', ModernConsole.Colors.Text, ModernConsole.Colors.Surface);
            ModernConsole.DrawBox(menuX, menuY, menuWidth, menuHeight, ModernConsole.Colors.Border);

            // Draw breadcrumb if available
            if (!string.IsNullOrEmpty(Breadcrumb))
            {
                ModernConsole.WriteAt(menuX + 2, menuY + 1, Breadcrumb, ModernConsole.Colors.TextDim);
                menuY += 1;
            }

            // Draw menu title
            ModernConsole.WriteCentered(menuY + 1, Title, ModernConsole.Colors.TextBright);
            ModernConsole.DrawHorizontalLine(menuX + 2, menuY + 2, menuWidth - 4, ModernConsole.Colors.Border);

            // Draw menu items
            for (int i = 0; i < Items.Count; i++)
            {
                bool isSelected = (i == SelectedIndex);
                string prefix = isSelected ? "► " : "  ";
                string label = Items[i].Label;
                
                // Add keyboard hint if available
                string keyHint = "";
                if (i < 9)
                {
                    keyHint = $"[{i + 1}]";
                }
                else if (Items[i].KeyboardShortcut != null)
                {
                    keyHint = $"[{Items[i].KeyboardShortcut}]";
                }
                
                // Format the menu item
                var itemColor = isSelected ? ModernConsole.Colors.Accent : ModernConsole.Colors.Text;
                var hintColor = isSelected ? ModernConsole.Colors.AccentLight : ModernConsole.Colors.TextDim;
                
                // Draw the item
                ModernConsole.WriteAt(menuX + 3, menuY + 4 + i, prefix, itemColor);
                ModernConsole.WriteAt(menuX + 5, menuY + 4 + i, keyHint, hintColor);
                ModernConsole.WriteAt(menuX + 10, menuY + 4 + i, label, itemColor);
                
            }
            
            // Draw help text with keyboard shortcuts
            int helpY = menuY + menuHeight - 3;
            ModernConsole.DrawHorizontalLine(menuX + 2, helpY, menuWidth - 4, ModernConsole.Colors.Border);
            ModernConsole.WriteCentered(helpY + 1, "↑/↓: Navigate | 1-9: Quick Select | ENTER: Select | ESC: Back", ModernConsole.Colors.TextDim);
        }

        public async Task<bool> HandleKey(ConsoleKeyInfo key)
        {
            switch (key.Key)
            {
                case ConsoleKey.UpArrow:
                    SelectedIndex = (SelectedIndex - 1 + Items.Count) % Items.Count;
                    return true;

                case ConsoleKey.DownArrow:
                    SelectedIndex = (SelectedIndex + 1) % Items.Count;
                    return true;

                case ConsoleKey.Enter:
                    if (Items[SelectedIndex].Action != null)
                    {
                        await Items[SelectedIndex].Action();
                    }
                    return true;

                case ConsoleKey.Escape:
                    IsActive = false;
                    return true;

                // Number key shortcuts
                case ConsoleKey.D1:
                case ConsoleKey.NumPad1:
                    if (Items.Count > 0)
                    {
                        SelectedIndex = 0;
                        if (Items[0].Action != null)
                            await Items[0].Action();
                    }
                    return true;

                case ConsoleKey.D2:
                case ConsoleKey.NumPad2:
                    if (Items.Count > 1)
                    {
                        SelectedIndex = 1;
                        if (Items[1].Action != null)
                            await Items[1].Action();
                    }
                    return true;

                case ConsoleKey.D3:
                case ConsoleKey.NumPad3:
                    if (Items.Count > 2)
                    {
                        SelectedIndex = 2;
                        if (Items[2].Action != null)
                            await Items[2].Action();
                    }
                    return true;

                case ConsoleKey.D4:
                case ConsoleKey.NumPad4:
                    if (Items.Count > 3)
                    {
                        SelectedIndex = 3;
                        if (Items[3].Action != null)
                            await Items[3].Action();
                    }
                    return true;

                case ConsoleKey.D5:
                case ConsoleKey.NumPad5:
                    if (Items.Count > 4)
                    {
                        SelectedIndex = 4;
                        if (Items[4].Action != null)
                            await Items[4].Action();
                    }
                    return true;
            }

            return false;
        }
    }

    public class MenuItem
    {
        public string Id { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public Func<Task> Action { get; set; } = () => Task.CompletedTask;
        public string? KeyboardShortcut { get; set; }
        public string? HelpText { get; set; }
    }
}
