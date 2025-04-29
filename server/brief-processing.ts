import multer from 'multer';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import util from 'util';
import OpenAI from 'openai';

// Configure OpenAI API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure upload settings
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit to 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF, DOCX, TXT files
    const filetypes = /pdf|docx|txt/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only .pdf, .docx, or .txt files are allowed"));
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

// Function to extract text from a file based on its extension
async function extractTextFromFile(filePath: string, fileExt: string): Promise<string> {
  if (fileExt === '.txt') {
    // For text files, just read the contents
    return fs.readFileSync(filePath, 'utf8');
  } else if (fileExt === '.pdf' || fileExt === '.docx') {
    // For simplicity, we'll just return the file path for now
    // In a real implementation, you would use libraries like pdf-parse or mammoth
    // to extract text from PDFs and DOCXs
    return `Content from ${path.basename(filePath)}. For demonstration purposes, we're simulating text extraction from ${fileExt} file.`;
  } else {
    throw new Error(`Unsupported file extension: ${fileExt}`);
  }
}

// API endpoint to process a brief document and generate an image prompt
export const processBrief = async (req: Request, res: Response) => {
  try {
    // Handle file upload
    await uploadFilePromise(req, res);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }
    
    // Get file path and extension
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    // Extract text from the file
    const extractedText = await extractTextFromFile(filePath, fileExt);
    
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
    
    // Clean up - remove the uploaded file after processing
    fs.unlinkSync(filePath);
    
    // Return the results
    return res.status(200).json({
      success: true,
      content: extractedText,
      prompt: generatedPrompt
    });
    
  } catch (error: any) {
    console.error("Error processing brief:", error);
    
    // Clean up any uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process brief'
    });
  }
};