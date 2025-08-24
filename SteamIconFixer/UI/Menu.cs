using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SteamIconFixer.UI
{
    /// <summary>
    /// Retro CGA-style menu system
    /// </summary>
    public class Menu
    {
        public string Title { get; set; }
        public List<MenuItem> Items { get; set; }
        public int SelectedIndex { get; set; }
        public bool IsActive { get; set; }

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
            // Draw menu title
            int menuX = (CGAConsole.Width - 45) / 2;
            int menuY = y == 0 ? 8 : y;

            CGAConsole.WriteCentered(menuY, Title, CGAConsole.Colors.White);
            CGAConsole.WriteCentered(menuY + 1, new string('─', 40), CGAConsole.Colors.White);

            // Draw menu items
            for (int i = 0; i < Items.Count; i++)
            {
                bool isSelected = (i == SelectedIndex);
                string prefix = isSelected ? "> " : "  ";
                string number = $"{i + 1}. ";
                string text = prefix + number + Items[i].Label;
                string color = isSelected ? CGAConsole.Colors.LightMagenta : CGAConsole.Colors.Cyan;

                CGAConsole.WriteAt(menuX, menuY + 3 + i, text, color);
            }
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
    }
}