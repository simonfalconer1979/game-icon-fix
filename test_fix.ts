/**
 * Test script to verify icon downloading works with the new URLs
 */

import { IconProcessor } from "./processor.ts";
import { SteamDetector, SteamIconResolver } from "./steam_detector.ts";

async function testIconFix() {
  console.log("Testing Game Icon Fixer with new Steam CDN URLs...\n");
  
  // Detect Steam
  const steamInfo = await SteamDetector.detect();
  
  if (!steamInfo) {
    console.error("Steam not found!");
    Deno.exit(1);
  }
  
  console.log(`Steam found at: ${steamInfo.installPath}`);
  console.log(`Libraries: ${steamInfo.libraries.length}`);
  
  // Test with a single file first
  const testFile = "C:\\Users\\simon\\Desktop\\Black Mesa.url";
  console.log(`\nTesting with: ${testFile}`);
  
  // Create processor with icon resolver
  const iconResolver = new SteamIconResolver(steamInfo);
  const processor = new IconProcessor(steamInfo, iconResolver);
  
  // Process the test file
  await processor.processFiles([testFile]);
  
  // Show results
  const results = processor.getResults();
  console.log("\nResults:");
  for (const result of results.results) {
    console.log(`- ${result.path}: ${result.success ? "✓" : "✗"} ${result.message}`);
  }
  
  console.log("\nSummary:");
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped: ${results.skipped}`);
}

// Run test
testIconFix().catch(console.error);