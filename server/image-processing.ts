import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import sharp from 'sharp';
import potrace from 'potrace';
import { promisify } from 'util';

// Promisify potrace functions
const potraceTrace = promisify<Buffer | string, potrace.Options, string>(potrace.trace);

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
    const matches = imageSource.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid data URL format');
    }
    
    return Buffer.from(matches[2], 'base64');
  }
  
  // Handle URLs
  if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
    try {
      const response = await axios.get(imageSource, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error fetching image from URL:', error);
      throw new Error(`Failed to fetch image from URL: ${error.message}`);
    }
  }
  
  throw new Error('Unsupported image source format');
}

/**
 * Convert image to SVG using potrace
 */
async function convertToSVG(imageBuffer: Buffer, options: potrace.Options): Promise<string> {
  try {
    // For SVG conversion, we need to ensure we have a black and white image
    const preprocessedBuffer = await sharp(imageBuffer)
      .grayscale()
      .toBuffer();
    
    // Trace the image
    const svg = await potraceTrace(preprocessedBuffer, options);
    return svg;
  } catch (error) {
    console.error('Error converting to SVG:', error);
    throw new Error(`SVG conversion failed: ${error.message}`);
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
    
    // Handle SVG conversion separately
    if (format === 'svg') {
      let svgOptions: potrace.Options = {
        threshold: 180,
        background: 'transparent',
        color: '#000000'
      };
      
      // Parse SVG options if provided
      if (req.body.svgOptions) {
        try {
          const parsedOptions = JSON.parse(req.body.svgOptions);
          svgOptions = { ...svgOptions, ...parsedOptions };
        } catch (error) {
          console.warn('Failed to parse SVG options, using defaults', error);
        }
      }
      
      const svg = await convertToSVG(imageBuffer, svgOptions);
      
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
    
    // Send the processed image directly as the response
    sharpInstance.pipe(res);
    
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ error: `Image processing failed: ${error.message}` });
  }
};