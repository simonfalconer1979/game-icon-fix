using System;
using System.Threading.Tasks;
using SteamIconFixer;

class Program
{
    static async Task Main(string[] args)
    {
        try
        {
            var app = new Application();
            await app.Run();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Fatal error: {ex.Message}");
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }
    }
}
