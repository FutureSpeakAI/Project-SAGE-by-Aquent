import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import sharp from 'sharp';
// No longer using potrace - now embedding images directly in SVG for full color preservation

/**
 * Fetch image buffer from URL or base64 string
 */
async function getImageBuffer(imageSource: string | Buffer): Promise<Buffer> {
  // If already a buffer, return it
  if (Buffer.isBuffer(imageSource)) {
    return imageSource;
  }
  
  // Handle data URLs (base64 encoded)
  if (typeof imageSource === 'string' && imageSource.startsWith('data:image')) {
    try {
      // More flexible parsing for complex data URLs
      const base64Start = imageSource.indexOf('base64,');
      if (base64Start === -1) {
        throw new Error('No base64 data found in data URL');
      }
      
      const base64Data = imageSource.substring(base64Start + 7); // Skip 'base64,'
      
      // Validate base64 data exists
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Empty base64 data in data URL');
      }
      
      console.log('Processing data URL, base64 length:', base64Data.length);
      return Buffer.from(base64Data, 'base64');
    } catch (error: any) {
      console.error('Error parsing data URL:', error.message);
      throw new Error(`Invalid data URL format: ${error.message}`);
    }
  }
  
  // Handle URLs
  if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
    try {
      const response = await axios.get(imageSource, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('Error fetching image from URL:', error);
      throw new Error(`Failed to fetch image from URL: ${error.message || 'Unknown error'}`);
    }
  }
  
  throw new Error('Unsupported image source format');
}

/**
 * Convert image to SVG by embedding as base64 data URI (preserves full quality and color)
 */
async function convertToSVG(imageBuffer: Buffer, width?: number, height?: number): Promise<string> {
  try {
    console.log('convertToSVG called with buffer size:', imageBuffer.length, 'bytes');
    
    // Get image metadata to determine dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = width || metadata.width || 1024;
    const imgHeight = height || metadata.height || 1024;
    
    console.log('Image metadata - original:', metadata.width, 'x', metadata.height, 'final:', imgWidth, 'x', imgHeight);
    console.log('Image format:', metadata.format, 'channels:', metadata.channels);
    
    // Convert to optimized PNG for embedding
    const optimizedBuffer = await sharp(imageBuffer)
      .png({ quality: 95, compressionLevel: 6 })
      .toBuffer();
    
    console.log('Optimized buffer size:', optimizedBuffer.length, 'bytes');
    
    // Create base64 data URI
    const base64Data = optimizedBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64Data}`;
    
    console.log('Base64 data URI length:', dataUri.length, 'characters, starts with:', dataUri.substring(0, 50));
    
    // Create SVG with embedded image - preserves full quality and color
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${imgWidth}" height="${imgHeight}" viewBox="0 0 ${imgWidth} ${imgHeight}">
  <title>AI Generated Image</title>
  <desc>High-quality AI-generated image preserved in SVG format</desc>
  <image x="0" y="0" width="${imgWidth}" height="${imgHeight}" 
         xlink:href="${dataUri}" 
         style="image-rendering: auto; image-rendering: crisp-edges; image-rendering: pixelated"/>
</svg>`;
    
    console.log('Final SVG length:', svg.length, 'characters');
    return svg;
  } catch (error: any) {
    console.error('Error converting to SVG:', error);
    throw new Error(`SVG conversion failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Process an image (resize and convert format)
 */
export const processImage = async (req: Request, res: Response) => {
  try {
    // Create temp directory for file operations if needed
    const tempDir = path.join(os.tmpdir(), 'image-processing');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Get image data from request
    let imageBuffer: Buffer;
    
    if (req.file) {
      // Image uploaded as file
      imageBuffer = req.file.buffer;
    } else if (req.body.imageUrl) {
      // Image provided as URL
      imageBuffer = await getImageBuffer(req.body.imageUrl);
    } else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // Image uploaded via multer array
      const file = req.files[0] as Express.Multer.File;
      imageBuffer = file.buffer;
    } else {
      return res.status(400).json({ error: 'No image provided. Please upload an image file or provide an image URL.' });
    }
    
    // Get processing parameters
    const format = req.body.format || 'png';
    const width = parseInt(req.body.width) || 2048;
    const height = parseInt(req.body.height) || 2048;
    
    // Handle SVG conversion separately - now preserves full color and detail
    if (format === 'svg') {
      console.log('Processing SVG with new embedded approach, dimensions:', width, 'x', height);
      const svg = await convertToSVG(imageBuffer, width, height);
      console.log('SVG generated successfully, length:', svg.length, 'characters');
      
      // Set content type and send response
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="processed_${Date.now()}.svg"`);
      return res.send(svg);
    }
    
    // For other formats, use Sharp
    let sharpInstance = sharp(imageBuffer).resize({
      width,
      height,
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    });
    
    // Apply format-specific processing
    switch (format) {
      case 'png':
        sharpInstance = sharpInstance.png({ quality: 100 });
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="processed_${Date.now()}.png"`);
        break;
        
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality: 95 });
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename="processed_${Date.now()}.jpg"`);
        break;
        
      case 'tiff':
        sharpInstance = sharpInstance.tiff({ quality: 100 });
        res.setHeader('Content-Type', 'image/tiff');
        res.setHeader('Content-Disposition', `attachment; filename="processed_${Date.now()}.tiff"`);
        break;
        
      default:
        return res.status(400).json({ error: `Unsupported format: ${format}` });
    }
    
    // Process the image to a buffer and send with proper headers
    const processedImageBuffer = await sharpInstance.toBuffer();
    
    // Set additional headers to force download
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Length', processedImageBuffer.length);
    
    // Send the processed image buffer
    res.send(processedImageBuffer);
    
  } catch (error: any) {
    console.error('Image processing error:', error);
    res.status(500).json({ error: `Image processing failed: ${error.message || 'Unknown error'}` });
  }
};