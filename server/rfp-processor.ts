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
const upload = multer({
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
}).single('file');

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
async function searchPineconeForQuestion(question: string): Promise<string[]> {
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
    
    return sources;
  } catch (error) {
    console.error('Pinecone search error:', error);
    return [];
  }
}

// Generate response for a question using matched content
async function generateResponseForQuestion(
  question: string, 
  sources: string[]
): Promise<string> {
  try {
    const systemPrompt = `You are an expert proposal writer for Aquent. 
Generate a professional, comprehensive response to the following RFP/RFI question.
Use the provided source documents as reference, but ensure the response is coherent and well-structured.
Maintain Aquent's professional voice and highlight relevant capabilities.`;

    const userPrompt = `Question: ${question}

Available source references: ${sources.join(', ')}

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
      const responses = [];
      for (const question of questions) {
        // Search Pinecone for relevant content
        const sources = await searchPineconeForQuestion(question);
        
        // Generate response
        const answer = await generateResponseForQuestion(question, sources);
        
        responses.push({
          question,
          pineconeSources: sources,
          generatedAnswer: answer
        });
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

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

    // Create a simple DOCX template
    const templateContent = `
      AQUENT RFP RESPONSE
      
      Original Document: {uploadedFile}
      Generated: {date}
      
      {#responses}
      ─────────────────────────────────────
      
      QUESTION {index}: {question}
      
      RESPONSE:
      {generatedAnswer}
      
      Sources: {pineconeSources}
      
      {/responses}
      
      ─────────────────────────────────────
      
      This response was generated using Aquent's knowledge base and AI assistance.
      Please review and customize before submission.
    `;

    // Create document data
    const docData = {
      uploadedFile: uploadedFile || 'Unknown',
      date: new Date().toLocaleDateString(),
      responses: responses.map((r: any, index: number) => ({
        index: index + 1,
        question: r.question,
        generatedAnswer: r.generatedAnswer,
        pineconeSources: r.pineconeSources.join(', ') || 'General knowledge'
      }))
    };

    // Generate DOCX
    const zip = new PizZip(Buffer.from(templateContent));
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });
    
    doc.render(docData);
    const buffer = doc.getZip().generate({ type: 'nodebuffer' });

    // Send the file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="RFP_Response_${Date.now()}.docx"`);
    res.send(buffer);
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

    // Build PDF content
    const content: any[] = [
      { text: 'AQUENT RFP RESPONSE', style: 'header', alignment: 'center' },
      { text: '\n' },
      { text: `Original Document: ${uploadedFile || 'Unknown'}`, style: 'subheader' },
      { text: `Generated: ${new Date().toLocaleDateString()}`, style: 'subheader' },
      { text: '\n\n' }
    ];

    // Add each response
    responses.forEach((r: any, index: number) => {
      content.push(
        { text: `Question ${index + 1}:`, style: 'questionHeader' },
        { text: r.question, style: 'question', margin: [0, 5, 0, 10] },
        { text: 'Response:', style: 'responseHeader' },
        { text: r.generatedAnswer, style: 'response', margin: [0, 5, 0, 10] },
        { 
          text: `Sources: ${r.pineconeSources.join(', ') || 'General knowledge'}`, 
          style: 'sources',
          margin: [0, 5, 0, 20]
        }
      );
    });

    // Add footer
    content.push(
      { text: '\n\n' },
      { 
        text: 'This response was generated using Aquent\'s knowledge base and AI assistance. Please review and customize before submission.',
        style: 'footer',
        alignment: 'center'
      }
    );

    // Define document
    const documentDefinition = {
      content,
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          color: '#F15A22'
        },
        subheader: {
          fontSize: 12,
          color: '#666666'
        },
        questionHeader: {
          fontSize: 14,
          bold: true,
          color: '#F15A22'
        },
        question: {
          fontSize: 12,
          italics: true,
          color: '#333333'
        },
        responseHeader: {
          fontSize: 12,
          bold: true,
          margin: [0, 10, 0, 5]
        },
        response: {
          fontSize: 11,
          alignment: 'justify',
          lineHeight: 1.5
        },
        sources: {
          fontSize: 9,
          color: '#666666',
          italics: true
        },
        footer: {
          fontSize: 9,
          color: '#999999',
          italics: true
        }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    // Generate PDF
    const pdfMakePrinter = require('pdfmake');
    const fonts = {
      Roboto: {
        normal: 'node_modules/pdfmake/build/vfs_fonts.js',
        bold: 'node_modules/pdfmake/build/vfs_fonts.js',
        italics: 'node_modules/pdfmake/build/vfs_fonts.js',
        bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js'
      }
    };
    
    const printer = new pdfMakePrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(documentDefinition);
    
    // Stream the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="RFP_Response_${Date.now()}.pdf"`);
    
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}