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
    
    // Initialize the OpenAI client
    const openai = new OpenAI(openaiConfig);
    
    // Check if this is a request from the image prompt agent
    const isImagePromptAgent = systemPrompt.includes("CONVERSATIONAL DIALOGUE") && 
                              systemPrompt.includes("Image Generation Prompt Expert");
    
    let enhancedSystemPrompt = systemPrompt || "You are a helpful assistant.";
    let enhancedUserPrompt = userPrompt;
    
    // Only add formatting and content guidance for regular content generation, not for the image prompt agent
    if (!isImagePromptAgent) {
      // Add more explicit instructions to prevent ANY commentary, introduction, or explanation
      enhancedSystemPrompt += "\n\nCRITICALLY IMPORTANT INSTRUCTIONS: \n1. If the user prompt contains a creative brief or instructions, DO NOT REPEAT OR SUMMARIZE THE BRIEF ITSELF. Instead, create the ACTUAL CONTENT requested by the brief.\n2. Provide ONLY the final deliverable content WITHOUT ANY INTRODUCTION OR COMMENTARY OF ANY KIND. \n3. DO NOT start with phrases like 'Here are' or 'Below are' or 'Certainly'. \n4. DO NOT include ANY explanatory text before or after the content. \n5. DO NOT add ANY signatures, disclaimers, or notes at the end. \n6. DO NOT include any separators like '---' or '***'. \n7. BEGIN YOUR RESPONSE WITH THE ACTUAL CONTENT IMMEDIATELY. \n8. No introduction, no explanation, no commentary, no conclusion. \n9. If the user provides a creative brief labeled as such, ONLY GENERATE THE END DELIVERABLE described in the brief, not a restatement of the brief itself.\n10. Use proper HTML tags for formatting: <h1> for main titles, <h2> for section headers, <h3> for subsections. Don't use markdown or asterisks for headings.\n11. For emphasis, use <strong> or <em> tags instead of markdown syntax.\n12. Format lists using <ol> and <ul> with <li> elements for proper structure.\n13. ALWAYS PROVIDE LONG-FORM CONTENT. Generate a MINIMUM of 1800-3000 words for articles, blog posts, whitepapers, or any content where length is appropriate. Never abbreviate or summarize - deliver comprehensive, detailed content.\n14. Structure long-form content with at least 5-8 detailed sections with appropriate subheadings, thorough explanations, and deep exploration of the topic from multiple angles.\n15. Don't self-censor or artificially limit the length of the content - when in doubt, write more detailed and comprehensive content.\n16. For article-style content, include an introduction, at least 5-7 body sections, and a conclusion. Make each body section substantial with 300-500 words minimum.\n17. When creating long-form content, provide thorough explanations and examples for each point, developing ideas fully rather than briefly mentioning them.";
    }
    
    // Only add word count requirements for regular content, not for the image prompt agent
    if (!isImagePromptAgent) {
      // If the prompt contains any mention of word count, we'll emphasize it
      if (userPrompt.match(/\b(\d{3,4})\s*(word|words)\b/i)) {
        // Extract the requested word count
        const match = userPrompt.match(/\b(\d{3,4})\s*(word|words)\b/i);
        const requestedWordCount = match ? parseInt(match[1]) : 1800;
        
        // Add a final reminder at the end of the user prompt
        enhancedUserPrompt += `\n\nIMPORTANT: Please ensure your response is at least ${requestedWordCount} words in length, preferably longer. Be extremely detailed and comprehensive.`;
      } else {
        // If no specific word count was specified, add a default instruction for long-form content
        enhancedUserPrompt += "\n\nIMPORTANT: Please provide a detailed, comprehensive response of at least 2000 words. Be thorough and expansive in your coverage of the topic.";
      }
    }
    
    // Create completion with the OpenAI SDK
    const completion = await openai.chat.completions.create({
      model: model || "gpt-4o",
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
      max_tokens: 8000, // Further increased token limit to allow for approximately 6000 words
    });
    
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
    
    // Log the word count after all processing
    const finalWordCount = content.split(/\s+/).length;
    console.log(`Final content after cleaning - approximate word count: ${finalWordCount}`);
    if (finalWordCount < 1800) {
      console.warn(`WARNING: Generated content is shorter than 1800 words (${finalWordCount} words). This may not meet user expectations for long-form content.`);
    }

    return res.status(200).json({ content });
  } catch (error: any) {
    console.error("Error generating content:", error);
    
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
      return res.status(500).json({ message: "API server error. Please try again later." });
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
