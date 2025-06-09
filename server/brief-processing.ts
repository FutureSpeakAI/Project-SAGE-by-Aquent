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
      // This handles extreme cases where EVERY character is separated by spaces
      
      // First, check if this is the extreme spacing case (more than 50% of characters are spaces)
      const spaceRatio = (text.match(/\s/g) || []).length / text.length;
      
      if (spaceRatio > 0.5) {
        // Extreme spacing case - reconstruct the text character by character
        text = text
          // Remove all spaces first, then intelligently add them back
          .replace(/\s+/g, '')
          // Add spaces before capital letters (primary word boundaries)
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          // Add spaces before numbers
          .replace(/([a-zA-Z])(\d)/g, '$1 $2')
          .replace(/(\d)([a-zA-Z])/g, '$1 $2')
          // Add spaces around punctuation
          .replace(/([a-zA-Z])([:\(\)\[\].,;!?])/g, '$1 $2')
          .replace(/([:\(\)\[\].,;!?])([a-zA-Z])/g, '$1 $2')
          // Add spaces around bullet points and special characters
          .replace(/([a-zA-Z])(●|•|\*)/g, '$1 $2')
          .replace(/(●|•|\*)([a-zA-Z])/g, '$1 $2')
          // Add spaces around em dashes and hyphens
          .replace(/([a-zA-Z])(–|—|-{2,})/g, '$1 $2')
          .replace(/(–|—|-{2,})([a-zA-Z])/g, '$1 $2')
          // Comprehensive word boundary restoration using common English patterns
          .replace(/(patients|treatment|care|health|clinical|medical|provider|providers|email|campaign|content|message|data|guide|insights|deliverables|objectives|audience|metrics)([a-z]+)/gi, '$1 $2')
          .replace(/([a-z]+)(patients|treatment|care|health|clinical|medical|provider|providers|email|campaign|content|message|data|guide|insights|deliverables|objectives|audience|metrics)/gi, '$1 $2')
          .replace(/(live|breathe|experience|educate|reduce|improve|build|drive|engage|request|review|download|delivered|helping|designed|proven|targeting|capturing)([a-z]+)/gi, '$1 $2')
          .replace(/([a-z]+)(live|breathe|experience|educate|reduce|improve|build|drive|engage|request|review|download|delivered|helping|designed|proven|targeting|capturing)/gi, '$1 $2')
          .replace(/(longer|easier|fewer|novel|measurable|clinical|educational|conversational|friendly|clear|compelling|respectful|empathetic)([a-z]+)/gi, '$1 $2')
          .replace(/([a-z]+)(longer|easier|fewer|novel|measurable|clinical|educational|conversational|friendly|clear|compelling|respectful|empathetic)/gi, '$1 $2')
          // Handle common function words that get attached
          .replace(/(and|or|of|in|on|at|to|for|with|by|from|the|a|an|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|must)([a-z]+)/gi, '$1 $2')
          .replace(/([a-z]+)(and|or|of|in|on|at|to|for|with|by|from|the|a|an|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|must)/gi, '$1 $2')
          // Handle medical/business acronyms
          .replace(/COPD([a-z])/gi, 'COPD $1')
          .replace(/HCP([a-z])/gi, 'HCP $1')
          .replace(/([a-z])COPD/gi, '$1 COPD')
          .replace(/([a-z])HCP/gi, '$1 HCP')
          // Handle special cases like "C O P D" -> "COPD"
          .replace(/\b([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\b/g, '$1$2$3$4')
          .replace(/\b([A-Z])\s+([A-Z])\s+([A-Z])\b/g, '$1$2$3')
          .replace(/\b([A-Z])\s+([A-Z])\b/g, '$1$2')
          // Clean up
          .replace(/\s{2,}/g, ' ')
          .replace(/\s+([:\(\)\[\].,;!?])/g, '$1')
          .replace(/([:\(\)\[\].,;!?])\s{2,}/g, '$1 ')
          .trim();
      } else {
        // Regular spacing cleanup for less severe cases
        text = text
          .replace(/([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])(\s+[a-zA-Z])*/g, (match) => {
            return match.replace(/\s+/g, '');
          })
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/\s{2,}/g, ' ')
          .replace(/\n\s+/g, '\n')
          .replace(/\s+\n/g, '\n')
          .trim();
      }
      
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