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
  
  // First, clean up excessive spacing in the text
  // This handles cases where every character is separated by spaces
  let cleanedText = text;
  
  // Check if text has excessive spacing (more than 40% spaces between letters)
  const letterSpacePattern = /([a-zA-Z])\s+([a-zA-Z])/g;
  const matches = cleanedText.match(letterSpacePattern);
  if (matches && matches.length > 10) {
    // Remove spaces between individual letters within words
    cleanedText = cleanedText.replace(/\b([A-Z])\s+([a-z])\s+/g, '$1$2');
    cleanedText = cleanedText.replace(/([a-zA-Z])\s+([a-zA-Z])/g, (match, p1, p2) => {
      // Keep space only if it looks like a word boundary
      if (p1.match(/[a-z]/) && p2.match(/[A-Z]/)) {
        return p1 + ' ' + p2; // Likely word boundary
      }
      return p1 + p2; // Same word, remove space
    });
    // Clean up remaining excessive spaces
    cleanedText = cleanedText.replace(/\s{2,}/g, ' ').trim();
  }
  
  const lines = cleanedText.split('\n');
  
  // Pattern 1: Direct questions (ending with ?)
  const directQuestions = cleanedText.match(/[^.!?]*\?/g) || [];
  questions.push(...directQuestions.map(q => q.trim()));
  
  // Pattern 2: Numbered items that look like requirements
  const numberedPattern = /^\s*\d+[\.)]\s*(.+)$/gm;
  let match;
  while ((match = numberedPattern.exec(cleanedText)) !== null) {
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
  while ((match = bulletPattern.exec(cleanedText)) !== null) {
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

    // Create a simple DOCX template programmatically
    const templateContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="44"/></w:rPr><w:t>AQUENT RFP RESPONSE</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Original Document: </w:t></w:r>
      <w:r><w:t>{uploadedFile}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Generated: </w:t></w:r>
      <w:r><w:t>{generatedDate}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    {#questions}
    <w:p>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>QUESTION {questionNumber}:</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{question}</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>RESPONSE:</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{answer}</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:i/><w:sz w:val="20"/></w:rPr><w:t>Sources: {sources}</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    {/questions}
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:i/><w:sz w:val="20"/></w:rPr>
        <w:t>This response was generated using Aquent's knowledge base and AI assistance.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:i/><w:sz w:val="20"/></w:rPr>
        <w:t>Please review and customize before submission.</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

    // Create minimal DOCX file structure
    const zip = new PizZip();
    
    // Add required DOCX structure
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);
    
    zip.file('word/document.xml', templateContent);
    
    // Initialize docxtemplater with the zip
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: (tag: string) => {
        return {
          get: (scope: any) => {
            if (tag === 'uploadedFile') return uploadedFile || 'Unknown';
            if (tag === 'generatedDate') return new Date().toLocaleDateString();
            return scope[tag];
          }
        };
      }
    });
    
    // Prepare data for template
    const data = {
      uploadedFile: uploadedFile || 'Unknown',
      generatedDate: new Date().toLocaleDateString(),
      questions: responses.map((r: any, index: number) => ({
        questionNumber: index + 1,
        question: r.question || '',
        answer: r.generatedAnswer || '',
        sources: r.pineconeSources?.join(', ') || 'General knowledge'
      }))
    };
    
    // Render the document
    doc.render(data);
    
    // Generate the DOCX buffer
    const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });
    
    // Send the DOCX file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="RFP_Response_${Date.now()}.docx"`);
    res.send(docxBuffer);
    
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

    // Use pdfmake to generate a proper PDF
    const PdfPrinter = require('pdfmake');
    const fonts = {
      Roboto: {
        normal: Buffer.from(''),
        bold: Buffer.from(''),
        italics: Buffer.from(''),
        bolditalics: Buffer.from('')
      }
    };
    
    const printer = new PdfPrinter(fonts);
    
    // Build document content
    const content: any[] = [
      {
        text: 'AQUENT RFP RESPONSE',
        style: 'header',
        alignment: 'center'
      },
      {
        text: '\n'
      },
      {
        text: [
          { text: 'Original Document: ', bold: true },
          { text: uploadedFile || 'Unknown' }
        ]
      },
      {
        text: [
          { text: 'Generated: ', bold: true },
          { text: new Date().toLocaleDateString() }
        ]
      },
      {
        text: '\n\n'
      }
    ];
    
    // Add each response
    responses.forEach((r: any, index: number) => {
      content.push({
        text: `QUESTION ${index + 1}:`,
        style: 'subheader',
        margin: [0, 10, 0, 5]
      });
      content.push({
        text: r.question,
        margin: [0, 0, 0, 10]
      });
      content.push({
        text: 'RESPONSE:',
        style: 'subheader',
        margin: [0, 5, 0, 5]
      });
      content.push({
        text: r.generatedAnswer,
        margin: [0, 0, 0, 10]
      });
      if (r.pineconeSources && r.pineconeSources.length > 0) {
        content.push({
          text: [
            { text: 'Sources: ', italics: true },
            { text: r.pineconeSources.join(', '), italics: true }
          ],
          fontSize: 10,
          color: '#666',
          margin: [0, 0, 0, 15]
        });
      }
      content.push({
        canvas: [
          {
            type: 'line',
            x1: 0, y1: 0,
            x2: 515, y2: 0,
            lineWidth: 0.5,
            lineColor: '#cccccc'
          }
        ],
        margin: [0, 10, 0, 10]
      });
    });
    
    content.push({
      text: '\n\nThis response was generated using Aquent\'s knowledge base and AI assistance.\nPlease review and customize before submission.',
      italics: true,
      fontSize: 10,
      color: '#666',
      alignment: 'center'
    });
    
    const docDefinition = {
      content: content,
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 14,
          bold: true
        }
      },
      defaultStyle: {
        fontSize: 12,
        lineHeight: 1.5
      }
    };
    
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="RFP_Response_${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    });
    
    pdfDoc.end();
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}