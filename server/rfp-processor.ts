import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { extractTextFromFile } from './brief-processing';
import { chatWithPinecone, chatWithPineconeRaw } from './services/pinecone';
import { generateContent } from './gemini';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import PdfPrinter from 'pdfmake';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ExternalHyperlink } from 'docx';

// Configure multer for file upload
const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.txt', '.xlsx', '.xls', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, TXT, XLSX, XLS, and PPTX files are allowed.'));
    }
  }
});

// Interface for RFP processing results
export interface RFPResponse {
  uploadedFile: string;
  extractedQuestions: string[];
  responses: {
    question: string;
    pineconeSources: Array<{ name: string; url?: string }>;
    generatedAnswer: string;
  }[];
  generatedAt: Date;
  extractionMetadata?: ExtractionMetadata; // Optional metadata for debugging
}

// Enhanced text preprocessing and reconstruction for all document types
async function cleanMalformedText(text: string): Promise<string> {
  try {
    console.log('[RFP] Starting text preprocessing and reconstruction...');
    
    // Step 1: Remove common PDF artifacts
    let processedText = removePDFArtifacts(text);
    
    // Step 2: Fix table formatting issues
    processedText = fixTableFormatting(processedText);
    
    // Step 3: Always use AI to reconstruct questions from potentially fragmented text
    // This is especially important for Excel files where questions might span multiple cells
    console.log('[RFP] Using AI to reconstruct complete questions from potentially fragmented text');
    
    // Use Gemini to reconstruct the document with complete questions
    const reconstructionPrompt = `You are processing an RFP document that may have questions fragmented across cells, rows, or sections. Your task is to reconstruct complete, coherent questions from this potentially fragmented text.

Common patterns you'll see:
1. Questions split across Excel cells: "What is your experience with" | "implementing creative solutions"
2. Questions with parts in different rows or columns
3. Questions where the main question is in one place and sub-parts are elsewhere
4. Tables where column headers + row headers form the complete question
5. Numbered sections where the number is separate from the question text
6. Character-level spacing issues: "W h o   i n   y o u r" (fix to "Who in your")
7. Words joined together: "Whatarethecorporate" (fix to "What are the corporate")

Your task:
1. Identify all question fragments and reconstruct them into complete questions
2. Preserve the meaning and intent of each question
3. Keep questions in their original order
4. Fix any spacing or formatting issues
5. If you see partial questions like "What is your experience with..." look for the continuation nearby
6. For tables, combine headers and cells to form complete questions when appropriate
7. Maintain section headers and question numbers if present

IMPORTANT: 
- Return the reconstructed document with complete questions
- Preserve non-question content (instructions, context, etc.)
- Do not add any commentary or explanations
- Focus on making questions complete and readable

Document to reconstruct:
${processedText}`;

    const cleanedText = await generateContent({
      model: 'gemini-2.0-flash',
      prompt: reconstructionPrompt,
      systemPrompt: 'You are an RFP document reconstruction expert. Your job is to take fragmented text (especially from Excel files) and reconstruct it into a clean document with complete questions. Return only the reconstructed text without any commentary.',
      temperature: 0.3 // Slightly higher than extraction to allow for reconstruction creativity
    });
    
    console.log('[RFP] AI reconstruction completed successfully');
    return cleanedText;
    
  } catch (error) {
    console.error('[RFP] Failed to reconstruct text with AI, using preprocessed text:', error);
    return removePDFArtifacts(text); // At least return text with artifacts removed
  }
}

// Remove common PDF artifacts
function removePDFArtifacts(text: string): string {
  console.log('[RFP] Removing PDF artifacts...');
  
  // Remove page headers/footers (common patterns)
  let cleaned = text
    // Remove page numbers at the beginning or end of lines
    .replace(/^Page\s+\d+\s*(?:of\s+\d+)?$/gim, '')
    .replace(/^\d+\s*(?:of\s+\d+)?$/gm, '')
    .replace(/^-\s*\d+\s*-$/gm, '')
    
    // Remove common header/footer patterns
    .replace(/^(?:CONFIDENTIAL|PROPRIETARY|DRAFT|INTERNAL USE ONLY).*$/gim, '')
    .replace(/^©.*\d{4}.*$/gm, '') // Copyright lines
    .replace(/^All rights reserved.*$/gim, '')
    
    // Remove date stamps that appear as headers/footers
    .replace(/^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/gim, '')
    .replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/gm, '')
    
    // Remove document reference numbers that appear repeatedly
    .replace(/^RFP[-#]\d+.*$/gm, '')
    .replace(/^Document\s+(?:ID|Number|#)[:]\s*[\w-]+$/gim, '')
    
    // Remove empty lines and excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    
    // Fix broken words at line ends (hyphenation)
    .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
    
    // Fix sentences broken across lines (but preserve paragraph breaks)
    .replace(/([a-z,])\s*\n\s*([a-z])/g, '$1 $2')
    
    // Remove watermark-style text
    .replace(/\[DRAFT\]/gi, '')
    .replace(/\[SAMPLE\]/gi, '')
    .replace(/\[TEMPLATE\]/gi, '');
  
  // Remove lines that are just section dividers
  cleaned = cleaned
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // Remove lines that are just dashes, equals, underscores, etc.
      return !(
        /^[-=_*]{3,}$/.test(trimmed) ||
        /^[•·▪▫◦‣⁃]{1,3}$/.test(trimmed) ||
        trimmed === ''
      );
    })
    .join('\n');
  
  return cleaned;
}

// Fix table formatting issues
function fixTableFormatting(text: string): string {
  console.log('[RFP] Fixing table formatting...');
  
  // Detect and reformat table-like content
  const lines = text.split('\n');
  const processedLines: string[] = [];
  let inTable = false;
  let tableBuffer: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect table boundaries (lines with multiple | or tab separators)
    const hasTableDelimiters = (line.match(/\|/g) || []).length >= 2 || 
                               (line.match(/\t/g) || []).length >= 2;
    
    // Check if line looks like table content
    const looksLikeTableContent = hasTableDelimiters || 
      /^\s*\d+\.\d+\s+/.test(line) || // Numbered sections like "1.1 "
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*[:]\s*\S/.test(trimmed); // Headers with colons
    
    if (looksLikeTableContent && !inTable) {
      inTable = true;
      tableBuffer = [line];
    } else if (inTable && looksLikeTableContent) {
      tableBuffer.push(line);
    } else if (inTable && !looksLikeTableContent) {
      // End of table, process the buffer
      processedLines.push(...processTableBuffer(tableBuffer));
      processedLines.push(line);
      inTable = false;
      tableBuffer = [];
    } else {
      processedLines.push(line);
    }
  }
  
  // Process any remaining table content
  if (tableBuffer.length > 0) {
    processedLines.push(...processTableBuffer(tableBuffer));
  }
  
  return processedLines.join('\n');
}

// Process table buffer to clean up table formatting
function processTableBuffer(buffer: string[]): string[] {
  if (buffer.length === 0) return [];
  
  // For simple tables, just clean up spacing
  return buffer.map(line => {
    // Replace multiple spaces/tabs with single space for readability
    return line.replace(/\s{2,}/g, ' ').replace(/\t+/g, ' ');
  });
}

// AI-powered question extraction using Gemini
async function extractQuestionsWithAI(text: string): Promise<string[]> {
  try {
    console.log('[RFP] Using AI to extract questions from document');
    
    // Create a comprehensive prompt for Gemini to extract all questions and requirements
    const extractionPrompt = `You are an expert RFP analyst. Your job is to identify ONLY the items in this RFP that require vendors to provide information about their company, capabilities, or proposed solution.

CRITICAL RULES FOR EXCLUSION:
✗ NEVER include section headers like "Provide responses to the following questions..."
✗ NEVER include standalone field labels like "Total Number of Employees:" without context
✗ NEVER include partial table cells like "Competitor # 1: Estimated Market Share (%)"
✗ NEVER include instructions or navigation text
✗ NEVER include formatting directions

WHAT TO INCLUDE - COMPLETE QUESTIONS ONLY:
✓ Full questions that request specific vendor information
✓ Complete requirements with clear context
✓ Questions that combine field labels with their context (e.g., "What is your company's total number of employees?")
✓ Requirements that specify what the vendor must demonstrate

EXAMPLES OF WHAT TO EXCLUDE:
❌ "Provide responses to the following questions that address your company's operations" → Section header
❌ "Total Number of Employees:" → Incomplete field label
❌ "2020 Annual Gross Sales:" → Standalone data field
❌ "Competitor # 1: Competitor Name" → Partial table cell
❌ "Reference # 1: Company Name" → Table field without context
❌ "Cash (Cash & Equivalents)" → Financial line item

EXAMPLES OF WHAT TO INCLUDE:
✅ "Is your company a certified diverse supplier (MBE, WBE, VBE, etc.)?"
✅ "How many active, W-2 employees do you currently have in your workforce?"
✅ "Who are your top three competitors? Also, describe your competitive market share relative to these competitors."
✅ "Indicate whether your company would enter into any conflicts of interest by conducting business with CVS Health."
✅ "Describe your company's experience implementing similar solutions in the retail sector."

QUALITY CHECK:
Before including any item, ask yourself:
1. Is this a complete, standalone question that makes sense without additional context?
2. Does it clearly ask for specific information from the vendor?
3. Could a vendor reasonably provide a meaningful response to this item alone?

If the answer to ANY of these is NO, exclude it.

Return a JSON array of strings containing ONLY the complete vendor questions/requirements you found.
Maximum 50 items (prioritize the most substantial and complete questions).

Format: ["question 1", "question 2", "question 3", ...]

Document to analyze:
${text}`;

    // Call Gemini to extract questions
    const aiResponse = await generateContent({
      model: 'gemini-2.0-flash',
      prompt: extractionPrompt,
      systemPrompt: 'You are an RFP analysis expert. Extract questions and requirements from documents accurately and completely. Return only valid JSON arrays.',
      temperature: 0.2 // Lower temperature for more consistent extraction
    });
    
    console.log('[RFP] AI extraction completed, parsing response');
    
    // Parse the AI response
    let questions: string[] = [];
    
    try {
      // Try to find and parse JSON array in the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
        
        // Validate that we got an array of strings
        if (!Array.isArray(questions) || !questions.every(q => typeof q === 'string')) {
          throw new Error('Invalid response format from AI');
        }
      } else {
        // Fallback: Try parsing the entire response as JSON
        questions = JSON.parse(aiResponse);
      }
      
      // Clean and validate questions with additional filtering
      questions = questions
        .filter(q => typeof q === 'string' && q.trim().length > 10)
        .map(q => q.trim())
        .filter(q => {
          // Additional filter to remove obvious non-questions
          const lower = q.toLowerCase();
          
          // Exclude section headers
          if (lower.includes('provide responses to') || 
              lower.includes('answer the following') ||
              lower.includes('complete the following') ||
              lower.includes('fill out the') ||
              lower.startsWith('section ')) {
            return false;
          }
          
          // Exclude standalone field labels (ends with colon, no question mark, very short)
          if (q.endsWith(':') && !q.includes('?') && q.length < 50) {
            return false;
          }
          
          // Exclude partial table cells with specific patterns
          if (/^(competitor|reference|year|quarter)\s*#?\s*\d+\s*:/i.test(q)) {
            return false;
          }
          
          // Exclude financial line items
          if (/^(cash|assets|liabilities|revenue|equity|sales)(\s+\([^)]+\))?:?\s*$/i.test(q)) {
            return false;
          }
          
          // Exclude date/year fields
          if (/^\d{4}\s+(annual|quarterly|monthly)?\s*(gross|net)?\s*(sales|revenue|income):?\s*$/i.test(q)) {
            return false;
          }
          
          // Must have substantive content - either a question mark or be a clear requirement/instruction
          const hasQuestionMark = q.includes('?');
          const isRequirement = /\b(provide|describe|explain|list|submit|indicate|demonstrate|outline|specify|detail|include)\b/i.test(q);
          
          return hasQuestionMark || isRequirement;
        })
        .slice(0, 50); // Limit to 50 questions max
      
      console.log(`[RFP] After filtering: ${questions.length} valid questions`);
      
      // Return whatever AI found (even if empty)
      return questions;
      
    } catch (parseError) {
      console.error('[RFP] Failed to parse AI response as JSON:', parseError);
      console.log('[RFP] AI Response (first 500 chars):', aiResponse.substring(0, 500));
      // Return empty array on parse error - no fallback to regex
      return [];
    }
    
  } catch (error) {
    console.error('[RFP] AI question extraction failed:', error);
    // Return empty array on AI error - no fallback to regex
    return [];
  }
}

// Enhanced regex-based extraction as fallback
function extractQuestionsWithRegex(text: string): string[] {
  console.log('[RFP] Using enhanced regex-based question extraction (fallback)');
  const questions: string[] = [];
  const extractedSet = new Set<string>(); // Use Set to avoid duplicates from the start
  
  // Pattern 1: Direct questions (ending with ?)
  const directQuestions = text.match(/[^.!?]*\?/g) || [];
  directQuestions.forEach(q => {
    const cleaned = q.trim();
    if (cleaned.length > 15) {
      extractedSet.add(cleaned);
    }
  });
  
  // Pattern 2: Imperative statements starting with action verbs
  const imperativePatterns = [
    /\b(Describe|Explain|Provide|List|Detail|Outline|Demonstrate|Show|Illustrate|Specify|Identify|Define|Present|Document|Submit|Include|Attach|Confirm|Verify|Certify|State|Indicate|Clarify)\s+[^.!?]+[.!]/gi,
    /\b(Please\s+(?:provide|describe|explain|list|detail|submit|include|confirm|specify|indicate|clarify))\s+[^.!?]+[.!]/gi
  ];
  
  imperativePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const cleaned = match.trim();
      if (cleaned.length > 20) {
        extractedSet.add(cleaned);
      }
    });
  });
  
  // Pattern 3: Vendor/contractor requirements (filter out RFP process rules)
  const vendorPatterns = [
    // Match vendor requirements but exclude RFP process statements
    /\b(The\s+)?(?:vendor|contractor|supplier|bidder|respondent)\s+(?:must|shall|should|will)\s+(?:be\s+able\s+to|have|possess|demonstrate|provide\s+evidence|show)[^.!?]+[.!?]/gi,
    /\b(?:Your\s+(?:company|organization|firm))\s+(?:must|shall|should|will)\s+(?:be\s+able\s+to|have|possess|demonstrate|provide)[^.!?]+[.!?]/gi,
    /\b(?:Required\s+(?:capabilities|qualifications|experience|certifications))[^.!?]+[.!?]/gi,
    /\b(?:Must\s+have\s+(?:experience|expertise|knowledge|certification))[^.!?]+[.!?]/gi
  ];
  
  vendorPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const cleaned = match.trim();
      if (cleaned.length > 20) {
        extractedSet.add(cleaned);
      }
    });
  });
  
  // Pattern 4: Table and form completion requests
  const tablePatterns = [
    /\b(?:Complete|Fill\s+(?:in|out)|Provide\s+(?:the\s+)?following\s+information\s+in)\s+(?:the\s+)?(?:table|form|template|matrix|schedule|appendix|attachment|exhibit)[^.!?]*[.!?]/gi,
    /\b(?:Pricing|Cost|Rate|Fee)\s+(?:table|schedule|sheet|form)[^.!?]*(?:must|should|needs?\s+to)\s+be\s+(?:completed|filled|provided)[^.!?]*[.!?]/gi,
    /\bRefer\s+to\s+(?:Appendix|Attachment|Exhibit|Schedule|Table|Form)\s+[A-Z0-9]+[^.!?]*[.!?]/gi
  ];
  
  tablePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const cleaned = match.trim();
      if (cleaned.length > 20) {
        extractedSet.add(cleaned);
      }
    });
  });
  
  // Pattern 5: Compliance and certification requirements
  const compliancePatterns = [
    /\b(?:Provide\s+)?(?:evidence|proof|documentation|certification|confirmation)\s+(?:of|that|regarding)[^.!?]+[.!?]/gi,
    /\b(?:Must|Should|Shall)\s+(?:be\s+)?(?:compliant|certified|qualified|licensed|accredited)[^.!?]+[.!?]/gi,
    /\b(?:Required|Mandatory|Necessary)\s+(?:certifications?|qualifications?|licenses?|credentials?|requirements?)[^.!?]+[.!?]/gi,
    /\b(?:Compliance|Conformance|Adherence)\s+(?:with|to)\s+[^.!?]+\s+(?:is\s+)?(?:required|mandatory|necessary)[^.!?]*[.!?]/gi
  ];
  
  compliancePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const cleaned = match.trim();
      if (cleaned.length > 20) {
        extractedSet.add(cleaned);
      }
    });
  });
  
  // Pattern 6: Numbered items that look like requirements (enhanced)
  const numberedPattern = /^\s*(?:\d+[\.)]\s*|[a-zA-Z][\.)]\s*)(.+)$/gm;
  let match;
  while ((match = numberedPattern.exec(text)) !== null) {
    const item = match[1].trim();
    // Enhanced keyword list
    if (item.length > 20 && (
      /\b(describe|explain|provide|list|detail|outline|what|how|why|when|where|who|please|submit|include|must|shall|should|vendor|contractor|demonstrate|specify|identify|confirm|verify|certify|evidence|proof|complete|fill|table|form|compliance|required|mandatory)\b/i.test(item)
    )) {
      extractedSet.add(item);
    }
  }
  
  // Pattern 7: Bullet points with requirement keywords (enhanced)
  const bulletPattern = /^\s*[•·\-\*▪▫◦‣⁃]\s*(.+)$/gm;
  while ((match = bulletPattern.exec(text)) !== null) {
    const item = match[1].trim();
    if (item.length > 20 && (
      /\b(experience|capability|approach|methodology|solution|demonstrate|provide|describe|explain|must|shall|should|vendor|contractor|required|qualification|certification|compliance|evidence|proof)\b/i.test(item)
    )) {
      extractedSet.add(item);
    }
  }
  
  // Pattern 8: Requirements in specific sections (looking for section headers followed by content)
  const sectionPatterns = [
    /(?:Requirements|Qualifications|Capabilities|Specifications|Criteria|Scope\s+of\s+Work|Statement\s+of\s+Work|Deliverables)[:]\s*\n+([^]+?)(?=\n{2,}|\n(?:Requirements|Qualifications|Capabilities|Specifications|Criteria|Scope|Statement|Deliverables)|$)/gi
  ];
  
  sectionPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      // Extract individual lines from the section that look like requirements
      const lines = match.split('\n');
      lines.forEach(line => {
        const cleaned = line.trim();
        if (cleaned.length > 20 && !cleaned.match(/^(Requirements|Qualifications|Capabilities|Specifications|Criteria|Scope|Statement|Deliverables):/i)) {
          extractedSet.add(cleaned);
        }
      });
    });
  });
  
  // Convert Set to Array and apply final filtering
  const uniqueQuestions = Array.from(extractedSet)
    .filter(q => {
      // Filter out very short items
      if (q.length < 15) return false;
      
      // Filter out items that are just headers or labels
      if (/^(Section|Chapter|Part|Article|Appendix|Attachment|Exhibit|Table|Figure|Schedule)\s+[A-Z0-9]+[:.]?\s*$/i.test(q)) return false;
      
      // Filter out page numbers and similar artifacts
      if (/^Page\s+\d+\s*(?:of\s+\d+)?$/i.test(q)) return false;
      
      // Ensure the item has actual content (not just numbers or special characters)
      if (!/[a-zA-Z]{5,}/.test(q)) return false;
      
      return true;
    })
    .slice(0, 50); // Increased limit to 50 to match AI extraction
  
  console.log(`[RFP] Enhanced regex extraction found ${uniqueQuestions.length} questions/requirements`);
  return uniqueQuestions;
}

// Get responses from Pinecone for all questions in a single query
async function getPineconeBatchResponse(questions: string[]): Promise<{ content: string, sources: Array<{ name: string; url?: string }>, error?: string }> {
  try {
    // Send questions with minimal formatting to help with parsing
    // No persona instructions - let Pinecone use its own configured prompt
    const batchPrompt = `Please answer each question individually in this format:

Q1: [question]

Response:
[your answer]

Q2: [question]

Response:
[your answer]

Here are the questions:

${questions.map((q, i) => `Q${i + 1}: ${q}`).join('\n\n')}`;
    
    console.log(`[RFP] Sending batch request with ${questions.length} questions`);
    
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
    let content = rawResponse.message?.content || 'No response from Pinecone';
    
    // Debug: Log full response length
    console.log(`[RFP] Full Pinecone response length: ${content.length} chars`);
    
    // Process citations to preserve both file names and URLs
    const sources: Array<{ name: string; url?: string }> = [];
    const sourceUrls = new Map<string, string>(); // Map file names to URLs
    
    if (rawResponse.citations && rawResponse.citations.length > 0) {
      console.log(`[RFP] Processing ${rawResponse.citations.length} citations`);
      
      // Extract all unique sources with their URLs
      rawResponse.citations.forEach((citation: any) => {
        if (citation.references) {
          citation.references.forEach((ref: any) => {
            if (ref.file) {
              const fileName = ref.file.name || 'Unknown';
              const signedUrl = ref.file.signedUrl;
              
              // Store URL for this file name
              if (signedUrl && !sourceUrls.has(fileName)) {
                sourceUrls.set(fileName, signedUrl);
                sources.push({ name: fileName, url: signedUrl });
              } else if (!sourceUrls.has(fileName)) {
                sources.push({ name: fileName });
              }
            }
          });
        }
      });
    }
    
    // Return the content with preserved source URLs
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

// AI-only extraction - let Gemini determine what are actual questions
async function extractQuestionsMultiPass(text: string): Promise<{ questions: string[], metadata: ExtractionMetadata }> {
  console.log('[RFP] Starting AI-only extraction process');
  
  const metadata: ExtractionMetadata = {
    totalExtracted: 0,
    aiExtracted: 0,
    regexExtracted: 0,
    duplicatesRemoved: 0,
    categoryCounts: {
      directQuestions: 0,
      imperatives: 0,
      requirements: 0,
      compliance: 0,
      tables: 0
    },
    extractionTime: Date.now(),
    extractionMethod: 'ai-only'
  };

  try {
    // Use ONLY AI extraction - no regex fallback
    console.log('[RFP] Using AI-powered extraction exclusively');
    const startTime = Date.now();
    const aiQuestions = await extractQuestionsWithAI(text);
    metadata.aiExtracted = aiQuestions.length;
    console.log(`[RFP] AI extraction completed in ${Date.now() - startTime}ms, found ${aiQuestions.length} items`);
    
    // Simply use AI results without any regex or pattern filtering
    const finalQuestions = aiQuestions
      .filter(q => q && q.trim().length > 10) // Basic sanity check only
      .slice(0, 50) // Limit to 50 questions
      .map(q => {
        metadata.categoryCounts[categorizeQuestion(q)]++;
        return q.trim();
      });

    metadata.totalExtracted = finalQuestions.length;
    metadata.extractionTime = Date.now() - metadata.extractionTime;

    // Log extraction statistics
    console.log('[RFP] AI extraction complete:', {
      total: metadata.totalExtracted,
      categories: metadata.categoryCounts,
      timeMs: metadata.extractionTime
    });

    return { questions: finalQuestions, metadata };
    
  } catch (error) {
    console.error('[RFP] AI extraction failed:', error);
    // No fallback to regex - return empty if AI fails
    metadata.totalExtracted = 0;
    metadata.extractionMethod = 'failed';
    return { questions: [], metadata };
  }
}

// Normalize question for deduplication
function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 100); // Use first 100 chars for comparison
}

// Categorize question for prioritization
function categorizeQuestion(question: string): keyof ExtractionMetadata['categoryCounts'] {
  const q = question.toLowerCase();
  
  if (q.includes('?')) return 'directQuestions';
  if (/\b(must|shall|vendor|contractor|supplier)\b/.test(q)) return 'requirements';
  if (/\b(describe|explain|provide|list|detail|demonstrate)\b/.test(q)) return 'imperatives';
  if (/\b(compliance|certification|evidence|proof|qualified|accredited)\b/.test(q)) return 'compliance';
  if (/\b(table|form|template|appendix|attachment|pricing|schedule)\b/.test(q)) return 'tables';
  
  return 'imperatives'; // Default category
}

// Validate question quality and filter out RFP process statements
function validateQuestionQuality(question: string): boolean {
  // Minimum length requirement
  if (question.length < 15) return false;
  
  // Check for incomplete sentences (cut-off)
  if (question.endsWith('...') || question.endsWith('etc') || question.endsWith(',')) return false;
  
  // Ensure it has substantial content (at least 3 words)
  const wordCount = question.split(/\s+/).length;
  if (wordCount < 3) return false;
  
  // Filter out common non-questions and RFP process statements
  const nonQuestionPatterns = [
    /^page\s+\d+/i,
    /^table\s+of\s+contents/i,
    /^copyright/i,
    /^confidential/i,
    /^proprietary/i,
    /^\d+\s*$/,
    /^[a-z]\.\s*$/i,
    /^section\s+\d+/i,
    /^appendix\s+[a-z]/i,
    // New patterns to filter out RFP process rules
    /\b(?:agency|participant|participating\s+(?:agency|vendor))\s+(?:must|shall|agrees?\s+to?)\s+(?:adhere|comply|follow|delete|dispose)/i,
    /\ball\s+(?:communication|questions|responses|correspondence)\s+must\s+be\s+(?:directed|submitted|sent)\s+to/i,
    /\b(?:if|when)\s+(?:the\s+)?(?:agency|participant|vendor)\s+does\s+not\s+agree/i,
    /\bby\s+participating\s+in\s+(?:this\s+)?(?:the\s+)?RFP/i,
    /\bRFP\s+(?:response|submission)\s+must\s+(?:be\s+submitted|include)/i,
    /\b(?:candidates?|agencies?|vendors?)\s+must\s+(?:submit|be\s+ready)\s+(?:to|the)/i,
    /\binformation\s+must\s+be\s+submitted\s+(?:directly\s+)?to/i,
    /\beach\s+description\s+must\s+contain/i,
    /\bdocumentation\s+(?:including|must\s+be\s+returned)/i,
    /\ball\s+necessary\s+documentation/i
  ];
  
  const questionLower = question.toLowerCase();
  for (const pattern of nonQuestionPatterns) {
    if (pattern.test(questionLower)) return false;
  }
  
  // Additional check: if it's about RFP logistics but doesn't ask for vendor info, filter it out
  const rfpLogisticWords = ['submit', 'deadline', 'due date', 'format', 'electronic', 'email', 'directed to', 'point of contact'];
  const vendorInfoWords = ['your', 'describe', 'explain', 'provide', 'experience', 'capability', 'approach', 'solution'];
  
  let hasLogisticWord = false;
  let hasVendorInfoWord = false;
  
  for (const word of rfpLogisticWords) {
    if (questionLower.includes(word)) hasLogisticWord = true;
  }
  
  for (const word of vendorInfoWords) {
    if (questionLower.includes(word)) hasVendorInfoWord = true;
  }
  
  // If it has logistic words but no vendor info words, it's probably a process rule
  if (hasLogisticWord && !hasVendorInfoWord) return false;
  
  return true;
}

// Extract targeted patterns that might be missed
function extractTargetedPatterns(text: string): string[] {
  const targetedQuestions: string[] = [];
  
  // Look for specific evaluation criteria sections
  const evaluationPattern = /(?:evaluation\s+criteria|scoring|assessment|selection\s+criteria)[:\s]*\n+([^]+?)(?=\n{2,}|$)/gi;
  let match;
  while ((match = evaluationPattern.exec(text)) !== null) {
    const section = match[1];
    const lines = section.split('\n').filter(line => line.trim().length > 20);
    targetedQuestions.push(...lines.slice(0, 5)); // Take first 5 lines from evaluation sections
  }
  
  // Look for "ability to" or "capability to" statements
  const abilityPattern = /\b(?:ability|capability|capacity)\s+to\s+[^.!?]+[.!?]/gi;
  const abilityMatches = text.match(abilityPattern) || [];
  targetedQuestions.push(...abilityMatches.map(m => m.trim()));
  
  // Look for "responsible for" statements
  const responsibilityPattern = /\b(?:responsible\s+for|accountable\s+for|tasked\s+with)\s+[^.!?]+[.!?]/gi;
  const responsibilityMatches = text.match(responsibilityPattern) || [];
  targetedQuestions.push(...responsibilityMatches.map(m => m.trim()));
  
  return targetedQuestions.filter(q => q.length > 15);
}

// Interface for extraction metadata
interface ExtractionMetadata {
  totalExtracted: number;
  aiExtracted: number;
  regexExtracted: number;
  duplicatesRemoved: number;
  categoryCounts: {
    directQuestions: number;
    imperatives: number;
    requirements: number;
    compliance: number;
    tables: number;
  };
  extractionTime: number;
  extractionMethod: string;
}

// Interface for tracking extraction source
interface ExtractionSource {
  original: string;
  source: 'AI' | 'Regex' | 'Targeted';
  category: keyof ExtractionMetadata['categoryCounts'];
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

      // Extract questions/requirements using multi-pass extraction
      const { questions, metadata } = await extractQuestionsMultiPass(extractedText);
      
      if (questions.length === 0) {
        return res.status(400).json({ 
          error: 'No questions or requirements found in the document',
          suggestion: 'Please ensure the document contains numbered items, bullet points, or questions.',
          extractionMetadata: metadata // Include metadata for debugging
        });
      }

      // Log extraction metadata if verbose mode is enabled
      const verboseMode = req.query.verbose === 'true' || req.body?.verbose === true;
      if (verboseMode) {
        console.log('[RFP] Verbose mode - Extraction metadata:', JSON.stringify(metadata, null, 2));
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
        
        // Debug: Log the first 500 chars to see the format
        console.log(`[RFP] Response format preview (first 500 chars): ${fullContent.substring(0, 500)}`);
        
        // Try multiple parsing patterns to handle different response formats
        let parsedSuccessfully = false;
        
        // Pattern 1: Look for Q1:, Q2:, etc. with Response: labels
        const pattern1 = /Q(\d+):\s*([^\n]*)\n+Response:\s*([\s\S]*?)(?=\nQ\d+:|$)/gi;
        let matches = Array.from(fullContent.matchAll(pattern1));
        
        if (matches.length === 0) {
          // Pattern 2: Look for Q1 (without colon), then question, then Response:
          const pattern2 = /Q(\d+)\n([^\n]+)\n+Response:\s*([\s\S]*?)(?=\nQ\d+\n|$)/gi;
          matches = Array.from(fullContent.matchAll(pattern2));
        }
        
        if (matches.length === 0) {
          // Pattern 3: More flexible - just Q followed by number
          const pattern3 = /Q(\d+)[:\s]*([^\n]*?)\n+(?:Response:)?\s*([\s\S]*?)(?=\n?Q\d+[:\s]|$)/gi;
          matches = Array.from(fullContent.matchAll(pattern3));
        }
        
        if (matches.length > 0) {
          // We found structured answers
          console.log(`[RFP] Found ${matches.length} structured answers in response`);
          
          // Build a map of question numbers to responses
          const responseMap = new Map();
          for (const match of matches) {
            const qNum = parseInt(match[1]);
            // Clean up the response - remove any embedded Q2:, Q3: references that leaked in
            let answer = match[3].trim();
            
            // Remove any subsequent questions that may have leaked into this answer
            // Look for patterns like "Q2:" or "Q2\n" that indicate the start of another question
            const nextQPattern = /\n?Q\d+[:\s]/;
            const nextQIndex = answer.search(nextQPattern);
            if (nextQIndex > 0) {
              answer = answer.substring(0, nextQIndex).trim();
            }
            
            responseMap.set(qNum, answer);
          }
          
          // Now build responses array in order
          for (let i = 0; i < questions.length; i++) {
            const qNum = i + 1;
            if (responseMap.has(qNum)) {
              responses.push({
                question: questions[i],
                pineconeSources: allSources,
                generatedAnswer: responseMap.get(qNum)
              });
              parsedSuccessfully = true;
            } else {
              // This question wasn't found in the response
              responses.push({
                question: questions[i],
                pineconeSources: allSources,
                generatedAnswer: 'No response provided for this question'
              });
            }
          }
        }
        
        if (!parsedSuccessfully) {
          // Final fallback: Try to split by "Response:" occurrences
          console.log('[RFP] Trying to split by Response: occurrences');
          const responsePattern = /Response:\s*([\s\S]*?)(?=\n(?:Q\d+|Response:|Sources|$))/gi;
          const responseMatches = Array.from(fullContent.matchAll(responsePattern));
          
          if (responseMatches.length >= questions.length) {
            // We found enough response blocks
            for (let i = 0; i < questions.length; i++) {
              responses.push({
                question: questions[i],
                pineconeSources: allSources,
                generatedAnswer: responseMatches[i] ? responseMatches[i][1].trim() : 'No response found'
              });
            }
          } else {
            // Complete fallback: return full content for first question
            console.log('[RFP] Using complete fallback - couldn\'t parse structured responses');
            for (let i = 0; i < questions.length; i++) {
              responses.push({
                question: questions[i],
                pineconeSources: allSources,
                generatedAnswer: i === 0 ? fullContent : 'Unable to parse individual response - see Question 1'
              });
            }
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
      
      // Debug: Check what sources we're actually sending
      if (responses.length > 0 && responses[0].pineconeSources.length > 0) {
        console.log(`[RFP] First source structure:`, JSON.stringify(responses[0].pineconeSources[0], null, 2));
        console.log(`[RFP] Total sources being sent:`, responses[0].pineconeSources.length);
      }
      
      // Debug: Check response length
      if (responses.length > 0) {
        console.log(`[RFP] First answer length: ${responses[0].generatedAnswer.length} chars`);
      }

      // Prepare the response
      const rfpResponse: RFPResponse = {
        uploadedFile: req.file.originalname,
        extractedQuestions: questions,
        responses,
        generatedAt: new Date(),
        ...(verboseMode ? { extractionMetadata: metadata } : {}) // Include metadata in verbose mode
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
                  // Handle source objects with potential URLs
                  ...(r.pineconeSources && r.pineconeSources.length > 0 
                    ? r.pineconeSources.flatMap((source: any, idx: number) => {
                        const children: any[] = [];
                        
                        // Add comma separator if not the first source
                        if (idx > 0) {
                          children.push(new TextRun({
                            text: ', ',
                            italics: true,
                          }));
                        }
                        
                        // Check if source is an object with name and url
                        if (typeof source === 'object' && source.name) {
                          // If URL exists and is not a placeholder, create hyperlink
                          if (source.url && source.url !== '#') {
                            // Debug log for first source with URL
                            if (idx === 0) {
                              console.log(`[RFP DOCX] Creating hyperlink for: ${source.name} -> ${source.url.substring(0, 50)}...`);
                            }
                            children.push(new ExternalHyperlink({
                              children: [
                                new TextRun({
                                  text: source.name,
                                  italics: true,
                                  underline: {},
                                  color: '0000FF',
                                }),
                              ],
                              link: source.url,
                            }));
                          } else {
                            // No URL, just show the name
                            children.push(new TextRun({
                              text: source.name,
                              italics: true,
                            }));
                          }
                        } else if (typeof source === 'string') {
                          // Fallback for string sources (backward compatibility)
                          children.push(new TextRun({
                            text: source,
                            italics: true,
                          }));
                        }
                        
                        return children;
                      })
                    : [new TextRun({
                        text: 'General knowledge',
                        italics: true,
                      })]
                  ),
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
        // Sources - with clickable links
        {
          text: [
            { text: 'Sources: ', bold: true, italics: true },
            // Create array of text/link objects for each source
            ...(r.pineconeSources && r.pineconeSources.length > 0 
              ? r.pineconeSources.flatMap((source: any, idx: number) => {
                  const elements: any[] = [];
                  
                  // Add comma separator if not first source
                  if (idx > 0) {
                    elements.push({ text: ', ', italics: true });
                  }
                  
                  // Check if source has URL for clickable link
                  if (typeof source === 'object' && source.name) {
                    if (source.url && source.url !== '#') {
                      // Create clickable link
                      elements.push({
                        text: source.name,
                        link: source.url,
                        color: '0000FF',
                        italics: true,
                        decoration: 'underline'
                      });
                    } else {
                      // Just text, no link
                      elements.push({
                        text: source.name,
                        italics: true
                      });
                    }
                  } else if (typeof source === 'string') {
                    // Fallback for string sources
                    elements.push({
                      text: source,
                      italics: true
                    });
                  }
                  
                  return elements;
                })
              : [{ text: 'General knowledge', italics: true }]
            )
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