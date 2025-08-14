import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { join, resolve, extname } from "https://deno.land/std@0.220.0/path/mod.ts";

const PORT = 8080;

// Default Steam paths to check
const DEFAULT_STEAM_PATHS = [
  "c:/program files (x86)/steam",
  "D:/SteamLibrary",
  "E:/SteamLibrary",
];

// HTML content for the GUI
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steam Icon Fixer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 90%;
        }
        
        h1 {
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5em;
            background: linear-gradient(45deg, #00dbde, #fc00ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .subtitle {
            text-align: center;
            color: #aaa;
            margin-bottom: 30px;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section h2 {
            font-size: 1.2em;
            margin-bottom: 15px;
            color: #00dbde;
        }
        
        .button-group {
            display: grid;
            gap: 10px;
        }
        
        button {
            background: linear-gradient(45deg, #00dbde, #fc00ff);
            border: none;
            color: white;
            padding: 15px 30px;
            font-size: 16px;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(252, 0, 255, 0.4);
        }
        
        button:active {
            transform: translateY(0);
        }
        
        button:disabled {
            background: #444;
            cursor: not-allowed;
            transform: none;
        }
        
        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        input[type="text"] {
            flex: 1;
            padding: 12px 20px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 50px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        
        input[type="text"]:focus {
            outline: none;
            border-color: #00dbde;
            background: rgba(255, 255, 255, 0.15);
        }
        
        input[type="text"]::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }
        
        #status {
            margin-top: 20px;
            padding: 15px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
            display: none;
        }
        
        #status.show {
            display: block;
        }
        
        #status.success {
            border-left: 4px solid #4caf50;
        }
        
        #status.error {
            border-left: 4px solid #f44336;
        }
        
        #status.info {
            border-left: 4px solid #2196f3;
        }
        
        #log {
            margin-top: 20px;
            padding: 15px;
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.3);
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
            display: none;
        }
        
        #log.show {
            display: block;
        }
        
        .log-entry {
            margin-bottom: 5px;
            padding: 3px 0;
        }
        
        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            vertical-align: middle;
            margin-left: 10px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .stats {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #00dbde;
        }
        
        .stat-label {
            font-size: 0.9em;
            color: #aaa;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Steam Icon Fixer</h1>
        <p class="subtitle">Fix missing Steam game icons with one click</p>
        
        <div class="section">
            <h2>Quick Actions</h2>
            <div class="button-group">
                <button onclick="processPath('desktop')">
                    🖥️ Fix Desktop Shortcuts
                </button>
                <button onclick="processPath('current')">
                    📁 Fix Current Directory
                </button>
            </div>
        </div>
        
        <div class="section">
            <h2>Custom Path</h2>
            <div class="input-group">
                <input type="text" id="customPath" placeholder="Enter path to folder with shortcuts...">
                <button onclick="processCustomPath()">Process</button>
            </div>
        </div>
        
        <div class="section">
            <h2>Steam Settings</h2>
            <div class="input-group">
                <input type="text" id="steamPath" placeholder="Custom Steam installation path (optional)">
            </div>
        </div>
        
        <div id="status"></div>
        <div id="log"></div>
        <div id="stats" class="stats" style="display: none;">
            <div class="stat">
                <div class="stat-value" id="totalShortcuts">0</div>
                <div class="stat-label">Total Shortcuts</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="fixedShortcuts">0</div>
                <div class="stat-label">Fixed</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="failedShortcuts">0</div>
                <div class="stat-label">Failed</div>
            </div>
        </div>
    </div>
    
    <script>
        let isProcessing = false;
        
        function showStatus(message, type = 'info') {
            const status = document.getElementById('status');
            status.className = 'show ' + type;
            status.innerHTML = message;
        }
        
        function addLog(message) {
            const log = document.getElementById('log');
            log.classList.add('show');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = new Date().toLocaleTimeString() + ' - ' + message;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }
        
        function updateStats(total, fixed, failed) {
            document.getElementById('stats').style.display = 'flex';
            document.getElementById('totalShortcuts').textContent = total;
            document.getElementById('fixedShortcuts').textContent = fixed;
            document.getElementById('failedShortcuts').textContent = failed;
        }
        
        async function processPath(type) {
            if (isProcessing) return;
            
            isProcessing = true;
            document.getElementById('log').innerHTML = '';
            document.getElementById('stats').style.display = 'none';
            
            const steamPath = document.getElementById('steamPath').value;
            
            showStatus('Processing shortcuts... <span class="spinner"></span>', 'info');
            
            try {
                const params = new URLSearchParams({
                    type: type,
                    steamPath: steamPath || ''
                });
                
                const response = await fetch('/api/process?' + params);
                const data = await response.json();
                
                if (data.success) {
                    showStatus('✅ Processing complete!', 'success');
                    
                    // Show logs
                    data.logs.forEach(log => addLog(log));
                    
                    // Update stats
                    updateStats(data.stats.total, data.stats.fixed, data.stats.failed);
                } else {
                    showStatus('❌ Error: ' + data.error, 'error');
                }
            } catch (error) {
                showStatus('❌ Error: ' + error.message, 'error');
            } finally {
                isProcessing = false;
            }
        }
        
        async function processCustomPath() {
            if (isProcessing) return;
            
            const customPath = document.getElementById('customPath').value.trim();
            if (!customPath) {
                showStatus('❌ Please enter a path', 'error');
                return;
            }
            
            isProcessing = true;
            document.getElementById('log').innerHTML = '';
            document.getElementById('stats').style.display = 'none';
            
            const steamPath = document.getElementById('steamPath').value;
            
            showStatus('Processing shortcuts... <span class="spinner"></span>', 'info');
            
            try {
                const response = await fetch('/api/process', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paths: [customPath],
                        steamPath: steamPath || ''
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus('✅ Processing complete!', 'success');
                    
                    // Show logs
                    data.logs.forEach(log => addLog(log));
                    
                    // Update stats
                    updateStats(data.stats.total, data.stats.fixed, data.stats.failed);
                } else {
                    showStatus('❌ Error: ' + data.error, 'error');
                }
            } catch (error) {
                showStatus('❌ Error: ' + error.message, 'error');
            } finally {
                isProcessing = false;
            }
        }
        
        // Allow Enter key in custom path input
        document.getElementById('customPath').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                processCustomPath();
            }
        });
    </script>
</body>
</html>`;

// Helper functions from mod.ts
async function getSteamPathFromRegistry(): Promise<string> {
  const args = ["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"];
  const process = new Deno.Command("reg", { args });
  const { stdout, success } = await process.output();

  if (!success) {
    throw new Error("Failed to query Windows Registry");
  }

  const output = new TextDecoder().decode(stdout).trim();
  const match = output.match(/SteamPath\s+REG_SZ\s+(.+)/);

  if (!match) {
    throw new Error("Couldn't find Steam path in registry");
  }

  return match[1].trim();
}

async function resolveSteamIconsPath(installPath: string): Promise<string> {
  const iconsPath = join(installPath, "/steam/games");
  const isDirectory = await Deno.stat(iconsPath)
    .then((info) => info.isDirectory)
    .catch(() => false);

  if (isDirectory) {
    return iconsPath;
  } else {
    throw new Error(`Not a directory: ${iconsPath}`);
  }
}

async function getSteamIconsPath(steampath?: string): Promise<string> {
  if (steampath) {
    return await resolveSteamIconsPath(steampath);
  }

  // Check all default Steam paths first
  for (const path of DEFAULT_STEAM_PATHS) {
    try {
      return await resolveSteamIconsPath(path);
    } catch {
      // Continue to next path
    }
  }

  // If none of the default paths work, try checking in the Windows registry
  return await resolveSteamIconsPath(await getSteamPathFromRegistry());
}

// Process shortcuts with logging
async function processShortcuts(
  paths: string[],
  steamPath: string,
  logger: (message: string) => void
): Promise<{ total: number; fixed: number; failed: number }> {
  const stats = { total: 0, fixed: 0, failed: 0 };
  
  const steamIconsPath = await getSteamIconsPath(steamPath || undefined);
  logger(`Steam icons path: ${steamIconsPath}`);
  
  for (const searchPath of paths) {
    await processPath(resolve(searchPath), steamIconsPath, stats, logger);
  }
  
  return stats;
}

async function processPath(
  path: string,
  steamIconsPath: string,
  stats: { total: number; fixed: number; failed: number },
  logger: (message: string) => void
): Promise<void> {
  const info = await Deno.stat(path).catch(() => null);
  if (!info) return;
  
  if (info.isDirectory) {
    try {
      for await (const entry of Deno.readDir(path)) {
        await processPath(join(path, entry.name), steamIconsPath, stats, logger);
      }
    } catch (error) {
      if (error instanceof Error) {
        logger(`Failed to read directory ${path}: ${error.message}`);
      }
    }
  } else if (info.isFile && extname(path) === ".url") {
    await processShortcut(path, steamIconsPath, stats, logger).catch((error) => {
      if (error instanceof Error) {
        logger(`Error processing ${path}: ${error.message}`);
      }
    });
  }
}

async function processShortcut(
  shortcutPath: string,
  steamIconsPath: string,
  stats: { total: number; fixed: number; failed: number },
  logger: (message: string) => void
): Promise<void> {
  const linkContent = await Deno.readTextFile(shortcutPath);

  const appId = linkContent.match(/rungameid\/(.+)/m)?.[1];
  if (!appId) {
    return; // Not a Steam shortcut
  }

  stats.total++;

  const iconPath = linkContent.match(/IconFile=(.+)/);
  if (!iconPath) {
    stats.failed++;
    logger(`${shortcutPath} - icon file path missing`);
    return;
  }

  const iconName = iconPath[1].split("\\").pop()!;
  const hasIconFile = await Deno.stat(join(steamIconsPath, iconName))
    .then((info) => info.isFile)
    .catch(() => false);
  if (hasIconFile) {
    return; // Nothing to fix
  }

  const iconUrl = `http://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/${appId}/${iconName}`;
  logger(`Fetching ${iconName} from Steam CDN...`);

  let iconBuffer: ArrayBuffer | null;
  try {
    const response = await fetch(iconUrl, {
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    if (!response.ok) {
      stats.failed++;
      logger(`${iconName} - HTTP ${response.status}`);
      return;
    }
    iconBuffer = await response.arrayBuffer();
  } catch (error) {
    stats.failed++;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger(`${iconName} - failed to fetch: ${errorMessage}`);
    return;
  }

  logger(`Saving ${iconName}...`);
  await Deno.writeFile(
    join(steamIconsPath, iconName),
    new Uint8Array(iconBuffer),
  );

  stats.fixed++;
  logger(`Fixed: ${shortcutPath}`);
}

// Handle HTTP requests
async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    
    // Serve main HTML page
    if (url.pathname === "/") {
        return new Response(HTML, {
            headers: { "content-type": "text/html" }
        });
    }
    
    // API endpoint for processing shortcuts
    if (url.pathname === "/api/process") {
        const logs: string[] = [];
        const logger = (message: string) => logs.push(message);
        
        try {
            let paths: string[] = [];
            let steamPath = "";
            
            if (req.method === "GET") {
                // Handle quick actions
                const type = url.searchParams.get("type");
                steamPath = url.searchParams.get("steamPath") || "";
                
                if (type === "desktop") {
                    const desktopPath = join(Deno.env.get("USERPROFILE") || "", "Desktop");
                    paths = [desktopPath];
                } else if (type === "current") {
                    paths = ["."];
                }
            } else if (req.method === "POST") {
                // Handle custom paths
                const body = await req.json();
                paths = body.paths || [];
                steamPath = body.steamPath || "";
            }
            
            // Process shortcuts
            const stats = await processShortcuts(paths, steamPath, logger);
            
            return new Response(JSON.stringify({
                success: true,
                logs,
                stats
            }), {
                headers: { "content-type": "application/json" }
            });
            
        } catch (error) {
            return new Response(JSON.stringify({
                success: false,
                error: error.message,
                logs
            }), {
                status: 500,
                headers: { "content-type": "application/json" }
            });
        }
    }
    
    // 404 for other routes
    return new Response("Not Found", { status: 404 });
}

console.log(`Steam Icon Fixer GUI`);
console.log(`Server running at http://localhost:${PORT}`);
console.log(`Opening browser...`);

// Try to open browser
try {
    const isWindows = Deno.build.os === "windows";
    const command = isWindows ? "start" : Deno.build.os === "darwin" ? "open" : "xdg-open";
    await new Deno.Command(command, {
        args: [`http://localhost:${PORT}`]
    }).output();
} catch {
    console.log(`Please open http://localhost:${PORT} in your browser`);
}

// Start server
await serve(handler, { port: PORT });