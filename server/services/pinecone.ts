
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize Pinecone Assistant
let pinecone: Pinecone | null = null;
let assistant: any = null;
let isInitialized = false;
const ASSISTANT_NAME = 'pinecone-helper';

export interface PineconeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface PineconeResponse {
  content: string;
  sources?: Array<{
    title?: string;
    text: string;
    score?: number;
    metadata?: Record<string, any>;
    url?: string;
  }>;
}

/**
 * Initialize Pinecone Assistant connection
 */
export async function initializePinecone(): Promise<boolean> {
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    
    if (!apiKey) {
      console.error('[Pinecone] No API key found in environment variables');
      return false;
    }

    // Initialize Pinecone client with API key
    pinecone = new Pinecone({
      apiKey: apiKey
    });
    
    // Get the assistant instance
    try {
      assistant = pinecone.Assistant(ASSISTANT_NAME);
      isInitialized = true;
      console.log('[Pinecone] Successfully initialized Pinecone Assistant');
      return true;
    } catch (error) {
      console.error('[Pinecone] Failed to get assistant:', error);
      return false;
    }
  } catch (error) {
    console.error('[Pinecone] Failed to initialize:', error);
    return false;
  }
}

/**
 * Check if Pinecone is configured and ready
 */
export function isPineconeConfigured(): boolean {
  return !!process.env.PINECONE_API_KEY && isInitialized;
}

/**
 * Format messages for Pinecone Assistant
 */
function formatMessages(messages: PineconeMessage[]): any[] {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/**
 * Parse Pinecone response to extract content and sources
 */
function parseResponse(response: any): PineconeResponse {
  try {
    // Handle streaming response
    if (response && response.message) {
      const content = response.message.content || '';
      
      // Extract citations/sources if present in the response
      const sources: any[] = [];
      
      // Check if response includes citations
      if (response.citations || response.sources) {
        const rawSources = response.citations || response.sources || [];
        rawSources.forEach((source: any) => {
          sources.push({
            title: source.title || source.filename || 'Source',
            text: source.text || source.content || '',
            score: source.score,
            metadata: source.metadata || {}
          });
        });
      }
      
      return {
        content,
        sources: sources.length > 0 ? sources : undefined
      };
    }
    
    // Fallback for different response structures
    if (typeof response === 'string') {
      return { content: response };
    }
    
    return { content: JSON.stringify(response) };
  } catch (error) {
    console.error('[Pinecone] Error parsing response:', error);
    return { content: 'Error processing response' };
  }
}

/**
 * Helper function to convert numbers to superscript
 */
function toSuperscript(num: number): string {
  const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  return num.toString().split('').map(digit => superscripts[parseInt(digit)]).join('');
}

/**
 * Chat with Pinecone Assistant
 */
export async function chatWithPinecone(
  messages: PineconeMessage[]
): Promise<PineconeResponse> {
  try {
    if (!isInitialized || !assistant) {
      throw new Error('Pinecone not initialized');
    }

    console.log('[Pinecone] Sending chat request with', messages.length, 'messages');
    
    // Enhance the last user message to get more detailed responses
    const enhancedMessages = [...messages];
    if (enhancedMessages.length > 0 && enhancedMessages[enhancedMessages.length - 1].role === 'user') {
      const lastMessage = enhancedMessages[enhancedMessages.length - 1];
      // Simple enhancement for Gemini - let it use its natural formatting
      lastMessage.content = `${lastMessage.content}

Please provide a comprehensive response with relevant citations from the knowledge base.`;
    }
    
    // Format messages for Pinecone Assistant API
    const formattedMessages = formatMessages(enhancedMessages);
    
    // Use the Pinecone SDK chat method with Gemini 2.5 Pro model
    const model = process.env.PINECONE_MODEL || 'gemini-2.5-pro';
    const chatResponse = await assistant.chat({
      messages: formattedMessages,
      model: model
    });
    
    console.log('[Pinecone] Raw response received:', JSON.stringify(chatResponse, null, 2));
    
    // Extract content - preserve Pinecone's native formatting completely
    let content = chatResponse.message?.content || '';
    let sources: any[] = [];
    let citationMap = new Map<number, any>();
    
    // Check model type to handle citations appropriately
    const isGemini = model.toLowerCase().includes('gemini');
    
    // Process citations if they exist (GPT-4o style)
    if (!isGemini && chatResponse.citations && chatResponse.citations.length > 0) {
      console.log('[Pinecone] Processing', chatResponse.citations.length, 'citations (GPT-4o style)');
      
      // Build comprehensive sources from citations
      const uniqueSources = new Map<string, any>();
      let citationNumber = 0;
      
      chatResponse.citations.forEach((citation: any, index: number) => {
        console.log(`[Pinecone] Processing citation ${index}:`, JSON.stringify(citation, null, 2));
        
        // Handle different citation structures
        if (citation.references && citation.references.length > 0) {
          citation.references.forEach((reference: any) => {
            if (reference.file) {
              citationNumber++;
              const fileName = reference.file.name || `Document ${citationNumber}`;
              const pages = reference.pages?.length > 0 ? reference.pages : [];
              const pageText = pages.length > 0 ? `p. ${pages.join(', ')}` : '';
              
              // Create a rich source object
              const source = {
                number: citationNumber,
                title: fileName,
                text: pageText || 'Full document',
                url: reference.file.signedUrl || '',
                pages: pages,
                metadata: {
                  fileId: reference.file.id,
                  createdOn: reference.file.createdOn,
                  updatedOn: reference.file.updatedOn,
                  status: reference.file.status,
                  citationIndex: index
                }
              };
              
              const sourceKey = `${fileName}-${reference.file.id}`;
              if (!uniqueSources.has(sourceKey)) {
                uniqueSources.set(sourceKey, source);
              }
            }
          });
        } else {
          // Fallback for direct citation structure
          citationNumber++;
          const title = citation.title || citation.filename || `Source ${citationNumber}`;
          const source = {
            number: citationNumber,
            title: title,
            text: citation.text || citation.content || 'Referenced content',
            metadata: {
              citationIndex: index,
              ...citation.metadata
            }
          };
          
          const sourceKey = `${title}-${citationNumber}`;
          uniqueSources.set(sourceKey, source);
        }
        
        // Store citation position for later processing
        if (citation.position !== undefined && citation.position >= 0) {
          citationMap.set(citation.position, citationNumber);
        }
      });
      
      sources = Array.from(uniqueSources.values()).sort((a, b) => a.number - b.number);
      console.log('[Pinecone] Built', sources.length, 'unique sources');
      
      // Insert clickable citation markers at the correct positions
      // Process from end to start to maintain position accuracy
      if (citationMap.size > 0) {
        const positions = Array.from(citationMap.keys()).sort((a, b) => b - a);
        
        for (const position of positions) {
          const citationNumber = citationMap.get(position);
          const source = sources.find(s => s.number === citationNumber);
          
          if (source && position <= content.length) {
            // Create a clickable markdown link with superscript styling
            const marker = `[${toSuperscript(citationNumber)}](${source.url || '#'})`;
            content = content.slice(0, position) + marker + content.slice(position);
            console.log(`[Pinecone] Inserted clickable citation ${citationNumber} at position ${position}`);
          }
        }
      }
    } else if (isGemini) {
      // For Gemini, parse citations from the content text
      console.log('[Pinecone] Processing Gemini-style citations from content');
      
      // Extract sources from the Sources section if present
      const sourcesMatch = content.match(/### (?:\*\*)?Sources:?(?:\*\*)?[\s\S]*$/i);
      if (sourcesMatch) {
        const sourcesSection = sourcesMatch[0];
        const sourceLines = sourcesSection.split('\n').filter((line: string) => line.trim());
        
        // Parse each source line (format: "1. Document.pdf, pp. 1-2")
        sourceLines.forEach((line: string, index: number) => {
          const match = line.match(/^(\d+)\.\s+(.+?)(?:,\s*pp?\.\s*([\d-,\s]+))?$/);
          if (match) {
            const sourceNum = parseInt(match[1]);
            const fileName = match[2].trim();
            const pages = match[3] || '';
            
            sources.push({
              number: sourceNum,
              title: fileName,
              text: pages ? `p. ${pages}` : '',
              url: '#', // Gemini doesn't provide URLs, so use placeholder
              metadata: {}
            });
          }
        });
        
        console.log('[Pinecone] Extracted', sources.length, 'sources from Gemini response');
        
        // Replace inline superscript citations with clickable versions
        // Gemini uses superscript Unicode characters like ¹²³
        const superscriptPattern = /([¹²³⁴⁵⁶⁷⁸⁹⁰]+)/g;
        content = content.replace(superscriptPattern, (match: string) => {
          // Convert superscript to number
          const num = match.split('').map((char: string) => {
            const index = '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(char);
            return index >= 0 ? index : '';
          }).join('');
          
          if (num) {
            const sourceNum = parseInt(num);
            const source = sources.find(s => s.number === sourceNum);
            if (source) {
              return `[${match}](#citation-${sourceNum})`;
            }
          }
          return match;
        });
        
        // Also handle citation patterns like ¹'²'³
        content = content.replace(/([¹²³⁴⁵⁶⁷⁸⁹⁰]+(?:[''](?:[¹²³⁴⁵⁶⁷⁸⁹⁰]+))+)/g, (match: string) => {
          // Extract all numbers from the citation group
          const numbers = match.match(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g) || [];
          const links = numbers.map((sup: string) => {
            const num = sup.split('').map((char: string) => {
              const index = '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(char);
              return index >= 0 ? index : '';
            }).join('');
            return num ? `[${sup}](#citation-${num})` : sup;
          });
          return links.join('\'');
        });
        
        // Clean up broken Confidence Assessment table if present
        // Gemini sometimes produces malformed markdown tables
        const confAssessmentStart = content.indexOf('### Confidence Assessment');
        if (confAssessmentStart !== -1) {
          const beforeTable = content.substring(0, confAssessmentStart);
          const afterTableMatch = content.substring(confAssessmentStart).match(/\n\n(?![\|\-])/);
          if (afterTableMatch) {
            const afterTableIndex = confAssessmentStart + afterTableMatch.index!;
            const afterTable = content.substring(afterTableIndex);
            // Remove the broken table section
            content = beforeTable + afterTable;
          } else {
            // If no clear end, just remove everything after Confidence Assessment
            content = beforeTable;
          }
        }
      }
    }
    
    // Only add enhanced citation references if they're not already in the content
    // Gemini includes its own Sources section, so we don't need to add another
    const hasSourcesInContent = content.includes('### Sources:') || 
                               content.includes('**Sources:**') ||
                               content.includes('Sources:');
    
    if (!hasSourcesInContent && sources.length > 0) {
      let referencesSection = '\n\n---\n### 📚 Sources & References:\n\n';
      sources.forEach(source => {
        const pageInfo = source.text && source.text !== 'Full document' ? ` (${source.text})` : '';
        
        // Make the source title clickable if URL exists
        if (source.url) {
          referencesSection += `**[${source.number}]** [${source.title}](${source.url})${pageInfo}\n`;
        } else {
          referencesSection += `**[${source.number}]** ${source.title}${pageInfo}\n`;
        }
        
        // Add date info if available
        if (source.metadata?.updatedOn) {
          const date = new Date(source.metadata.updatedOn).toLocaleDateString();
          referencesSection += `   *Last updated: ${date}*\n`;
        }
        referencesSection += '\n';
      });
      content += referencesSection;
    }
    
    // Log final result
    console.log('[Pinecone] Final response:', {
      contentLength: content.length,
      sourcesCount: sources.length,
      hasContent: !!content,
      hasSources: sources.length > 0,
      hasInlineCitations: sources.length > 0
    });
    
    return {
      content,
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error('[Pinecone] Chat error:', error);
    throw error;
  }
}

/**
 * Upload a file to Pinecone Assistant
 * Note: File upload may require a different API endpoint or SDK
 */
export async function uploadFileToPinecone(
  filePath: string
): Promise<{ success: boolean; message: string }> {
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Pinecone API key not configured');
    }

    // File upload would require the SDK or a specific endpoint
    // For now, return an informative message
    console.log('[Pinecone] File upload requested for:', filePath);
    return {
      success: false,
      message: 'File upload requires Pinecone SDK integration. Please use the Pinecone dashboard or Python SDK to upload files.'
    };
  } catch (error) {
    console.error('[Pinecone] File upload error:', error);
    return {
      success: false,
      message: `Failed to upload file: ${error}`
    };
  }
}

/**
 * Check Pinecone Assistant status
 */
export async function checkPineconeStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  assistantName?: string;
  error?: string;
}> {
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    
    if (!apiKey) {
      return {
        configured: false,
        connected: false,
        error: 'Pinecone API key not configured'
      };
    }
    
    // Try to initialize if not already done
    if (!isInitialized) {
      const initialized = await initializePinecone();
      if (!initialized) {
        return {
          configured: true,
          connected: false,
          error: 'Failed to connect to Pinecone Assistant'
        };
      }
    }
    
    return {
      configured: true,
      connected: isInitialized,
      assistantName: ASSISTANT_NAME
    };
  } catch (error) {
    return {
      configured: !!process.env.PINECONE_API_KEY,
      connected: false,
      error: `Connection error: ${error}`
    };
  }
}
