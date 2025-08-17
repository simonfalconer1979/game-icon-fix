/**
 * Simple test without UI to verify icon downloading
 */

import { SteamDetector, SteamIconResolver } from "./steam_detector.ts";

async function testSimple() {
  console.log("Testing Steam CDN URLs...\n");
  
  // Test URLs for Black Mesa (App ID: 362890)
  const appId = "362890";
  const resolver = new SteamIconResolver(await SteamDetector.detect() || {} as any);
  const urls = resolver.getIconUrls(appId, "steam_icon_362890.ico");
  
  console.log(`Testing icon download for App ID ${appId}:`);
  
  for (const url of urls) {
    console.log(`\nTrying: ${url}`);
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        console.log(`✓ SUCCESS! Downloaded ${buffer.byteLength} bytes`);
        console.log(`  Content-Type: ${response.headers.get('content-type')}`);
        
        // Check if it's an image
        const bytes = new Uint8Array(buffer);
        if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
          console.log(`  Format: JPEG`);
        } else if (bytes[0] === 0x89 && bytes[1] === 0x50) {
          console.log(`  Format: PNG`);
        }
        
        return true;
      } else {
        console.log(`✗ Failed: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`✗ Error: ${error}`);
    }
  }
  
  return false;
}

testSimple().then(success => {
  console.log(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
  Deno.exit(success ? 0 : 1);
});