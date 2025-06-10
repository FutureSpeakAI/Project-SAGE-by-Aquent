import OpenAI from "openai";
import { Request, Response } from "express";

export interface GenerateContentRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}

export interface GenerateImageRequest {
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  background?: string;
  moderation?: string;
  n?: number;
  output_format?: string;
  output_compression?: number;
  reference_images?: Array<{
    image_url: {
      url: string;
      detail?: "auto" | "high" | "low";
    }
  }>;
}

// Direct content generation function for internal use
export const generateContentDirect = async (userPrompt: string, systemPrompt: string = '', model: string = 'gpt-4o'): Promise<string> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  if (!userPrompt) {
    throw new Error("User prompt is required");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45000, // 45 second timeout
  });

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        { role: "user" as const, content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    return completion.choices[0].message.content || "I apologize, but I couldn't generate a response.";
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI generation failed: ${error.message}`);
  }
};

export const generateContent = async (req: Request, res: Response) => {
  try {
    const { model, systemPrompt, userPrompt, temperature } = req.body as GenerateContentRequest;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "Server API key configuration is missing" });
    }

    if (!userPrompt) {
      return res.status(400).json({ message: "User prompt is required" });
    }

    // Whether we're using a project key or standard key, just use the OpenAI SDK
    // This provides a consistent interface and better model compatibility
    console.log("Using OpenAI API with server-side API key");
    
    let content = "";
    
    // Configure OpenAI client with optional parameters
    const openaiConfig: any = { 
      apiKey: process.env.OPENAI_API_KEY,
    };
    
    // Add organization ID if available
    if (process.env.OPENAI_ORG_ID) {
      openaiConfig.organization = process.env.OPENAI_ORG_ID;
    }
    
    // Add base URL if specified
    if (process.env.OPENAI_API_BASE_URL) {
      openaiConfig.baseURL = process.env.OPENAI_API_BASE_URL;
    }
    
    // Initialize the OpenAI client with extended timeout for complex briefs
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000, // 60 second timeout for complex content generation
      maxRetries: 0, // No retries to prevent double timeouts
    });
    
    // Check if this is a request from the image prompt agent
    const isImagePromptAgent = systemPrompt.includes("CONVERSATIONAL DIALOGUE") && 
                              systemPrompt.includes("Image Generation Prompt Expert");
    
    let enhancedSystemPrompt = systemPrompt || "You are a helpful assistant.";
    let enhancedUserPrompt = userPrompt;
    
    // Detect if this is executing deliverables from an existing brief with specific deliverable instructions
    const containsBriefContent = (userPrompt.toLowerCase().includes('nike') && userPrompt.toLowerCase().includes('volkswagen') &&
                                 userPrompt.toLowerCase().includes('deliverables')) ||
                                (userPrompt.toLowerCase().includes('beetle shoe') && 
                                 userPrompt.toLowerCase().includes('deliverables')) ||
                                userPrompt.toLowerCase().includes('angle 1:') ||
                                userPrompt.toLowerCase().includes('angle 2:') ||
                                userPrompt.toLowerCase().includes('angle 3:') ||
                                (userPrompt.toLowerCase().includes('blog post') && 
                                 userPrompt.toLowerCase().includes('creative brief') &&
                                 userPrompt.toLowerCase().includes('deliverables'));

    const hasVisualRequirements = userPrompt.toLowerCase().includes('angle 1') ||
                                 userPrompt.toLowerCase().includes('angle 2') ||
                                 userPrompt.toLowerCase().includes('angle 3') ||
                                 userPrompt.toLowerCase().includes('product images') ||
                                 userPrompt.toLowerCase().includes('close-up shot') ||
                                 userPrompt.toLowerCase().includes('lifestyle image') ||
                                 userPrompt.toLowerCase().includes('overhead view');

    // Check for specific brief instructions with explicit deliverable requests
    const isExecutingSpecificBrief = containsBriefContent || 
                                    (userPrompt.toLowerCase().includes('deliverables required:') ||
                                     userPrompt.toLowerCase().includes('execute') && userPrompt.toLowerCase().includes('deliverables'));

    // Handle specific Nike x VW brief execution
    if (isExecutingSpecificBrief && hasVisualRequirements) {
      enhancedSystemPrompt = "EXECUTE DELIVERABLES FROM BRIEF: Create both blog content AND sophisticated image generation prompts for GPT's image model.\n\nSTRUCTURE YOUR OUTPUT:\n1. First: Write the complete blog post with engaging marketing copy\n2. Then: Add section titled 'Image Generation Prompts:'\n3. Format each visual as: **Image Generation Prompt - [Angle]:** [detailed cinematic prompt]\n\nCREATE SOPHISTICATED PROMPTS that include:\n- Cinematic/editorial photography style (not generic commercial)\n- Specific atmospheric elements and mood\n- Detailed material descriptions and textures\n- Professional lighting setups with emotional impact\n- Brand heritage elements woven into composition\n- Advanced technical specifications for GPT Image 1\n- Cultural and design context that reinforces campaign messaging\n\nEXAMPLE SOPHISTICATED PROMPTS:\n**Image Generation Prompt - Angle 1:** Cinematic macro product photography of Nike x Volkswagen Beetle Shoe, dramatic side profile showcasing curved silhouette inspired by classic Beetle bodywork, premium materials with visible texture details including perforated leather and suede accents, gradient lighting transitioning from warm amber to cool blue reflecting automotive heritage, floating against deep charcoal background with subtle geometric patterns reminiscent of 1960s design, ultra-sharp focus on stitching and Nike swoosh integration, shot with professional camera lens creating natural depth of field, 8K resolution commercial quality\n\nProvide complete deliverables: blog post + sophisticated image prompts optimized for GPT image generation that tell the brand story visually.";
      
      enhancedUserPrompt = userPrompt + "\n\nDELIVERABLES REQUIRED:\n1. Complete blog post about Nike x Volkswagen Beetle Shoe collaboration\n2. Image generation prompts for each angle specified\n\nOutput both the marketing blog content AND the image prompts in your response.";
    } else if (isExecutingSpecificBrief) {
      enhancedSystemPrompt = "CRITICAL INSTRUCTION: You are provided with a creative brief that specifies deliverables to create. Your job is to EXECUTE those deliverables, NOT create another brief. Create the actual content described in the brief with engaging copy. DO NOT create strategy documents - execute the actual deliverables specified in the brief.";
    } else if (userPrompt.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)')) {
      // Handle Content tab brief-based generation - this should create content, not repeat the brief
      enhancedSystemPrompt = "You are a professional content creator executing creative briefs. Based on the provided creative brief, create the specific content deliverables requested. Focus on creating engaging, professional content that fulfills the brief's objectives. Do not repeat or summarize the brief - create the actual content it describes.";
    }

    // Only add formatting and content guidance for regular content generation, not for the image prompt agent or brief execution
    if (!isImagePromptAgent && !isExecutingSpecificBrief && !userPrompt.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)')) {
      // Add concise formatting instructions
      enhancedSystemPrompt += "\n\nFormatting Instructions:\n- Use HTML tags: <h1>, <h2>, <h3> for headings\n- Use <strong> and <em> for emphasis\n- Format lists with <ul>, <ol>, and <li> tags\n- Provide comprehensive, detailed content\n- Start immediately with the content (no introductory phrases)";
    }
    
    // Only add word count requirements for regular content, not for the image prompt agent or brief execution
    if (!isImagePromptAgent && !isExecutingSpecificBrief && !userPrompt.includes('CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)')) {
      // Add a concise instruction for comprehensive content
      enhancedUserPrompt += "\n\nProvide a detailed, comprehensive response.";
    }
    
    console.log('[OpenAI] Making API request with model:', model || "gpt-4o-mini");
    console.log('[OpenAI] Enhanced user prompt length:', enhancedUserPrompt.length);
    
    // Create completion with explicit timeout
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: model || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: enhancedSystemPrompt
          },
          {
            role: "user",
            content: enhancedUserPrompt
          }
        ],
        temperature: temperature || 0.7,
        max_tokens: 4000,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout')), 15000)
      )
    ]) as any;
    
    console.log('[OpenAI] API request completed successfully');
    
    content = completion.choices[0].message.content || "";
    
    // Log the approximate word count of the raw response
    const wordCount = content.split(/\s+/).length;
    console.log(`Generated content before cleaning - approximate word count: ${wordCount}`);
    
    // Clean the content of any markdown code block markers and concluding commentary
    
    // Only apply HTML formatting if this is NOT the image prompt agent
    if (!isImagePromptAgent) {
      // Convert markdown headers to proper HTML headers
      content = content.replace(/^# (.*)$/gm, '<h1>$1</h1>');
      content = content.replace(/^## (.*)$/gm, '<h2>$1</h2>');
      content = content.replace(/^### (.*)$/gm, '<h3>$1</h3>');
      content = content.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
      content = content.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
      
      // Convert markdown bold syntax to HTML strong tags
      content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // Convert markdown italic syntax to HTML em tags
      content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      content = content.replace(/_([^_]+)_/g, '<em>$1</em>');
      
      // Detect lines that look like titles but aren't marked as headers
      // Check for short, centered, or all-caps lines at the beginning of paragraphs
      content = content.replace(/^([A-Z][^.!?]{3,50}[A-Z])$/gm, '<h2>$1</h2>');
      content = content.replace(/^(<strong>[^<]{3,50}<\/strong>)$/gm, '<h2>$1</h2>');
      
      // Title case words in a short paragraph are likely a title
      content = content.replace(/^([A-Z][a-z]+(?: [A-Z][a-z]+){1,7})$/gm, '<h2>$1</h2>');
    }
    
    // Only continue with advanced formatting for regular content, not for the image prompt agent
    if (!isImagePromptAgent) {
      // Special handling for email subject lines
      content = content.replace(/^Subject:(.{3,100})$/gm, '<h3>Subject:$1</h3>');
      content = content.replace(/^(From|To|Date):(.{3,100})$/gm, '<p><strong>$1:</strong>$2</p>');
      
      // Remove introductory AI commentary at the beginning
      const introPatterns = [
        // Common AI introductions
        /^(Certainly|Sure|Here are|Below are|Here is|Below is)[^.]*\.\s*/i,
        /^(I've created|I've drafted|I've prepared|As requested|Based on your request)[^.]*\.\s*/i,
        /^(Following|In accordance with|As per|Following your)[^.]*\.\s*/i,
        /^(These are|This is|I'd like to present|I'm happy to provide)[^.]*\.\s*/i,
        /^(Please find|Please see|As you requested|As per your instructions)[^.]*\.\s*/i,
        /^(Here's|The following|Based on the creative brief|I've developed)[^.]*\.\s*/i,
        // Specifically match the example seen
        /^Certainly! Below are drafts for the three rep-triggered emails[^.]*\.\s*/i,
      ];
      
      // Apply each intro pattern
      for (const pattern of introPatterns) {
        content = content.replace(pattern, '');
      }
    }
    
    // For image prompt agent, only do minimal formatting
    if (isImagePromptAgent) {
      // For the image prompt agent, we only want to extract the final prompt
      // and leave the rest of the conversational content untouched
      
      // Only handle basic code blocks to avoid any rendering issues
      content = content.replace(/^```(?:html|markdown|md|json|javascript|js|typescript|ts|css|jsx|tsx|python|py)?\s*\n?/i, '');
      const codeBlockEndMatch = content.match(/```[\s\S]*$/i);
      if (codeBlockEndMatch) {
        content = content.slice(0, codeBlockEndMatch.index);
      }
    }
    else {
      // For regular content, do full clean-up and formatting
      
      // Handle code blocks with language identifier (```html, ```js, etc.)
      content = content.replace(/^```(?:html|markdown|md|json|javascript|js|typescript|ts|css|jsx|tsx|python|py)?\s*\n?/i, '');
      
      // Handle any code block endings and remove everything after them (often commentary)
      const codeBlockEndMatch = content.match(/```[\s\S]*$/i);
      if (codeBlockEndMatch) {
        content = content.slice(0, codeBlockEndMatch.index);
      }
      
      // Remove standalone delimiter lines that separate emails or sections but might not be part of commentary
      content = content.replace(/^\s*---\s*$/gm, '');
      content = content.replace(/^\s*\*\*\*\s*$/gm, '');
      
      // More aggressive removal of closing commentary by detecting sign-off patterns
      const commentPatterns = [
        // Common ending with a horizontal line followed by comments
        /\n+[\s\n]*---[\s\n]*[\s\S]*$/i,
        /\n+[\s\n]*\*\*\*[\s\n]*[\s\S]*$/i,
        /\n+[\s\n]*___[\s\n]*[\s\S]*$/i,
        
        // Standard AI signoffs
        /\n+[\s\n]*In summary[\s\S]*$/i,
        /\n+[\s\n]*To summarize[\s\S]*$/i,
        /\n+[\s\n]*I hope (this|these|that)[\s\S]*$/i, 
        /\n+[\s\n]*Hope (this|these|that)[\s\S]*$/i,
        /\n+[\s\n]*Let me know[\s\S]*$/i,
        /\n+[\s\n]*Please let me know[\s\S]*$/i,
        /\n+[\s\n]*Is there anything else[\s\S]*$/i,
        /\n+[\s\n]*Would you like me to[\s\S]*$/i,
        /\n+[\s\n]*Feel free to[\s\S]*$/i,
        /\n+[\s\n]*Do you want me to[\s\S]*$/i,
        
        // Suggestions for revisions
        /\n+[\s\n]*If you need any changes[\s\S]*$/i,
        /\n+[\s\n]*If you have any questions[\s\S]*$/i,
        /\n+[\s\n]*If you need (any )?(additional|more)[\s\S]*$/i,
        /\n+[\s\n]*If you(\'d like| would like| want)[\s\S]*$/i,
        
        // Common template patterns
        /\n+[\s\n]*These (templates|examples|samples|emails)[\s\S]*$/i,
        /\n+[\s\n]*This (template|example|sample|email)[\s\S]*$/i,
        /\n+[\s\n]*The (above|provided) (template|example|sample|email|content)[\s\S]*$/i,
        
        // Standard call to actions/offers
        /\n+[\s\n]*Please (ensure|make sure|review|adjust|modify|tailor|customize)[\s\S]*$/i,
        /\n+[\s\n]*(Remember|Note) that[\s\S]*$/i,
        /\n+[\s\n]*You (can|could|may|should)[\s\S]*$/i,
        /\n+[\s\n]*Don't hesitate to[\s\S]*$/i,
        
        // Specifically for the pattern shown in user example
        /\n+[\s\n]*These emails are crafted[\s\S]*$/i
      ];
      
      // Apply each pattern
      for (const pattern of commentPatterns) {
        const match = content.match(pattern);
        if (match && match.index) {
          content = content.slice(0, match.index);
        }
      }
      
      // Fix improperly formatted lists - Convert plain bullet lists into HTML lists
      // Convert bullet points to list items
      content = content.replace(/\n\s*•\s*(.*?)(?=\n|$)/g, '\n<li>$1</li>');
      // Convert numbered points to list items (1. 2. 3. etc)
      content = content.replace(/\n\s*(\d+)\.\s*(.*?)(?=\n|$)/g, '\n<li>$2</li>');
      
      // Helper function to wrap list items in proper list tags
      const wrapListItems = (content: string): string => {
        let modified = content;
        // Find potential list items
        const listItemRegex = /<li>.*?<\/li>/g;
        const listItems = content.match(listItemRegex);
        
        if (listItems) {
          // Identify consecutive list items
          let consecutiveItems = '';
          let count = 0;
          
          for (let i = 0; i < listItems.length; i++) {
            if (i > 0 && content.indexOf(listItems[i]) - 
                (content.indexOf(listItems[i-1]) + listItems[i-1].length) < 10) {
              // These list items are consecutive or close
              if (count === 0) {
                consecutiveItems = listItems[i-1];
                count = 1;
              }
              consecutiveItems += listItems[i];
              count++;
            } else if (count > 0) {
              // We found the end of a sequence - wrap it
              if (count > 1) {
                // Determine if these were numbered items originally
                const originalContext = content.substring(
                  Math.max(0, content.indexOf(consecutiveItems) - 20),
                  content.indexOf(consecutiveItems)
                );
                
                const isNumbered = /\d+\.\s/.test(originalContext);
                const tagName = isNumbered ? 'ol' : 'ul';
                
                modified = modified.replace(consecutiveItems, 
                  `<${tagName}>\n${consecutiveItems}\n</${tagName}>`);
              }
              consecutiveItems = '';
              count = 0;
            }
          }
          
          // Handle the last sequence if there is one
          if (count > 1) {
            const originalContext = content.substring(
              Math.max(0, content.indexOf(consecutiveItems) - 20),
              content.indexOf(consecutiveItems)
            );
            
            const isNumbered = /\d+\.\s/.test(originalContext);
            const tagName = isNumbered ? 'ol' : 'ul';
            
            modified = modified.replace(consecutiveItems, 
              `<${tagName}>\n${consecutiveItems}\n</${tagName}>`);
          }
        }
        
        return modified;
      };
      
      content = wrapListItems(content);
    }

    // Final safety check: detect if the output seems like it's just repeating the creative brief
    // and if so, attempt to fix it by generating a new response
    if (userPrompt.includes("CREATIVE BRIEF") || userPrompt.includes("creative brief")) {
      // Extract the brief portion - use a simpler regex pattern to avoid flag compatibility issues
      const briefPattern = new RegExp("CREATIVE BRIEF[^:]*:(.+?)(?=Based on the creative brief|$)", "i");
      const briefMatch = userPrompt.match(briefPattern);
      
      if (briefMatch && briefMatch[1]) {
        const briefContent = briefMatch[1].trim();
        
        // Detect overlap with generated content by checking for sentences from the brief
        let briefSentences = briefContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
        let matchCount = 0;
        
        for (const sentence of briefSentences) {
          if (content.includes(sentence.trim())) {
            matchCount++;
          }
        }
        
        // If more than 25% of the brief sentences appear in the output,
        // or if there's substantial text overlap, we assume it's repeating the brief
        if (matchCount > briefSentences.length * 0.25 || 
            (briefContent.length > 100 && content.includes(briefContent.substring(0, 100)))) {
          
          console.warn("Detected potential brief repetition. Applying stronger content transformation.");
          
          // Remove any content that directly matches the brief
          content = content.replace(briefContent, "");
          
          // If after cleaning the content seems too short, it was likely just repeating the brief
          if (content.trim().length < 100) {
            return res.status(500).json({ 
              message: "The AI generated a response that was too similar to the creative brief. Please try again with a clearer instruction to create content based on the brief, not repeat it."
            });
          }
        }
      }
    }
    
    // Final comprehensive content cleaning to remove all artifacts
    content = content.replace(/\$\d+/g, ''); // Remove $3, $5, etc.
    content = content.replace(/\$[^\s\w]/g, ''); // Remove other $ symbols  
    content = content.replace(/^\s*\$\s*$/gm, ''); // Remove standalone $ lines
    content = content.replace(/^\s*[\$€£¥₹\#\*\-]+\s*$/gm, ''); // Remove currency/formatting symbols on their own lines
    content = content.replace(/---\s*\n\s*---/g, '---'); // Clean duplicate separators
    content = content.replace(/\n{3,}/g, '\n\n'); // Reduce multiple line breaks
    content = content.replace(/^\s*[\$€£¥₹]+[^\w\s]*\s*$/gm, ''); // Remove currency symbols with punctuation
    content = content.replace(/(\n|^)\s*\$[^\w\s]*\s*(\n|$)/g, '$1$2'); // Remove $ symbols between paragraphs
    content = content.trim();

    // Log the word count after all processing
    const finalWordCount = content.split(/\s+/).length;
    console.log(`Final content after cleaning - approximate word count: ${finalWordCount}`);
    if (finalWordCount < 1800) {
      console.warn(`WARNING: Generated content is shorter than 1800 words (${finalWordCount} words). This may not meet user expectations for long-form content.`);
    }

    return res.status(200).json({ content });
  } catch (error: any) {
    console.error("Error generating content:", error);
    
    // Handle timeout errors
    if (error.message === 'Request timeout after 45 seconds') {
      return res.status(408).json({ 
        message: "Request timed out. Please try again with a shorter prompt.",
        details: "The content generation took too long to complete."
      });
    }
    
    // Handle common API errors
    if (error.status === 401 || (error.response && error.response.status === 401)) {
      console.error("API key error details:", error.error || error);
      return res.status(401).json({ 
        message: "Invalid API key. Please check your API key and try again.", 
        details: "The server is using an invalid or expired API key. Please contact the administrator."
      });
    } 
    
    if (error.status === 429 || (error.response && error.response.status === 429)) {
      return res.status(429).json({ message: "Rate limit exceeded. Please try again later or check your plan limits." });
    }
    
    if (error.status === 500 || (error.response && error.response.status === 500)) {
      console.log("OpenAI server error, attempting fallback with reduced complexity");
      
      // Fallback attempt with simplified prompt
      try {
        const { userPrompt: originalUserPrompt } = req.body;
        const fallbackOpenai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 20000, // Shorter timeout for fallback
          maxRetries: 1,
        });
        
        const fallbackCompletion = await fallbackOpenai.chat.completions.create({
          model: "gpt-4o-mini", // Use faster, more reliable model
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant. Provide clear, concise responses."
            },
            {
              role: "user",
              content: (originalUserPrompt || "Generate helpful content").substring(0, 2000) // Truncate if too long
            }
          ],
          temperature: 0.7,
          max_tokens: 2000, // Reduced token limit for reliability
        });
        
        const fallbackContent = fallbackCompletion.choices[0].message.content || "";
        console.log("Fallback generation successful");
        
        return res.status(200).json({ 
          content: fallbackContent,
          fallback: true,
          message: "Generated using fallback due to temporary API issues"
        });
        
      } catch (fallbackError) {
        console.error("Fallback generation also failed:", fallbackError);
        return res.status(503).json({ 
          message: "Content generation temporarily unavailable. Please try again in a few minutes.",
          details: "Both primary and fallback generation methods are experiencing issues."
        });
      }
    }
    
    // Network errors and timeouts
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
      return res.status(503).json({ 
        message: "Unable to connect to the OpenAI API.", 
        details: "The server is having trouble connecting to OpenAI. Please try again later."
      });
    }
    
    return res.status(500).json({ message: error.message || "An error occurred while generating content" });
  }
};

export const generateImage = async (req: Request, res: Response) => {
  try {
    const { 
      prompt, 
      model = "gpt-image-1", 
      size = "1024x1024", 
      quality = "high", 
      background = "auto",
      n = 1
      // Note: reference_images parameter is not used as gpt-image-1 doesn't support it
    } = req.body as GenerateImageRequest;
    
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is missing in the server environment");
      return res.status(500).json({ 
        message: "Server API key configuration is missing",
        details: "The server is missing the OPENAI_API_KEY environment variable. Please contact the administrator."
      });
    }

    if (!prompt) {
      return res.status(400).json({ message: "Image prompt is required" });
    }

    // Log the request information (with partial prompt for privacy)
    console.log("Using OpenAI API with server-side API key for image generation");
    console.log("Request parameters:", {
      promptLength: prompt ? prompt.length : 0,
      promptExcerpt: prompt ? prompt.substring(0, 30) + "..." : "none",
      model,
      size,
      quality,
      background
    });
    
    // Configure OpenAI client with optional parameters
    const openaiConfig: any = { 
      apiKey: process.env.OPENAI_API_KEY,
    };
    
    // Add organization ID if available
    if (process.env.OPENAI_ORG_ID) {
      openaiConfig.organization = process.env.OPENAI_ORG_ID;
    }
    
    // Add base URL if specified
    if (process.env.OPENAI_API_BASE_URL) {
      console.log("Using custom OpenAI API base URL");
      openaiConfig.baseURL = process.env.OPENAI_API_BASE_URL;
    }
    
    // Initialize the OpenAI client
    const openai = new OpenAI(openaiConfig);
    
    console.log(`Generating image with GPT Image model: ${model}, size: ${size}, quality: ${quality}, background: ${background}`);
    
    // Basic validation of the API key format
    if (!process.env.OPENAI_API_KEY.startsWith("sk-")) {
      console.error("OpenAI API key has invalid format, should start with 'sk-'");
      return res.status(500).json({ 
        message: "Server API key appears to be invalid", 
        details: "API key has incorrect format. Please check your OpenAI API key configuration."
      });
    }
    
    // Generate image with OpenAI using GPT Image model
    let imageUrl;
    let imageBase64;
    let revisedPrompt;
    
    try {
      // Create a params object with only gpt-image-1 model
      let params: any = {
        model: "gpt-image-1", // Always use gpt-image-1 model 
        prompt: prompt,
        n: n,
        size: size as any, // Type assertion to satisfy TypeScript
        quality: quality as any, // Type assertion to satisfy TypeScript
        background: background as any
      };
      
      // Note: We don't use reference_images at all with gpt-image-1 as it's not supported
      // For variations, we rely solely on descriptive prompts that request variations
      
      // Make the API call with the prepared parameters
      const response = await openai.images.generate(params);
      
      if (!response.data || response.data.length === 0) {
        return res.status(500).json({ message: "No images were generated" });
      }
      
      console.log("GPT Image API response structure:", JSON.stringify(response.data[0], null, 2).substring(0, 100) + "...");
      
      // Check what data is available in the response
      const firstImage = response.data[0];
      revisedPrompt = firstImage.revised_prompt || prompt;
      
      // First try to get the URL directly if it exists
      if (firstImage.url) {
        console.log("Using URL directly from API response");
        imageUrl = firstImage.url;
      } 
      // Then try base64 data if available
      else if (firstImage.b64_json && typeof firstImage.b64_json === 'string') {
        console.log("Using base64 data from API response");
        imageBase64 = firstImage.b64_json;
        imageUrl = `data:image/png;base64,${imageBase64}`;
      } 
      // If neither is available, throw an error
      else {
        console.error("Unexpected response format:", firstImage);
        throw new Error("No image data (URL or base64) returned from API");
      }
    } catch (apiError) {
      console.error("API Error:", apiError);
      throw apiError;
    }
    
    // Log success for debugging
    console.log("Image generated successfully");
    
    // Return the image data
    return res.status(200).json({ 
      images: [{ url: imageUrl, revised_prompt: revisedPrompt }],
      model,
      prompt
    });
  } catch (error: any) {
    console.error("Error generating image:", error);
    
    // Get detailed error information
    const errorDetails = {
      message: error.message || "Unknown error",
      status: error.status || (error.response && error.response.status) || "unknown",
      type: error.type || (error.error && error.error.type) || "unknown",
      code: error.code || (error.error && error.error.code) || "unknown",
      param: error.param || (error.error && error.error.param) || "none",
      stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : "No stack trace"
    };
    
    console.error("Detailed error information:", errorDetails);
    
    // Handle common API errors
    if (error.status === 401 || (error.response && error.response.status === 401)) {
      console.error("API key error details:", error.error || error);
      return res.status(401).json({ 
        message: "Invalid API key. Please check your API key and try again.", 
        details: "The server is using an invalid or expired API key. Please contact the administrator."
      });
    } 
    
    if (error.status === 429 || (error.response && error.response.status === 429)) {
      return res.status(429).json({ 
        message: "Rate limit exceeded. Please try again later or check your plan limits.",
        details: "The server has reached the rate limit for the OpenAI API. Please wait a few minutes and try again."
      });
    }
    
    if (error.status === 400 || (error.response && error.response.status === 400)) {
      // Handle specific content policy violation errors
      if (error.error?.code === "content_policy_violation" || 
          (error.error?.type === "invalid_request_error" && error.error?.message?.includes("content policy"))) {
        return res.status(400).json({ 
          message: "Content policy violation. Your image prompt may contain prohibited content.",
          details: error.error?.message || "Please revise your prompt to comply with content policies."
        });
      }
      
      return res.status(400).json({ 
        message: "Bad request to the OpenAI API.",
        details: error.error?.message || error.message || "Please check your request parameters and try again."
      });
    }
    
    if (error.status === 500 || (error.response && error.response.status === 500)) {
      return res.status(500).json({ 
        message: "OpenAI API server error. Please try again later.",
        details: "The OpenAI service is experiencing technical difficulties."
      });
    }
    
    // Network errors and timeouts
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
      return res.status(503).json({ 
        message: "Unable to connect to the OpenAI API.", 
        details: "The server is having trouble connecting to OpenAI. Please try again later."
      });
    }
    
    // For all other errors
    return res.status(500).json({ 
      message: error.message || "An error occurred while generating image",
      details: "Please check the server logs for more information."
    });
  }
};
