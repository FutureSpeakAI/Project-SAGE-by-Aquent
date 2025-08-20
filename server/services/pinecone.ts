
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
    const chatResponse = await assistant.chat({
      messages: formattedMessages
    });
    
    console.log('[Pinecone] Raw response received:', JSON.stringify(chatResponse, null, 2));
    
    // Extract content - preserve Pinecone's native formatting completely
    let content = chatResponse.message?.content || '';
    let sources: any[] = [];
    
    // Process citations if they exist
    if (chatResponse.citations && chatResponse.citations.length > 0) {
      console.log('[Pinecone] Processing', chatResponse.citations.length, 'citations');
      
      // Build sources from citations
      const uniqueSources = new Set<string>();
      
      chatResponse.citations.forEach((citation: any, index: number) => {
        console.log(`[Pinecone] Processing citation ${index}:`, JSON.stringify(citation, null, 2));
        
        // Handle different citation structures
        if (citation.references && citation.references.length > 0) {
          citation.references.forEach((reference: any) => {
            if (reference.file) {
              const fileName = reference.file.name || `Document ${index + 1}`;
              const pages = reference.pages?.length > 0 ? 
                `pages ${reference.pages.join(', ')}` : '';
              
              const sourceKey = `${fileName}-${pages}`;
              if (!uniqueSources.has(sourceKey)) {
                uniqueSources.add(sourceKey);
                sources.push({
                  title: fileName,
                  text: pages || 'Full document',
                  url: reference.file.signedUrl || '',
                  metadata: {
                    fileId: reference.file.id,
                    pages: reference.pages || [],
                    citationIndex: index
                  }
                });
              }
            }
          });
        } else {
          // Fallback for direct citation structure
          const title = citation.title || citation.filename || `Source ${index + 1}`;
          const sourceKey = `${title}-${index}`;
          if (!uniqueSources.has(sourceKey)) {
            uniqueSources.add(sourceKey);
            sources.push({
              title: title,
              text: citation.text || citation.content || 'Referenced content',
              metadata: {
                citationIndex: index,
                ...citation.metadata
              }
            });
          }
        }
      });
      
      console.log('[Pinecone] Built', sources.length, 'unique sources');
    }
    
    // Log final result
    console.log('[Pinecone] Final response:', {
      contentLength: content.length,
      sourcesCount: sources.length,
      hasContent: !!content,
      hasSources: sources.length > 0
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
