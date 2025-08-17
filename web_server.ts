/**
 * Web server with API endpoints for the Steam Icon Fixer
 * Provides REST API for web interface to interact with backend functionality
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { SteamDetector } from "./steam_detector.ts";
import { WebIconProcessor } from "./web_processor.ts";
import { join } from "@std/path";

const PORT = 5173;

// CORS headers for development
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // API Routes
  if (url.pathname.startsWith("/api/")) {
    return handleAPI(req, url.pathname);
  }

  // Serve static files from web directory
  return serveDir(req, {
    fsRoot: "web",
    urlRoot: "",
    showDirListing: false,
    enableCors: true,
  });
}

async function handleAPI(req: Request, pathname: string): Promise<Response> {
  try {
    // Detect Steam installation
    if (pathname === "/api/steam/detect") {
      const steamInfo = await SteamDetector.detect();
      
      if (steamInfo) {
        return jsonResponse({
          success: true,
          data: {
            installPath: steamInfo.installPath,
            libraries: steamInfo.libraries.length,
            userId: steamInfo.userId || "unknown"
          }
        });
      } else {
        return jsonResponse({
          success: false,
          error: "Steam not found"
        }, 404);
      }
    }

    // Get desktop shortcuts
    if (pathname === "/api/shortcuts/desktop") {
      const desktopPath = join(Deno.env.get("USERPROFILE") || "", "Desktop");
      const shortcuts = [];
      
      try {
        for await (const entry of Deno.readDir(desktopPath)) {
          if (entry.name.endsWith(".url")) {
            const content = await Deno.readTextFile(join(desktopPath, entry.name));
            if (content.includes("steam://rungameid/")) {
              const appIdMatch = content.match(/steam:\/\/rungameid\/(\d+)/);
              shortcuts.push({
                name: entry.name.replace(".url", ""),
                path: join(desktopPath, entry.name),
                appId: appIdMatch ? appIdMatch[1] : null
              });
            }
          }
        }
      } catch (error) {
        console.error("Error reading desktop:", error);
      }
      
      return jsonResponse({
        success: true,
        data: shortcuts
      });
    }

    // Fix desktop icons
    if (pathname === "/api/fix/desktop" && req.method === "POST") {
      const steamInfo = await SteamDetector.detect();
      
      if (!steamInfo) {
        return jsonResponse({
          success: false,
          error: "Steam not found"
        }, 404);
      }

      const desktopPath = join(Deno.env.get("USERPROFILE") || "", "Desktop");
      const processor = new WebIconProcessor(steamInfo);
      
      const files = [];
      for await (const entry of Deno.readDir(desktopPath)) {
        if (entry.name.endsWith(".url")) {
          files.push(join(desktopPath, entry.name));
        }
      }

      const results = await processor.processFiles(files);
      
      return jsonResponse({
        success: true,
        data: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results: results
        }
      });
    }

    // Fix specific files
    if (pathname === "/api/fix/files" && req.method === "POST") {
      const body = await req.json();
      const { files } = body;
      
      if (!files || !Array.isArray(files)) {
        return jsonResponse({
          success: false,
          error: "No files provided"
        }, 400);
      }

      const steamInfo = await SteamDetector.detect();
      
      if (!steamInfo) {
        return jsonResponse({
          success: false,
          error: "Steam not found"
        }, 404);
      }

      const processor = new WebIconProcessor(steamInfo);
      const results = await processor.processFiles(files);
      
      return jsonResponse({
        success: true,
        data: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results: results
        }
      });
    }

    // Browse directory
    if (pathname === "/api/browse" && req.method === "POST") {
      const body = await req.json();
      const { path } = body;
      
      const entries = [];
      try {
        const dirPath = path || Deno.env.get("USERPROFILE") || "";
        for await (const entry of Deno.readDir(dirPath)) {
          entries.push({
            name: entry.name,
            isDirectory: entry.isDirectory,
            isShortcut: entry.name.endsWith(".url")
          });
        }
      } catch (error) {
        return jsonResponse({
          success: false,
          error: `Cannot read directory: ${error.message}`
        }, 400);
      }
      
      return jsonResponse({
        success: true,
        data: entries
      });
    }

    return jsonResponse({
      success: false,
      error: "Endpoint not found"
    }, 404);

  } catch (error) {
    console.error("API Error:", error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Start server
console.log(`Starting web server on http://localhost:${PORT}`);
await serve(handleRequest, { port: PORT });