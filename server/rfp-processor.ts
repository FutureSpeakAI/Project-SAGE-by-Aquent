import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { extractTextFromFile } from './brief-processing';
import { chatWithPinecone, chatWithPineconeRaw } from './services/pinecone';
import { generateContent } from './gemini';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import PdfPrinter from 'pdfmake';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

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

// Clean malformed text using AI (for PDF extraction issues)
async function cleanMalformedText(text: string): Promise<string> {
  try {
    // Check if text has spacing issues
    const hasSpacingIssues = 
      // Character-level spacing: "W h o   i n   y o u r"
      /[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]/.test(text.substring(0, 500)) ||
      // Words joined together: "Whatarethecorporate"
      /[a-z]{20,}/.test(text.substring(0, 500));
    
    if (!hasSpacingIssues) {
      console.log('[RFP] Text appears correctly formatted, skipping AI cleanup');
      return text;
    }
    
    console.log('[RFP] Detected malformed text, using AI to clean up spacing issues');
    
    // Use Gemini to fix the text
    const cleanupPrompt = `Fix the spacing in the following text. The text has been extracted from a PDF and has incorrect spacing between letters and words. 
    
Please return ONLY the corrected text with proper spacing, without any explanation or additional commentary. Fix issues like:
- Letters separated by spaces: "W h o   i n   y o u r" should become "Who in your"  
- Words joined together: "Whatarethecorporate" should become "What are the corporate"

Text to fix:
${text}`;

    const cleanedText = await generateContent({
      model: 'gemini-2.0-flash',
      prompt: cleanupPrompt,
      systemPrompt: 'You are a text correction assistant. Fix spacing issues in text and return only the corrected text.'
    });
    
    console.log('[RFP] AI cleanup completed successfully');
    return cleanedText;
    
  } catch (error) {
    console.error('[RFP] Failed to clean text with AI, using original:', error);
    return text; // Fallback to original text if AI fails
  }
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
    // Use the SAGE-specific prompt for Pinecone interactions
    const batchPrompt = `You are SAGE, Aquent's assistant for drafting RFP/RFI responses with retrieval-augmented generation.

Your job:
Use the retrieved context to write concise, executive-tone answers to the user's questions.
Every factual statement must be backed by a numbered footnote, and each source should be listed only once, at the end.

Instructions:
- Retrieve the most relevant passages.
- Write the response in short paragraphs or bullets.
- Inside the body, mark citations with superscript numeric footnotes like this: Aquent's headquarters is in Boston[^1].
- Re-use the same number each time the same document supports multiple claims.
- After the body, add a Sources section listing each unique source one time only, in the order of first appearance.
• Format each entry as: [^1]: Document Title
• Do not include URLs or markdown link syntax in the sources

Style:
- Executive/proposal voice
- Direct and concise

Please answer the following RFP/RFI questions:

${questions.map((q, i) => `QUESTION ${i + 1}: ${q}`).join('\n\n')}

Structure your response with clear sections for each question, using "ANSWER TO QUESTION X:" as headers.`;
    
    console.log(`[RFP] Sending enhanced batch request with ${questions.length} questions`);
    
    // Use the RAW Pinecone function to get exact response without processing
    const rawResponse = await chatWithPineconeRaw([
      { role: 'user', content: batchPrompt }
    ]);
    
    console.log(`[RFP] Received raw Pinecone response`);
    
    // Log the structure to understand what Pinecone is returning
    console.log('[RFP] Raw response structure:', {
      hasMessage: !!rawResponse.message,
      hasCitations: !!rawResponse.citations,
      citationsCount: rawResponse.citations?.length || 0,
      messageKeys: rawResponse.message ? Object.keys(rawResponse.message) : [],
      firstCitation: rawResponse.citations?.[0] ? JSON.stringify(rawResponse.citations[0], null, 2) : 'none'
    });
    
    // Extract the raw content directly from Pinecone's response
    // This is the EXACT content without any modification
    const content = rawResponse.message?.content || 'No response from Pinecone';
    
    // Extract sources if available (for backward compatibility)
    // Note: With the new executive prompt, sources are already in the content
    const sources: string[] = [];
    if (rawResponse.citations) {
      rawResponse.citations.forEach((citation: any) => {
        if (citation.references) {
          citation.references.forEach((ref: any) => {
            if (ref.file?.name) {
              sources.push(ref.file.name);
            }
          });
        }
      });
    }
    
    // Return the EXACT content from Pinecone without any processing
    return { 
      content,
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
      let extractedText = await extractTextFromFile(req.file.buffer, fileExt);
      
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ error: 'Could not extract text from the document' });
      }

      // Clean up malformed text if needed (for PDF extraction issues)
      extractedText = await cleanMalformedText(extractedText);

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

    // Create a new document with proper Word formatting
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: 'AQUENT RFP RESPONSE',
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
              },
            }),
            // Metadata
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Original Document: ',
                  bold: true,
                }),
                new TextRun({
                  text: uploadedFile || 'Unknown',
                }),
              ],
              spacing: {
                after: 200,
              },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Generated: ',
                  bold: true,
                }),
                new TextRun({
                  text: new Date().toLocaleDateString(),
                }),
              ],
              spacing: {
                after: 400,
              },
            }),
            // Add responses
            ...responses.flatMap((r: any, index: number) => [
              // Question heading
              new Paragraph({
                text: `QUESTION ${index + 1}`,
                heading: HeadingLevel.HEADING_1,
                spacing: {
                  before: 400,
                  after: 200,
                },
              }),
              // Question text
              new Paragraph({
                text: r.question,
                spacing: {
                  after: 200,
                },
              }),
              // Response heading
              new Paragraph({
                text: 'RESPONSE',
                heading: HeadingLevel.HEADING_2,
                spacing: {
                  before: 200,
                  after: 200,
                },
              }),
              // Response text - handle multi-line responses
              ...r.generatedAnswer.split('\n').map((paragraph: string) => 
                new Paragraph({
                  text: paragraph || ' ',
                  spacing: {
                    after: 100,
                  },
                })
              ),
              // Sources
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Sources: ',
                    bold: true,
                    italics: true,
                  }),
                  new TextRun({
                    text: r.pineconeSources?.join(', ') || 'General knowledge',
                    italics: true,
                  }),
                ],
                spacing: {
                  before: 200,
                  after: 400,
                },
              }),
            ]),
            // Footer note
            new Paragraph({
              children: [
                new TextRun({
                  text: 'This response was generated using Aquent\'s knowledge base and AI assistance.',
                  italics: true,
                }),
              ],
              spacing: {
                before: 600,
              },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Please review and customize before submission.',
                  italics: true,
                }),
              ],
            }),
          ],
        },
      ],
    });

    // Generate the DOCX buffer
    const buffer = await Packer.toBuffer(doc);

    // Send as proper DOCX file
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

    // Define fonts for pdfmake - use default Helvetica fonts
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    const printer = new PdfPrinter(fonts);

    // Build content array for PDF
    const content: any[] = [
      // Title
      {
        text: 'AQUENT RFP RESPONSE',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      // Metadata
      {
        text: [
          { text: 'Original Document: ', bold: true },
          { text: uploadedFile || 'Unknown' }
        ],
        margin: [0, 0, 0, 10]
      },
      {
        text: [
          { text: 'Generated: ', bold: true },
          { text: new Date().toLocaleDateString() }
        ],
        margin: [0, 0, 0, 30]
      },
    ];

    // Add each response
    responses.forEach((r: any, index: number) => {
      // Add page break between responses (except for the first one)
      if (index > 0) {
        content.push({ text: '', pageBreak: 'before' });
      }

      content.push(
        // Question heading
        {
          text: `QUESTION ${index + 1}`,
          style: 'subheader',
          margin: [0, 0, 0, 10]
        },
        // Question text
        {
          text: r.question,
          margin: [0, 0, 0, 15]
        },
        // Response heading
        {
          text: 'RESPONSE',
          style: 'responseHeader',
          margin: [0, 0, 0, 10]
        },
        // Response text - handle multi-line responses
        {
          text: r.generatedAnswer,
          alignment: 'justify',
          margin: [0, 0, 0, 15]
        },
        // Sources
        {
          text: [
            { text: 'Sources: ', bold: true, italics: true },
            { text: r.pineconeSources?.join(', ') || 'General knowledge', italics: true }
          ],
          fontSize: 10,
          margin: [0, 0, 0, 20]
        }
      );
    });

    // Add footer note
    content.push(
      {
        text: 'This response was generated using Aquent\'s knowledge base and AI assistance.',
        italics: true,
        fontSize: 10,
        margin: [0, 30, 0, 5]
      },
      {
        text: 'Please review and customize before submission.',
        italics: true,
        fontSize: 10
      }
    );

    // Define PDF document structure
    const docDefinition = {
      content: content,
      styles: {
        header: {
          fontSize: 22,
          bold: true
        },
        subheader: {
          fontSize: 16,
          bold: true
        },
        responseHeader: {
          fontSize: 14,
          bold: true
        }
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 12,
        lineHeight: 1.5
      },
      pageMargins: [40, 60, 40, 60] as [number, number, number, number]
    };

    // Generate PDF
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    // Collect PDF data
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    pdfDoc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      
      // Send as proper PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="RFP_Response_${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    });

    // Finalize PDF
    pdfDoc.end();
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}