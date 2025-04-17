import OpenAI from "openai";
import { Request, Response } from "express";

export interface GenerateContentRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
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
    
    // Enhance system prompt to avoid commentary
    let enhancedSystemPrompt = systemPrompt || "You are a helpful assistant.";
    
    // Add explicit instructions to avoid commentary at the end
    enhancedSystemPrompt += "\n\nIMPORTANT: Provide ONLY the requested deliverable content. Do NOT add any comments, explanations, notes, or disclaimers at the end. Do NOT add signatures like 'I hope this helps' or 'Let me know if you need changes'. Do NOT add horizontal lines (---, ***, ___) or any separators at the end. End your response with the last line of actual content.";
    
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
          content: userPrompt
        }
      ],
      temperature: temperature || 0.7,
    });
    
    content = completion.choices[0].message.content || "";
    
    // Clean the content of any markdown code block markers and concluding commentary
    
    // Handle code blocks with language identifier (```html, ```js, etc.)
    content = content.replace(/^```(?:html|markdown|md|json|javascript|js|typescript|ts|css|jsx|tsx|python|py)?\s*\n?/i, '');
    
    // Handle any code block endings and remove everything after them (often commentary)
    const codeBlockEndMatch = content.match(/```[\s\S]*$/i);
    if (codeBlockEndMatch) {
      content = content.slice(0, codeBlockEndMatch.index);
    }
    
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
