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
    const allowedTypes = ['.pdf', '.docx', '.txt', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, TXT, XLSX, and XLS files are allowed.'));
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

// Enhanced text preprocessing for PDF extraction issues
async function cleanMalformedText(text: string): Promise<string> {
  try {
    console.log('[RFP] Starting text preprocessing...');
    
    // Step 1: Remove common PDF artifacts
    let processedText = removePDFArtifacts(text);
    
    // Step 2: Fix table formatting issues
    processedText = fixTableFormatting(processedText);
    
    // Step 3: Check if text has spacing issues
    const hasSpacingIssues = 
      // Character-level spacing: "W h o   i n   y o u r"
      /[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]/.test(processedText.substring(0, 500)) ||
      // Words joined together: "Whatarethecorporate"
      /[a-z]{20,}/.test(processedText.substring(0, 500));
    
    if (!hasSpacingIssues) {
      console.log('[RFP] Text preprocessing complete (no AI cleanup needed)');
      return processedText;
    }
    
    console.log('[RFP] Detected malformed text, using AI to clean up spacing issues');
    
    // Use Gemini to fix spacing issues
    const cleanupPrompt = `Fix the spacing and formatting issues in the following text extracted from a PDF document.
    
Your task:
1. Fix letters separated by spaces: "W h o   i n   y o u r" → "Who in your"
2. Fix words joined together: "Whatarethecorporate" → "What are the corporate"
3. Fix broken hyphenation: "require- ment" → "requirement"
4. Fix broken sentences across lines (preserve paragraph breaks)
5. Clean up extra whitespace while preserving intentional formatting

IMPORTANT: Return ONLY the corrected text without any explanation or commentary.

Text to fix:
${processedText}`;

    const cleanedText = await generateContent({
      model: 'gemini-2.0-flash',
      prompt: cleanupPrompt,
      systemPrompt: 'You are a text correction assistant. Fix spacing and formatting issues in PDF-extracted text. Return only the corrected text.'
    });
    
    console.log('[RFP] AI cleanup completed successfully');
    return cleanedText;
    
  } catch (error) {
    console.error('[RFP] Failed to clean text with AI, using preprocessed text:', error);
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
    const extractionPrompt = `You are an expert RFP analyst. Analyze the following RFP document and extract ALL questions, requirements, and vendor action items that require a response or compliance confirmation.

Your task - Extract ALL of the following:

1. DIRECT QUESTIONS (ending with "?")
   - Any sentence ending with a question mark
   - Embedded questions within paragraphs

2. IMPERATIVE STATEMENTS requiring vendor action:
   - "Describe your..." / "Explain how..." / "Provide details..."
   - "List your..." / "Detail your..." / "Outline your..."
   - "Demonstrate..." / "Show how..." / "Illustrate..."
   - "Please provide..." / "Please describe..." / "Please explain..."
   - "Submit..." / "Include..." / "Attach..."
   - "Specify..." / "Identify..." / "Define..."

3. VENDOR REQUIREMENTS AND EXPECTATIONS:
   - "The vendor must..." / "The vendor shall..." / "Vendor should..."
   - "The contractor must..." / "The supplier will..."
   - "You must..." / "You should..." / "You will need to..."
   - "It is required that..." / "Requirements include..."
   - "Must demonstrate..." / "Must have..." / "Must provide..."

4. COMPLIANCE AND CERTIFICATION REQUIREMENTS:
   - "Confirm that..." / "Verify that..." / "Certify that..."
   - "Provide evidence of..." / "Provide proof of..."
   - "Must be compliant with..." / "Must meet..."
   - "Required certifications..." / "Required qualifications..."

5. TABLE AND FORM COMPLETION REQUESTS:
   - "Complete the table..." / "Fill in the pricing..."
   - "Provide the following information in table format..."
   - References to appendices or attachments requiring completion

6. EVALUATION CRITERIA that require vendor input:
   - Technical capability requirements
   - Experience requirements
   - Staffing and resource requirements
   - Methodology and approach requirements

ONLY EXCLUDE:
- Pure RFP submission logistics (address, email, deadline ONLY if not asking for vendor info)
- Page numbers, headers, footers
- Table of contents entries
- Contact information that's purely informational
- Copyright notices and legal disclaimers about the RFP itself

IMPORTANT RULES:
- Include EVERYTHING that requires vendor response or acknowledgment
- Preserve complete context (don't truncate questions)
- Include requirements even if phrased as statements
- Include both mandatory (must/shall) and recommended (should/may) requirements
- Each extracted item should be self-contained and understandable
- Maximum 50 items (prioritize most substantial if more exist)

Return ONLY a JSON array of strings, where each string is a complete question or requirement.
Format: ["question 1", "requirement 2", "question 3", ...]

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
      
      // Clean and validate questions
      questions = questions
        .filter(q => typeof q === 'string' && q.trim().length > 10)
        .map(q => q.trim())
        .slice(0, 50); // Limit to 50 questions max
      
      console.log(`[RFP] AI extracted ${questions.length} questions successfully`);
      
      // If AI extraction succeeded and found questions, return them
      if (questions.length > 0) {
        return questions;
      }
      
    } catch (parseError) {
      console.error('[RFP] Failed to parse AI response as JSON:', parseError);
      console.log('[RFP] AI Response (first 500 chars):', aiResponse.substring(0, 500));
    }
    
    // If parsing failed or no questions found, fall back to regex
    console.log('[RFP] AI extraction failed or returned no questions, falling back to regex extraction');
    return extractQuestionsWithRegex(text);
    
  } catch (error) {
    console.error('[RFP] AI question extraction failed:', error);
    // Fallback to regex-based extraction
    console.log('[RFP] Falling back to regex-based extraction due to AI error');
    return extractQuestionsWithRegex(text);
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
  
  // Pattern 3: Vendor/contractor requirements
  const vendorPatterns = [
    /\b(The\s+)?(?:vendor|contractor|supplier|bidder|respondent|applicant|company|organization|firm)\s+(?:must|shall|should|will|needs?\s+to|is\s+(?:required|expected)\s+to)[^.!?]+[.!?]/gi,
    /\b(?:You|Your\s+(?:company|organization|firm))\s+(?:must|shall|should|will|need\s+to|are\s+(?:required|expected)\s+to)[^.!?]+[.!?]/gi,
    /\b(?:It\s+is\s+(?:required|mandatory|necessary|essential)\s+(?:that|to))[^.!?]+[.!?]/gi,
    /\b(?:Must|Shall|Should)\s+(?:have|possess|demonstrate|provide|include|submit)[^.!?]+[.!?]/gi
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

// Multi-pass extraction with deduplication
async function extractQuestionsMultiPass(text: string): Promise<{ questions: string[], metadata: ExtractionMetadata }> {
  console.log('[RFP] Starting multi-pass extraction process');
  
  const allQuestions = new Map<string, ExtractionSource>(); // Use Map to track source of each question
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
    extractionMethod: 'multi-pass'
  };

  try {
    // Pass 1: AI Extraction (primary method)
    console.log('[RFP] Pass 1: AI-powered extraction');
    const startTime = Date.now();
    const aiQuestions = await extractQuestionsWithAI(text);
    metadata.aiExtracted = aiQuestions.length;
    console.log(`[RFP] AI extraction completed in ${Date.now() - startTime}ms, found ${aiQuestions.length} items`);
    
    // Add AI questions to the map
    aiQuestions.forEach(q => {
      const normalized = normalizeQuestion(q);
      if (!allQuestions.has(normalized)) {
        allQuestions.set(normalized, { 
          original: q, 
          source: 'AI',
          category: categorizeQuestion(q)
        });
      }
    });

    // Pass 2: Enhanced Regex Extraction (fallback and supplement)
    console.log('[RFP] Pass 2: Enhanced regex extraction for supplemental capture');
    const regexQuestions = extractQuestionsWithRegex(text);
    
    // Add regex questions that weren't found by AI
    let regexUnique = 0;
    regexQuestions.forEach(q => {
      const normalized = normalizeQuestion(q);
      if (!allQuestions.has(normalized)) {
        allQuestions.set(normalized, {
          original: q,
          source: 'Regex',
          category: categorizeQuestion(q)
        });
        regexUnique++;
      } else {
        metadata.duplicatesRemoved++;
      }
    });
    metadata.regexExtracted = regexUnique;
    console.log(`[RFP] Regex extraction added ${regexUnique} unique items (${metadata.duplicatesRemoved} duplicates removed)`);

    // Pass 3: Targeted extraction for commonly missed patterns
    if (allQuestions.size < 30) { // Only run if we haven't found many questions
      console.log('[RFP] Pass 3: Targeted extraction for potentially missed patterns');
      const targetedQuestions = extractTargetedPatterns(text);
      
      targetedQuestions.forEach(q => {
        const normalized = normalizeQuestion(q);
        if (!allQuestions.has(normalized)) {
          allQuestions.set(normalized, {
            original: q,
            source: 'Targeted',
            category: categorizeQuestion(q)
          });
        } else {
          metadata.duplicatesRemoved++;
        }
      });
    }

    // Convert Map to array and apply quality filters
    const finalQuestions = Array.from(allQuestions.values())
      .filter(item => validateQuestionQuality(item.original))
      .sort((a, b) => {
        // Prioritize by source (AI > Targeted > Regex) and category importance
        const sourcePriority = { 'AI': 0, 'Targeted': 1, 'Regex': 2 };
        const categoryPriority = { 
          'directQuestions': 0, 
          'requirements': 1, 
          'imperatives': 2, 
          'compliance': 3, 
          'tables': 4 
        };
        
        const sourceCompare = sourcePriority[a.source] - sourcePriority[b.source];
        if (sourceCompare !== 0) return sourceCompare;
        
        return categoryPriority[a.category] - categoryPriority[b.category];
      })
      .slice(0, 50) // Limit to 50 questions
      .map(item => {
        // Update category counts
        metadata.categoryCounts[item.category]++;
        return item.original;
      });

    metadata.totalExtracted = finalQuestions.length;
    metadata.extractionTime = Date.now() - metadata.extractionTime;

    // Log extraction statistics
    console.log('[RFP] Extraction complete:', {
      total: metadata.totalExtracted,
      bySource: { ai: metadata.aiExtracted, regex: metadata.regexExtracted },
      duplicatesRemoved: metadata.duplicatesRemoved,
      categories: metadata.categoryCounts,
      timeMs: metadata.extractionTime
    });

    return { questions: finalQuestions, metadata };
    
  } catch (error) {
    console.error('[RFP] Multi-pass extraction failed, using fallback:', error);
    // Fallback to simple regex extraction if multi-pass fails
    const fallbackQuestions = extractQuestionsWithRegex(text).slice(0, 50);
    metadata.totalExtracted = fallbackQuestions.length;
    metadata.regexExtracted = fallbackQuestions.length;
    metadata.extractionMethod = 'fallback-regex';
    return { questions: fallbackQuestions, metadata };
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

// Validate question quality
function validateQuestionQuality(question: string): boolean {
  // Minimum length requirement
  if (question.length < 15) return false;
  
  // Check for incomplete sentences (cut-off)
  if (question.endsWith('...') || question.endsWith('etc') || question.endsWith(',')) return false;
  
  // Ensure it has substantial content (at least 3 words)
  const wordCount = question.split(/\s+/).length;
  if (wordCount < 3) return false;
  
  // Filter out common non-questions
  const nonQuestionPatterns = [
    /^page\s+\d+/i,
    /^table\s+of\s+contents/i,
    /^copyright/i,
    /^confidential/i,
    /^proprietary/i,
    /^\d+\s*$/,
    /^[a-z]\.\s*$/i,
    /^section\s+\d+/i,
    /^appendix\s+[a-z]/i
  ];
  
  for (const pattern of nonQuestionPatterns) {
    if (pattern.test(question)) return false;
  }
  
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
        
        // Split the response by question headers - looking for Q1:, Q2:, etc.
        // Using lazy match (?) to capture content until the next question or end
        // Important: [\s\S]*? matches any character including newlines
        const questionPattern = /Q(\d+):\s*([^\n]+)\n\nResponse:\n([\s\S]*?)(?=\nQ\d+:|$)/gi;
        const matches = Array.from(fullContent.matchAll(questionPattern));
        
        if (matches.length > 0) {
          // We found structured answers
          console.log(`[RFP] Found ${matches.length} structured answers in response`);
          for (let i = 0; i < questions.length; i++) {
            const match = matches.find(m => parseInt(m[1]) === i + 1);
            if (match) {
              responses.push({
                question: questions[i],
                pineconeSources: allSources,
                generatedAnswer: match[3].trim()
              });
            } else {
              // No match found for this question number - might be in combined format
              // Try to extract from the first answer if it contains all responses
              if (i === 0 && matches.length === 1) {
                responses.push({
                  question: questions[i],
                  pineconeSources: allSources,
                  generatedAnswer: matches[0][3].trim()
                });
              } else {
                responses.push({
                  question: questions[i],
                  pineconeSources: allSources,
                  generatedAnswer: `See response to Question 1 for combined answer`
                });
              }
            }
          }
        } else {
          // Fallback: If Pinecone didn't structure the response as expected,
          // Try alternative parsing or use full content
          console.log('[RFP] Trying alternative parsing for unstructured response');
          
          // Check if all answers are in the first response
          if (fullContent.includes('Q1:') && fullContent.includes('Q2:')) {
            // Response has question markers but different format
            for (let i = 0; i < questions.length; i++) {
              const qNum = i + 1;
              const qPattern = new RegExp(`Q${qNum}:[^\\n]*\\n+(?:Response:\\n)?([\\s\\S]*?)(?=\\nQ\\d+:|Sources|$)`, 'i');
              const match = fullContent.match(qPattern);
              
              if (match) {
                responses.push({
                  question: questions[i],
                  pineconeSources: allSources,
                  generatedAnswer: match[1].trim()
                });
              } else {
                responses.push({
                  question: questions[i],
                  pineconeSources: allSources,
                  generatedAnswer: i === 0 ? fullContent : 'See response to Question 1 for combined answer'
                });
              }
            }
          } else {
            // Complete fallback: return full content for first question
            console.log('[RFP] Using fallback - returning full content');
            for (let i = 0; i < questions.length; i++) {
              responses.push({
                question: questions[i],
                pineconeSources: allSources,
                generatedAnswer: i === 0 ? fullContent : 'See response to Question 1 for combined answer'
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