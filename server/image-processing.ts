import { Request, Response } from 'express';
import * as potrace from 'potrace';
import sharp from 'sharp';
import axios from 'axios';

/**
 * Fetch image buffer from URL or base64 string
 */
const fetchImage = async (imageUrl: string): Promise<Buffer> => {
  if (imageUrl.startsWith('data:image')) {
    // Handle base64 encoded image
    const base64Data = imageUrl.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  } else {
    // Handle URL
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
};

/**
 * Convert image to SVG using potrace
 */
const convertToSVG = async (imageBuffer: Buffer, options: potrace.PotraceOptions): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    potrace.trace(imageBuffer, options, (err: Error | null, svg: string) => {
      if (err) reject(err);
      else resolve(svg);
    });
  });
};

/**
 * Process an image (resize and convert format)
 */
export const processImage = async (req: Request, res: Response) => {
  try {
    const { imageUrl, format, width, height, quality } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    if (!format) {
      return res.status(400).json({ error: 'Output format is required' });
    }
    
    // Get image buffer from URL or Base64
    const imageBuffer = await fetchImage(imageUrl);
    
    // Process based on format
    let resultBuffer;
    let contentType;
    let fileExtension;
    
    switch(format.toLowerCase()) {
      case 'tiff':
        resultBuffer = await sharp(imageBuffer)
          .resize(width || 4096, height || 4096)
          .tiff({ 
            quality: parseInt(quality) || 100,
            compression: 'lzw'
          })
          .toBuffer();
        contentType = 'image/tiff';
        fileExtension = 'tiff';
        break;
        
      case 'svg':
        const svgData = await convertToSVG(imageBuffer, { 
          threshold: 128,
          optTolerance: 0.2,
          turdSize: 2,
          alphaMax: 1,
          optCurve: true
        });
        resultBuffer = Buffer.from(svgData);
        contentType = 'image/svg+xml';
        fileExtension = 'svg';
        break;
        
      case 'png':
        resultBuffer = await sharp(imageBuffer)
          .resize(width || 4096, height || 4096)
          .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: false
          })
          .toBuffer();
        contentType = 'image/png';
        fileExtension = 'png';
        break;
        
      case 'jpeg':
        resultBuffer = await sharp(imageBuffer)
          .resize(width || 4096, height || 4096)
          .jpeg({ 
            quality: parseInt(quality) || 95,
            chromaSubsampling: '4:4:4'
          })
          .toBuffer();
        contentType = 'image/jpeg';
        fileExtension = 'jpg';
        break;
        
      default:
        return res.status(400).json({ error: 'Unsupported format' });
    }
    
    // Return as downloadable file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="processed-image.${fileExtension}"`);
    return res.send(resultBuffer);
    
  } catch (error) {
    console.error('Image processing error:', error);
    return res.status(500).json({ error: 'Failed to process image' });
  }
};