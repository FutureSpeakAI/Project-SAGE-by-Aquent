import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { extractTextFromFile } from './brief-processing';
import { chatWithPinecone } from './services/pinecone';
import { generateContent } from './gemini';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

// Configure multer for file upload
const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
});

// Interface for RFP processing results
export interface RFPResponse {
  uploadedFile: string;
  extractedQuestions: string[];
  responses: {
    question: string;
    pineconeSources: string[];
    generatedAnswer: string;
  }[];
  generatedAt: Date;
}

// Extract questions from text
function extractQuestions(text: string): string[] {
  const questions: string[] = [];
  const lines = text.split('\n');
  
  // Pattern 1: Direct questions (ending with ?)
  const directQuestions = text.match(/[^.!?]*\?/g) || [];
  questions.push(...directQuestions.map(q => q.trim()));
  
  // Pattern 2: Numbered items that look like requirements
  const numberedPattern = /^\s*\d+[\.)]\s*(.+)$/gm;
  let match;
  while ((match = numberedPattern.exec(text)) !== null) {
    const item = match[1].trim();
    // Check if it looks like a requirement or question
    if (item.length > 20 && (
      item.toLowerCase().includes('describe') ||
      item.toLowerCase().includes('provide') ||
      item.toLowerCase().includes('explain') ||
      item.toLowerCase().includes('detail') ||
      item.toLowerCase().includes('what') ||
      item.toLowerCase().includes('how') ||
      item.toLowerCase().includes('why') ||
      item.toLowerCase().includes('when') ||
      item.toLowerCase().includes('please') ||
      item.toLowerCase().includes('submit') ||
      item.toLowerCase().includes('include')
    )) {
      questions.push(item);
    }
  }
  
  // Pattern 3: Bullet points with requirement keywords
  const bulletPattern = /^\s*[•·\-\*]\s*(.+)$/gm;
  while ((match = bulletPattern.exec(text)) !== null) {
    const item = match[1].trim();
    if (item.length > 20 && (
      item.toLowerCase().includes('experience') ||
      item.toLowerCase().includes('capability') ||
      item.toLowerCase().includes('approach') ||
      item.toLowerCase().includes('methodology') ||
      item.toLowerCase().includes('solution') ||
      item.toLowerCase().includes('demonstrate')
    )) {
      questions.push(item);
    }
  }
  
  // Deduplicate and clean
  const uniqueQuestions = Array.from(new Set(questions))
    .filter(q => q.length > 10) // Filter out very short items
    .slice(0, 20); // Limit to 20 questions max for performance
  
  return uniqueQuestions;
}

// Search Pinecone for relevant content
async function searchPineconeForQuestion(question: string): Promise<{ sources: string[], error?: string }> {
  try {
    // Use Pinecone Assistant to search for relevant content
    const searchQuery = `Find relevant information for: ${question}`;
    const response = await chatWithPinecone([
      { role: 'user', content: searchQuery }
    ]);
    
    // Extract sources from the response
    const sources: string[] = [];
    if (response.sources) {
      response.sources.forEach((source: any) => {
        if (source.title) {
          sources.push(source.title);
        }
      });
    }
    
    return { sources };
  } catch (error) {
    console.error('Pinecone search error:', error);
    // Return empty sources with error flag
    return { 
      sources: [], 
      error: error instanceof Error ? error.message : 'Pinecone search failed' 
    };
  }
}

// Generate response for a question using matched content
async function generateResponseForQuestion(
  question: string, 
  sources: string[],
  useFallback: boolean = false
): Promise<string> {
  try {
    const systemPrompt = `You are an expert proposal writer for Aquent, a leading creative and marketing staffing company. 
Generate a professional, comprehensive response to the following RFP/RFI question.
${useFallback ? 'Note: Knowledge base search was unavailable for this question, so provide a general but professional response based on Aquent\'s typical capabilities.' : 'Use the provided source documents as reference, but ensure the response is coherent and well-structured.'}
Maintain Aquent's professional voice and highlight relevant capabilities.`;

    const userPrompt = useFallback 
      ? `Question: ${question}

Since the knowledge base is temporarily unavailable, please generate a professional response that:
1. Directly addresses the question
2. Highlights typical staffing and creative agency capabilities
3. Mentions common industry best practices
4. Maintains a confident, professional tone
5. Is structured and easy to read
6. Notes that specific details can be provided upon request`
      : `Question: ${question}

Available source references: ${sources.length > 0 ? sources.join(', ') : 'General Aquent knowledge base'}

Generate a detailed, professional response that:
1. Directly addresses the question
2. Highlights Aquent's relevant experience and capabilities
3. Provides specific examples where applicable
4. Maintains a confident, professional tone
5. Is structured and easy to read`;

    const response = await generateContent({
      model: 'gemini-2.0-flash',
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      temperature: 0.7
    });
    
    return response;
  } catch (error) {
    console.error('Response generation error:', error);
    return `[Error generating response for: ${question}]`;
  }
}

// Process uploaded RFP document
export async function processRFPDocument(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Extract text from the uploaded file
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const extractedText = await extractTextFromFile(req.file.buffer, fileExt);
      
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ error: 'Could not extract text from the document' });
      }

      // Extract questions/requirements
      const questions = extractQuestions(extractedText);
      
      if (questions.length === 0) {
        return res.status(400).json({ 
          error: 'No questions or requirements found in the document',
          suggestion: 'Please ensure the document contains numbered items, bullet points, or questions.'
        });
      }

      // Process each question
      console.log(`[RFP] Processing ${questions.length} questions from ${req.file.originalname}`);
      const responses = [];
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`[RFP] Processing question ${i + 1}/${questions.length}: ${question.substring(0, 50)}...`);
        
        try {
          // Search Pinecone for relevant content
          const pineconeResult = await searchPineconeForQuestion(question);
          
          // Check if Pinecone failed and use fallback if needed
          const useFallback = pineconeResult.error !== undefined;
          if (useFallback) {
            console.log(`[RFP] Pinecone unavailable for question ${i + 1}, using Gemini fallback`);
          }
          
          // Generate response (with fallback if Pinecone failed)
          const answer = await generateResponseForQuestion(
            question, 
            pineconeResult.sources, 
            useFallback
          );
          
          responses.push({
            question,
            pineconeSources: pineconeResult.sources,
            generatedAnswer: answer,
            usedFallback: useFallback
          });
          
          console.log(`[RFP] Completed question ${i + 1}/${questions.length}`);
        } catch (error) {
          console.error(`[RFP] Failed to process question ${i + 1}: ${error}`);
          // Add a basic response even if processing failed
          responses.push({
            question,
            pineconeSources: [],
            generatedAnswer: `[Unable to generate response for this question. Please contact support.]`,
            usedFallback: true
          });
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`[RFP] All questions processed. Sending response...`);

      // Prepare the response
      const rfpResponse: RFPResponse = {
        uploadedFile: req.file.originalname,
        extractedQuestions: questions,
        responses,
        generatedAt: new Date()
      };

      res.json(rfpResponse);
    } catch (error) {
      console.error('RFP processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process RFP document',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('RFP processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process RFP document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Generate DOCX document from RFP responses
export async function generateDocxFromResponses(req: Request, res: Response) {
  try {
    const { responses, uploadedFile } = req.body;
    
    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Invalid responses data' });
    }

    // For now, generate a rich text format (RTF) document as an alternative
    // (Proper DOCX generation would require a valid DOCX template file)
    let rtfContent = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}';
    rtfContent += '\\f0\\fs24 ';
    rtfContent += '{\\b\\fs32 AQUENT RFP RESPONSE}\\par\\par\n';
    rtfContent += 'Original Document: ' + (uploadedFile || 'Unknown') + '\\par\n';
    rtfContent += 'Generated: ' + new Date().toLocaleDateString() + '\\par\n';
    rtfContent += '\\par\\line\\par\n';
    
    // Add each response
    responses.forEach((r: any, index: number) => {
      rtfContent += '{\\b QUESTION ' + (index + 1) + ':}\\par\n';
      rtfContent += r.question + '\\par\\par\n';
      rtfContent += '{\\b RESPONSE:}\\par\n';
      rtfContent += r.generatedAnswer + '\\par\\par\n';
      rtfContent += '{\\i Sources: ' + (r.pineconeSources?.join(', ') || 'General knowledge') + '}\\par\n';
      rtfContent += '\\line\\par\n';
    });
    
    rtfContent += '\\par\n';
    rtfContent += '{\\i This response was generated using Aquent\\\'s knowledge base and AI assistance.\\par\n';
    rtfContent += 'Please review and customize before submission.}\\par\n';
    rtfContent += '}';

    // Send as RTF file (which can be opened in Word)
    res.setHeader('Content-Type', 'application/rtf');
    res.setHeader('Content-Disposition', `attachment; filename="RFP_Response_${Date.now()}.rtf"`);
    res.send(rtfContent);
    
  } catch (error) {
    console.error('DOCX generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate DOCX document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Generate PDF document from RFP responses
export async function generatePdfFromResponses(req: Request, res: Response) {
  try {
    const { responses, uploadedFile } = req.body;
    
    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Invalid responses data' });
    }

    // For now, generate a simple text-based PDF alternative
    // (Proper PDF generation would require fixing the pdfmake import issues)
    let textContent = 'AQUENT RFP RESPONSE\n';
    textContent += '===================\n\n';
    textContent += `Original Document: ${uploadedFile || 'Unknown'}\n`;
    textContent += `Generated: ${new Date().toLocaleDateString()}\n`;
    textContent += '\n----------------------------------------\n\n';
    
    // Add each response
    responses.forEach((r: any, index: number) => {
      textContent += `QUESTION ${index + 1}:\n`;
      textContent += `${r.question}\n\n`;
      textContent += `RESPONSE:\n`;
      textContent += `${r.generatedAnswer}\n\n`;
      textContent += `Sources: ${r.pineconeSources?.join(', ') || 'General knowledge'}\n`;
      textContent += '\n----------------------------------------\n\n';
    });
    
    textContent += '\nThis response was generated using Aquent\'s knowledge base and AI assistance.\n';
    textContent += 'Please review and customize before submission.\n';

    // Send as plain text file (PDF generation needs to be fixed separately)
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="RFP_Response_${Date.now()}.txt"`);
    res.send(textContent);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}