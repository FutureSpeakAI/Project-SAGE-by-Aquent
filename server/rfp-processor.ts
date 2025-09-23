import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { extractTextFromFile } from './brief-processing';
import { chatWithPinecone } from './services/pinecone';
// Removed Gemini import - using only Pinecone responses
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

// Get responses from Pinecone for all questions in a single query
async function getPineconeBatchResponse(questions: string[]): Promise<{ content: string, sources: string[], error?: string }> {
  try {
    // Format all questions into a single comprehensive prompt
    const batchPrompt = `Please provide comprehensive responses to the following RFP/RFI questions. For each question, provide a detailed answer based on the knowledge base.

${questions.map((q, i) => `QUESTION ${i + 1}: ${q}`).join('\n\n')}

Please structure your response with clear sections for each question, using "ANSWER TO QUESTION X:" as headers.`;
    
    console.log(`[Pinecone] Sending batch request with ${questions.length} questions`);
    
    // Send all questions to Pinecone in a single request
    const response = await chatWithPinecone([
      { role: 'user', content: batchPrompt }
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
    
    // Return Pinecone's actual content - DO NOT MODIFY
    return { 
      content: response.content || 'No response from Pinecone',
      sources 
    };
  } catch (error) {
    console.error('Pinecone batch error:', error);
    // Return error response
    return { 
      content: 'Unable to retrieve responses from knowledge base',
      sources: [], 
      error: error instanceof Error ? error.message : 'Pinecone failed' 
    };
  }
}

// This function is no longer needed - we use Pinecone's response directly
// Keeping stub for backward compatibility if needed
function formatPineconeResponse(content: string, sources: string[]): string {
  // Simply return Pinecone's content as-is - DO NOT MODIFY
  return content;
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

      // Process all questions in a single batch
      console.log(`[RFP] Processing ${questions.length} questions from ${req.file.originalname} in a single batch`);
      
      let responses = [];
      
      try {
        // Send ALL questions to Pinecone in a single query for speed
        const pineconeResult = await getPineconeBatchResponse(questions);
        
        if (pineconeResult.error) {
          console.log(`[RFP] Pinecone batch error: ${pineconeResult.error}`);
        }
        
        // Parse the batch response to extract individual answers
        const fullContent = pineconeResult.content;
        const allSources = pineconeResult.sources;
        
        // Split the response by question headers
        const answerPattern = /ANSWER TO QUESTION (\d+):\s*([\s\S]*?)(?=ANSWER TO QUESTION \d+:|$)/gi;
        const matches = Array.from(fullContent.matchAll(answerPattern));
        
        if (matches.length > 0) {
          // We found structured answers
          for (let i = 0; i < questions.length; i++) {
            const match = matches.find(m => parseInt(m[1]) === i + 1);
            if (match) {
              responses.push({
                question: questions[i],
                pineconeSources: allSources,
                generatedAnswer: match[2].trim()
              });
            } else {
              // No match found for this question number
              responses.push({
                question: questions[i],
                pineconeSources: allSources,
                generatedAnswer: `Answer not found in batch response for question ${i + 1}`
              });
            }
          }
        } else {
          // Fallback: If Pinecone didn't structure the response as expected,
          // return the full content for all questions
          console.log('[RFP] Pinecone response not structured as expected, using full content');
          for (const question of questions) {
            responses.push({
              question,
              pineconeSources: allSources,
              generatedAnswer: fullContent // Use the entire response
            });
            // Only use full content for first question, rest get a note
            if (responses.length === 1) continue;
            responses[responses.length - 1].generatedAnswer = 'See response to Question 1 for combined answer';
          }
        }
        
        console.log(`[RFP] Successfully processed batch response with ${responses.length} answers`);
        
      } catch (error) {
        console.error('[RFP] Failed to process batch:', error);
        // Fallback: create error responses for all questions
        for (const question of questions) {
          responses.push({
            question,
            pineconeSources: [],
            generatedAnswer: 'Error processing batch request to knowledge base',
            pineconeError: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      console.log(`[RFP] Batch processing completed. Sending response...`);

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