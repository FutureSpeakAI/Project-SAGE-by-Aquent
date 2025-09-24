import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import { createRequire } from 'module';
import { PDFData, PDFErrorData } from './brief-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Configure OpenAI client with timeout and retry settings
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 20000, // 20 second timeout
  maxRetries: 1,
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Create uploads directory if it doesn't exist
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific file types
    const allowedTypes = ['.txt', '.pdf', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .txt, .pdf, and .docx files are allowed.') as any);
    }
  }
}).single('file');

// Create a promisified upload function
const uploadFilePromise = (req: Request, res: Response): Promise<void> => {
  return new Promise((resolve, reject) => {
    upload(req, res, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

// Interface for extracted content including text and images
interface ExtractedContent {
  text: string;
  images: Array<{
    id: string;
    filename: string;
    base64: string;
    mimeType: string;
    analysis?: string;
  }>;
}

// Function to extract text and images from a file buffer
export async function extractContentFromFile(fileBuffer: Buffer, fileExt: string, originalFilename: string): Promise<ExtractedContent> {
  // First extract text
  const text = await extractTextFromFile(fileBuffer, fileExt);
  
  // Then extract images (defined later in file)
  let images: Array<{
    id: string;
    filename: string;
    base64: string;
    mimeType: string;
    analysis?: string;
  }> = [];
  
  try {
    images = await extractImagesFromFile(fileBuffer, fileExt, originalFilename);
  } catch (error) {
    console.warn('Image extraction failed, continuing with text only:', error);
  }
  
  return {
    text,
    images
  };
}

// Function to extract text from a file buffer based on its extension
export async function extractTextFromFile(fileBuffer: Buffer, fileExt: string): Promise<string> {
  try {
    if (fileExt === '.txt') {
      // For text files, simply convert buffer to string and do minimal cleanup
      let text = fileBuffer.toString('utf8');
      
      // Just clean up excessive whitespace, don't try to "fix" spacing
      text = text
        .replace(/(\s)\s+/g, '$1')     // Collapse multiple spaces to single
        .replace(/\n\s+/g, '\n')        // Remove leading spaces after newlines
        .replace(/\s+\n/g, '\n')        // Remove trailing spaces before newlines
        .replace(/\n{3,}/g, '\n\n')     // Multiple newlines to double newline
        .trim();
      
      return text;
    } else if (fileExt === '.pdf') {
      // Extract text from PDF using pdf2json
      const PDFParser = require('pdf2json');
      
      return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();
        
        pdfParser.on('pdfParser_dataError', (errData: PDFErrorData) => {
          reject(new Error(errData.parserError));
        });
        
        pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
          try {
            // Extract text from parsed PDF data
            let text = '';
            if (pdfData.Pages) {
              pdfData.Pages.forEach((page) => {
                if (page.Texts) {
                  // Sort texts by position to maintain reading order
                  const sortedTexts = page.Texts.sort((a, b) => {
                    if (Math.abs(a.y - b.y) < 0.1) {
                      return a.x - b.x; // Same line, sort by x position
                    }
                    return a.y - b.y; // Different lines, sort by y position
                  });
                  
                  let currentLineY = null;
                  let lineText = '';
                  
                  for (let i = 0; i < sortedTexts.length; i++) {
                    const textItem = sortedTexts[i];
                    if (textItem.R) {
                      let itemText = '';
                      textItem.R.forEach((run) => {
                        if (run.T) {
                          itemText += decodeURIComponent(run.T);
                        }
                      });
                      
                      if (itemText.trim()) {
                        // Check if we're on a new line
                        if (currentLineY === null || Math.abs(textItem.y - currentLineY) > 0.1) {
                          // New line - add previous line to text if it exists
                          if (lineText.trim()) {
                            if (text.length > 0 && !text.endsWith('\n')) {
                              text += ' ';
                            }
                            text += lineText.trim();
                          }
                          lineText = itemText.trim();
                          currentLineY = textItem.y;
                        } else {
                          // Same line - always add a space between text items
                          lineText += ' ' + itemText.trim();
                        }
                      }
                    }
                  }
                  
                  // Add the last line
                  if (lineText.trim()) {
                    if (text.length > 0 && !text.endsWith('\n')) {
                      text += ' ';
                    }
                    text += lineText.trim();
                  }
                  text += '\n';
                }
              });
            }
            
            // Just clean up excessive whitespace from PDF extraction
            text = text
              .replace(/(\s)\s+/g, '$1')      // Collapse multiple spaces, preserving first
              .replace(/\n\s+/g, '\n')         // Remove leading spaces after newlines
              .replace(/\s+\n/g, '\n')         // Remove trailing spaces before newlines
              .replace(/\n{3,}/g, '\n\n')      // Multiple newlines to double newline
              .trim();
            
            resolve(text);
          } catch (error) {
            reject(error);
          }
        });
        
        pdfParser.parseBuffer(fileBuffer);
      });
    } else if (fileExt === '.docx') {
      // Extract text from DOCX using mammoth
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value;
    } else {
      throw new Error(`Unsupported file extension: ${fileExt}`);
    }
  } catch (error: any) {
    console.error(`Error extracting text from ${fileExt} file:`, error);
    throw new Error(`Failed to extract text from ${fileExt} file: ${error.message}`);
  }
}

// Function to extract images from file buffers
export async function extractImagesFromFile(fileBuffer: Buffer, fileExt: string, originalFilename: string): Promise<Array<{
  id: string;
  filename: string;
  base64: string;
  mimeType: string;
  analysis?: string;
}>> {
  const images: Array<{
    id: string;
    filename: string;
    base64: string;
    mimeType: string;
    analysis?: string;
  }> = [];

  try {
    if (fileExt === '.pdf') {
      // Extract images from PDF using pdf2json
      const PDFParser = require('pdf2json');
      
      return new Promise((resolve) => {
        const pdfParser = new PDFParser();
        
        pdfParser.on('pdfParser_dataError', () => {
          // If PDF parsing fails, return empty array
          resolve([]);
        });
        
        pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
          try {
            if (pdfData.Pages) {
              pdfData.Pages.forEach((page: any, pageIndex: number) => {
                if ((page as any).Images) {
                  (page as any).Images.forEach((image: any, imageIndex: number) => {
                    try {
                      // Extract image data if available
                      if (image.data) {
                        const imageId = `${Date.now()}-${pageIndex}-${imageIndex}`;
                        const filename = `${originalFilename}-page${pageIndex + 1}-img${imageIndex + 1}.png`;
                        
                        images.push({
                          id: imageId,
                          filename,
                          base64: `data:image/png;base64,${image.data}`,
                          mimeType: 'image/png',
                          analysis: `Image extracted from page ${pageIndex + 1} of ${originalFilename}`
                        });
                      }
                    } catch (imageError) {
                      console.warn(`Failed to extract image ${imageIndex} from page ${pageIndex}:`, imageError);
                    }
                  });
                }
              });
            }
            resolve(images);
          } catch (error) {
            console.warn('PDF image extraction error:', error);
            resolve([]);
          }
        });
        
        pdfParser.parseBuffer(fileBuffer);
      });
      
    } else if (fileExt === '.docx') {
      // Extract images from DOCX using mammoth
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        // Note: mammoth doesn't easily extract images, but we could enhance this
        // For now, return empty array for DOCX files
        return [];
      } catch (error) {
        console.warn('DOCX image extraction not implemented:', error);
        return [];
      }
    }
    
    return [];
  } catch (error) {
    console.warn('Image extraction failed:', error);
    return [];
  }
}

// Analyze brief content for text-based briefs
export const analyzeBriefText = async (content: string) => {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    let title = lines[0]?.trim() || `Brief - ${new Date().toLocaleDateString()}`;
    
    // Look for common brief indicators
    let category = 'general';
    const lowercaseContent = content.toLowerCase();
    if (lowercaseContent.includes('social media') || lowercaseContent.includes('instagram') || lowercaseContent.includes('facebook')) {
      category = 'social-media';
    } else if (lowercaseContent.includes('campaign') || lowercaseContent.includes('marketing')) {
      category = 'marketing';
    } else if (lowercaseContent.includes('product launch') || lowercaseContent.includes('new product')) {
      category = 'product-launch';
    }

    return {
      title: title,
      content: content,
      category: category,
      metadata: {
        wordCount: content.split(/\s+/).length,
        extractedAt: new Date().toISOString()
      }
    };
  } catch (error: any) {
    throw new Error(`Brief analysis failed: ${error.message}`);
  }
};

// Utility function to process a brief file
export const processBriefFile = async (filePath: string) => {
  try {
    const fileExt = path.extname(filePath).toLowerCase();
    let extractedText = '';
    
    const fileBuffer = await fs.promises.readFile(filePath);
    extractedText = await extractTextFromFile(fileBuffer, fileExt);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the file');
    }

    // Basic analysis - extract title and categorize
    const lines = extractedText.split('\n').filter(line => line.trim());
    let title = lines[0]?.trim() || `Brief - ${new Date().toLocaleDateString()}`;
    
    // Look for common brief indicators
    let category = 'general';
    const content = extractedText.toLowerCase();
    if (content.includes('social media') || content.includes('instagram') || content.includes('facebook')) {
      category = 'social-media';
    } else if (content.includes('campaign') || content.includes('marketing')) {
      category = 'marketing';
    } else if (content.includes('product launch') || content.includes('new product')) {
      category = 'product-launch';
    }
    
    return {
      title: title,
      content: extractedText,
      category: category,
      metadata: {
        wordCount: extractedText.split(/\s+/).length,
        extractedAt: new Date().toISOString(),
        fileExtension: fileExt
      }
    };
  } catch (error: any) {
    throw new Error(`Brief processing failed: ${error.message}`);
  }
};

// API endpoint to process a brief document and generate an image prompt
export const processBrief = async (req: Request, res: Response) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded or file buffer is empty' 
      });
    }
    
    // Get file buffer and extension
    const fileBuffer = req.file.buffer;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    // Extract text from the file buffer
    const extractedText = await extractTextFromFile(fileBuffer, fileExt);
    
    // Generate image prompt using AI
    const prompt = `
      You are an expert at translating creative briefs into effective image generation prompts.
      Analyze the following creative brief and create an optimized prompt for GPT Image model.
      Focus on extracting visual elements, style, mood, composition, and key themes.
      Your response should be a single, well-structured prompt that captures the essence of what's needed.
      
      Creative Brief:
      ${extractedText}
      
      Format your response as a complete image generation prompt that's ready to use.
      Don't include any commentary, explanations, or notes - just the optimized prompt.
    `;
    
    // Call OpenAI API with timeout handling and fallback
    let generatedPrompt = "";
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: "You are an expert at transforming creative briefs into effective image generation prompts. Your job is to extract the key visual elements from a creative brief and create a detailed, optimized prompt for image generation." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      generatedPrompt = completion.choices[0].message.content || "";
    } catch (aiError: any) {
      // If AI processing fails, provide a simplified fallback
      console.log('AI prompt generation failed, using fallback approach');
      generatedPrompt = `Professional image based on brief content: ${extractedText.substring(0, 150)}`;
    }
    
    // Return the results
    return res.status(200).json({
      success: true,
      content: extractedText,
      prompt: generatedPrompt
    });
    
  } catch (error: any) {
    console.error("Error processing brief:", error);
    
    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout') || error.message.includes('Request timed out')) {
      return res.status(408).json({
        success: false,
        message: 'Request timed out. The brief might be too complex. Try breaking it into smaller parts.',
        isTimeout: true
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process brief'
    });
  }
};