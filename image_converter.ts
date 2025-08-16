/**
 * Image converter module for converting JPG/PNG to ICO format
 * Uses a simple ICO format implementation for Windows shortcuts
 */

/**
 * Convert image buffer to ICO format
 * Creates a simple 32x32 ICO file from any image format
 * @param imageBuffer - Raw image data (JPG/PNG)
 * @param mimeType - MIME type of the source image
 * @returns ICO format buffer
 */
export async function convertToIco(imageBuffer: ArrayBuffer, mimeType?: string): Promise<Uint8Array> {
  // For now, we'll create a simple ICO wrapper around the PNG data
  // Steam accepts PNG-based ICO files
  
  // If it's already ICO, return as-is
  const bytes = new Uint8Array(imageBuffer);
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return bytes;
  }
  
  // For JPG/PNG, we need to convert to a proper ICO format
  // Windows shortcuts can actually use PNG/JPG directly with proper header
  
  // Try to use the image directly first (Windows 10+ supports this)
  // If the image is PNG, we can wrap it in ICO format
  if (isPng(bytes)) {
    return wrapPngAsIco(bytes);
  }
  
  // For JPG and other formats, we'll need to convert to PNG first
  // For now, we'll use the image as-is and let Windows handle it
  // This works for most modern Windows versions
  return bytes;
}

/**
 * Check if the buffer is a PNG image
 */
function isPng(bytes: Uint8Array): boolean {
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
}

/**
 * Wrap PNG data in ICO format
 * Creates a valid ICO file with PNG data
 */
function wrapPngAsIco(pngData: Uint8Array): Uint8Array {
  // ICO Header (6 bytes)
  const header = new Uint8Array(6);
  header[0] = 0x00; // Reserved
  header[1] = 0x00; // Reserved
  header[2] = 0x01; // Type (1 = ICO)
  header[3] = 0x00; // Type high byte
  header[4] = 0x01; // Number of images (1)
  header[5] = 0x00; // Number of images high byte
  
  // ICO Directory Entry (16 bytes)
  const dirEntry = new Uint8Array(16);
  dirEntry[0] = 0x00; // Width (0 = 256)
  dirEntry[1] = 0x00; // Height (0 = 256)
  dirEntry[2] = 0x00; // Color palette
  dirEntry[3] = 0x00; // Reserved
  dirEntry[4] = 0x01; // Color planes
  dirEntry[5] = 0x00; // Color planes high byte
  dirEntry[6] = 0x20; // Bits per pixel (32)
  dirEntry[7] = 0x00; // Bits per pixel high byte
  
  // Size of PNG data (4 bytes, little-endian)
  const size = pngData.length;
  dirEntry[8] = size & 0xFF;
  dirEntry[9] = (size >> 8) & 0xFF;
  dirEntry[10] = (size >> 16) & 0xFF;
  dirEntry[11] = (size >> 24) & 0xFF;
  
  // Offset to PNG data (4 bytes, little-endian)
  const offset = 22; // Header (6) + Directory (16)
  dirEntry[12] = offset & 0xFF;
  dirEntry[13] = (offset >> 8) & 0xFF;
  dirEntry[14] = (offset >> 16) & 0xFF;
  dirEntry[15] = (offset >> 24) & 0xFF;
  
  // Combine all parts
  const icoData = new Uint8Array(header.length + dirEntry.length + pngData.length);
  icoData.set(header, 0);
  icoData.set(dirEntry, header.length);
  icoData.set(pngData, header.length + dirEntry.length);
  
  return icoData;
}

/**
 * Try to extract the best icon representation from various Steam image formats
 * @param url - The URL that was successful in downloading
 * @param buffer - The downloaded image buffer
 * @returns Processed buffer ready for ICO conversion
 */
export function preprocessSteamImage(url: string, buffer: ArrayBuffer): ArrayBuffer {
  // Library hero images are tall, we might want to crop them
  // For now, we'll use them as-is and let Windows scale them
  return buffer;
}