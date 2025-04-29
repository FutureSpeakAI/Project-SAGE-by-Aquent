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
  style?: string;
  n?: number;
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
    
    // Enhance system prompt with strict instructions to avoid commentary
    let enhancedSystemPrompt = systemPrompt || "You are a helpful assistant.";
    
    // Add more explicit instructions to prevent ANY commentary, introduction, or explanation
    enhancedSystemPrompt += "\n\nCRITICALLY IMPORTANT INSTRUCTIONS: \n1. If the user prompt contains a creative brief or instructions, DO NOT REPEAT OR SUMMARIZE THE BRIEF ITSELF. Instead, create the ACTUAL CONTENT requested by the brief.\n2. Provide ONLY the final deliverable content WITHOUT ANY INTRODUCTION OR COMMENTARY OF ANY KIND. \n3. DO NOT start with phrases like 'Here are' or 'Below are' or 'Certainly'. \n4. DO NOT include ANY explanatory text before or after the content. \n5. DO NOT add ANY signatures, disclaimers, or notes at the end. \n6. DO NOT include any separators like '---' or '***'. \n7. BEGIN YOUR RESPONSE WITH THE ACTUAL CONTENT IMMEDIATELY. \n8. No introduction, no explanation, no commentary, no conclusion. \n9. If the user provides a creative brief labeled as such, ONLY GENERATE THE END DELIVERABLE described in the brief, not a restatement of the brief itself.\n10. Use proper HTML tags for formatting: <h1> for main titles, <h2> for section headers, <h3> for subsections. Don't use markdown or asterisks for headings.\n11. For emphasis, use <strong> or <em> tags instead of markdown syntax.\n12. Format lists using <ol> and <ul> with <li> elements for proper structure.\n13. ALWAYS PROVIDE LONG-FORM CONTENT. Generate a MINIMUM of 1800-3000 words for articles, blog posts, whitepapers, or any content where length is appropriate. Never abbreviate or summarize - deliver comprehensive, detailed content.\n14. Structure long-form content with at least 5-8 detailed sections with appropriate subheadings, thorough explanations, and deep exploration of the topic from multiple angles.\n15. Don't self-censor or artificially limit the length of the content - when in doubt, write more detailed and comprehensive content.\n16. For article-style content, include an introduction, at least 5-7 body sections, and a conclusion. Make each body section substantial with 300-500 words minimum.\n17. When creating long-form content, provide thorough explanations and examples for each point, developing ideas fully rather than briefly mentioning them.";
    
    // Add specific word count instructions directly in the user prompt
    let enhancedUserPrompt = userPrompt;
    
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
    const { prompt, model = "dall-e-3", size = "1024x1024", quality = "standard", style = "vivid", n = 1 } = req.body as GenerateImageRequest;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "Server API key configuration is missing" });
    }

    if (!prompt) {
      return res.status(400).json({ message: "Image prompt is required" });
    }

    console.log("Using OpenAI API with server-side API key for image generation");
    
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
    
    // Generate image with OpenAI
    const response = await openai.images.generate({
      model: model,
      prompt: prompt,
      n: n,
      size: size as any, // Type assertion to satisfy TypeScript
      quality: quality as any, // Type assertion to satisfy TypeScript
      style: style as any, // Type assertion to satisfy TypeScript
    });

    if (!response.data || response.data.length === 0) {
      return res.status(500).json({ message: "No images were generated" });
    }

    // Return the image data
    return res.status(200).json({ 
      images: response.data,
      model,
      prompt
    });
  } catch (error: any) {
    console.error("Error generating image:", error);
    
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
    
    return res.status(500).json({ message: error.message || "An error occurred while generating image" });
  }
};
