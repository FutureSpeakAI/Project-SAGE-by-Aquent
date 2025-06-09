import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Configure OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Function to extract text from a file buffer based on its extension
async function extractTextFromFile(fileBuffer: Buffer, fileExt: string): Promise<string> {
  try {
    if (fileExt === '.txt') {
      // For text files, convert buffer to string and clean up spacing
      let text = fileBuffer.toString('utf8');
      
      // Clean up excessive character spacing that may exist in source text
      text = text
        // Fix character-level spacing while preserving word boundaries
        .replace(/([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])(\s+[a-zA-Z])*/g, (match) => {
          return match.replace(/\s+/g, '');
        })
        // Restore proper word spacing by adding spaces before punctuation and common word patterns
        .replace(/([a-zA-Z])([A-Z][a-z])/g, '$1 $2')  // Add space before capitalized words
        .replace(/([a-z])([A-Z])/g, '$1 $2')          // Add space between camelCase
        .replace(/([a-zA-Z])(\()/g, '$1 $2')          // Add space before opening parenthesis
        .replace(/(\))([a-zA-Z])/g, '$1 $2')          // Add space after closing parenthesis
        .replace(/([a-zA-Z])(:)/g, '$1$2')            // Keep colons attached to words
        .replace(/(:)([A-Z])/g, '$1 $2')              // Add space after colons before capitals
        .replace(/([a-zA-Z])(●)/g, '$1 $2')           // Add space before bullet points
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')          // Add space before numbers
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')          // Add space after numbers
        .replace(/([a-zA-Z])(,)/g, '$1$2')            // Keep commas attached
        .replace(/(,)([a-zA-Z])/g, '$1 $2')           // Add space after commas
        .replace(/([a-zA-Z])(\.)/g, '$1$2')           // Keep periods attached
        .replace(/(\.)([A-Z])/g, '$1 $2')             // Add space after periods before capitals
        // Clean up multiple spaces
        .replace(/\s{2,}/g, ' ')
        .replace(/\n\s+/g, '\n')
        .replace(/\s+\n/g, '\n')
        .trim();
      
      return text;
    } else if (fileExt === '.pdf') {
      // Extract text from PDF using pdf2json
      const PDFParser = require('pdf2json');
      
      return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();
        
        pdfParser.on('pdfParser_dataError', (errData) => {
          reject(new Error(errData.parserError));
        });
        
        pdfParser.on('pdfParser_dataReady', (pdfData) => {
          try {
            // Extract text from parsed PDF data
            let text = '';
            if (pdfData.Pages) {
              pdfData.Pages.forEach(page => {
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
                      textItem.R.forEach(run => {
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
                          // Same line - check if items are adjacent
                          const nextItem = sortedTexts[i + 1];
                          const isAdjacent = !nextItem || 
                            Math.abs(nextItem.x - (textItem.x + (textItem.w || 0))) < 0.5;
                          
                          if (isAdjacent) {
                            lineText += itemText.trim();
                          } else {
                            lineText += ' ' + itemText.trim();
                          }
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
            
            // Aggressive cleanup of PDF extraction artifacts
            text = text
              .replace(/\s+/g, ' ')           // Multiple spaces to single space
              .replace(/\n\s+/g, '\n')        // Remove leading spaces after newlines
              .replace(/\s+\n/g, '\n')        // Remove trailing spaces before newlines
              .replace(/\n{3,}/g, '\n\n')     // Multiple newlines to double newline
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
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an expert at transforming creative briefs into effective image generation prompts. Your job is to extract the key visual elements from a creative brief and create a detailed, optimized prompt for image generation." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });
    
    // Extract the generated prompt from the response
    const generatedPrompt = completion.choices[0].message.content || "";
    
    // Return the results
    return res.status(200).json({
      success: true,
      content: extractedText,
      prompt: generatedPrompt
    });
    
  } catch (error: any) {
    console.error("Error processing brief:", error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process brief'
    });
  }
};