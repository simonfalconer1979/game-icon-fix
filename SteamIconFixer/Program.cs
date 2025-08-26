using System;
using System.Threading.Tasks;
using System.Windows.Forms;
using SteamIconFixer;
using SteamIconFixer.UI;

class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        // Enable visual styles for better appearance
        System.Windows.Forms.Application.EnableVisualStyles();
        System.Windows.Forms.Application.SetCompatibleTextRenderingDefault(false);
        
        try
        {
            // Create and show the console form
            var form = new ConsoleForm();
            
            // Start the application logic in a background task
            Task.Run(async () =>
            {
                try
                {
                    var app = new SteamIconFixer.Application();
                    await app.Run();
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Fatal error: {ex.Message}", "Steam Icon Fixer Error", 
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                    System.Windows.Forms.Application.Exit();
                }
            });
            
            // Run the Windows Forms message loop
            System.Windows.Forms.Application.Run(form);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Fatal error: {ex.Message}", "Steam Icon Fixer Error", 
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
