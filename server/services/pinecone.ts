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
    content: msg.content,
    role: msg.role
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
    
    // Format messages for Pinecone Assistant API
    const formattedMessages = formatMessages(messages);
    
    // Use the Pinecone SDK chat method
    // Note: Pinecone SDK doesn't support stream parameter in chat method
    const chatResponse = await assistant.chat({
      messages: formattedMessages
    });
    
    console.log('[Pinecone] Received response');
    
    // Extract content and sources from response
    let content = chatResponse.message?.content || '';
    
    // Format citations/sources if available
    let sources: any[] = [];
    const citationPositions: { position: number; source: any; pages: string }[] = [];
    
    if (chatResponse.citations && chatResponse.citations.length > 0) {
      console.log('[Pinecone] Citations found:', chatResponse.citations.length);
      
      // First pass: collect all citations with their positions
      chatResponse.citations.forEach((citation: any) => {
        const reference = citation.references?.[0];
        if (reference?.file) {
          const fileName = reference.file.name || 'Unknown document';
          const pages = reference.pages?.length > 0 ? 
            reference.pages.join(', ') : '';
          
          const sourceData = {
            title: fileName,
            text: pages ? `pages ${pages}` : '',
            url: reference.file.signedUrl,
            metadata: {
              fileId: reference.file.id,
              pages: reference.pages || []
            }
          };
          
          // Store citation with position
          if (citation.position !== undefined) {
            citationPositions.push({
              position: citation.position,
              source: sourceData,
              pages: pages
            });
          }
        }
      });
      
      // Build unique sources map first (without numbers)
      const uniqueSourcesMap = new Map<string, any>();
      
      citationPositions.forEach(({ source, pages }) => {
        // Create unique key for this source
        const sourceKey = `${source.title}${pages ? '-pages-' + pages : ''}`;
        
        // Add to unique sources if not already present
        if (!uniqueSourcesMap.has(sourceKey)) {
          uniqueSourcesMap.set(sourceKey, source);
        }
      });
      
      // Sort sources alphabetically by title for consistent ordering
      const sortedSources = Array.from(uniqueSourcesMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));
      
      // Assign numbers to sorted sources
      const sourceKeyToNumber = new Map<string, number>();
      let sourceNumber = 1;
      
      sortedSources.forEach(([key, source]) => {
        sources.push(source);
        sourceKeyToNumber.set(key, sourceNumber++);
      });
      
      // Now insert superscripts in reverse order to avoid position shifts
      const sortedForInsertion = [...citationPositions].reverse();
      
      sortedForInsertion.forEach(({ position, source, pages }) => {
        const sourceKey = `${source.title}${pages ? '-pages-' + pages : ''}`;
        const sourceNum = sourceKeyToNumber.get(sourceKey);
        
        if (sourceNum) {
          // Insert at the nearest word boundary after the position
          let insertPos = position;
          
          // Find the end of the current word/sentence
          while (insertPos < content.length && 
                 content[insertPos] !== ' ' && 
                 content[insertPos] !== '.' && 
                 content[insertPos] !== ',' &&
                 content[insertPos] !== '\n') {
            insertPos++;
          }
          
          // Insert superscript marker with correct source number
          if (insertPos <= content.length) {
            content = content.slice(0, insertPos) + `^[${sourceNum}]` + content.slice(insertPos);
          }
        }
      });
    }
    
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