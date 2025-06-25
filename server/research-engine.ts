import fetch from 'node-fetch';

export interface ResearchResult {
  content: string;
  sources?: string[];
  confidence: 'high' | 'medium' | 'low';
  timestamp: string;
}

// Deep research function using Perplexity API
export async function performDeepResearch(userQuery: string, researchContext: string): Promise<string> {
  try {
    // Check if Perplexity API key is available
    if (!process.env.PERPLEXITY_API_KEY) {
      return "Deep research requires Perplexity API configuration. Please provide your PERPLEXITY_API_KEY to enable real-time research capabilities.";
    }

    // Build research query based on context type
    let researchQuery = "";
    
    if (researchContext.includes("competitor analysis")) {
      researchQuery = `Conduct comprehensive competitor analysis for: ${userQuery}. Include current market players, their strategies, pricing, positioning, recent campaigns, and competitive advantages. Focus on actionable competitive intelligence with specific company names and data.`;
    } else if (researchContext.includes("market research")) {
      researchQuery = `Perform detailed market research for: ${userQuery}. Include market size, growth trends, customer segments, emerging opportunities, industry challenges, and key market dynamics. Provide current data and statistics with specific numbers.`;
    } else if (researchContext.includes("brand analysis")) {
      researchQuery = `Analyze brand voice and messaging patterns for companies in: ${userQuery}. Include tone of voice examples, messaging frameworks, brand personality traits, and successful communication strategies from leading brands with specific examples.`;
    } else if (researchContext.includes("design trends")) {
      researchQuery = `Research current design and visual trends for: ${userQuery}. Include color palettes, typography trends, layout patterns, visual aesthetics, and emerging design approaches currently being used in this space with specific examples.`;
    } else if (researchContext.includes("campaign analysis")) {
      researchQuery = `Provide a comprehensive list of all major advertising campaigns by ${userQuery} in 2024. Include: campaign names, launch dates, featured celebrities/athletes, creative agencies, budgets (if available), key messaging, target demographics, channels used, creative strategies, and measurable outcomes. Focus on North American campaigns with specific details and metrics.`;
    } else if (researchContext.includes("product research")) {
      researchQuery = `Research product positioning and features for: ${userQuery}. Include feature analysis, value propositions, user experience patterns, pricing strategies, and successful product launch approaches with specific product examples.`;
    } else {
      researchQuery = `Research comprehensive insights about: ${userQuery}. ${researchContext}`;
    }

    // Use Anthropic as primary research provider with comprehensive prompting
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: `As a strategic marketing research specialist, conduct comprehensive analysis for: ${researchQuery}

Provide detailed research including:

**Brand Positioning & Strategy**
- Current market position and competitive landscape
- Brand differentiation and unique value propositions
- Strategic positioning versus key competitors

**Messaging & Communication Analysis**
- Core brand messaging framework and key themes
- Tone of voice and communication style analysis
- Target audience messaging adaptation strategies

**Market Context & Performance**
- Industry trends and market dynamics
- Consumer behavior patterns and preferences
- Recent campaign performance and strategic initiatives

**Competitive Intelligence**
- Direct competitor analysis and positioning
- Competitive messaging strategies and market gaps
- Emerging threats and market opportunities

**Strategic Insights & Recommendations**
- Actionable recommendations for campaign development
- Risk factors and market challenges to consider
- Future growth opportunities and expansion potential

Focus on specific examples, data points, and strategic context. Provide actionable insights that can inform marketing strategy and campaign development decisions.`
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic research API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const researchContent = data.content?.[0]?.text || "";
    
    if (!researchContent) {
      throw new Error('No research content received from Anthropic');
    }

    // Format the research with better structure
    const formattedResearch = `# Research Analysis: ${userQuery}

${researchContent}

---
*Research completed using advanced AI analysis to provide strategic context for campaign development and brand positioning decisions.*`;

    console.log('Research completed successfully:', {
      provider: 'Anthropic',
      query: userQuery,
      contentLength: formattedResearch.length
    });
    
    return formattedResearch;
    
  } catch (error) {
    console.error('Primary research error:', error);
    
    // Fallback to OpenAI for research
    console.log('Anthropic unavailable, using OpenAI research fallback...');
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: 'You are a strategic marketing research specialist. Provide comprehensive brand analysis with specific examples, competitive intelligence, and actionable insights for campaign development.'
          }, {
            role: 'user',
            content: `Conduct comprehensive research analysis for: ${researchQuery}

Provide detailed strategic analysis including brand positioning, competitive landscape, messaging frameworks, market dynamics, and actionable recommendations. Focus on specific examples and strategic context that can inform marketing campaign development.`
          }],
          max_tokens: 3000,
          temperature: 0.2
        })
      });

      if (response.ok) {
        const openaiData = await response.json();
        const openaiContent = openaiData.choices[0]?.message?.content || "";
        console.log('OpenAI research fallback successful');
        return `# Research Analysis: ${userQuery}

${openaiContent}

---
*Research completed using AI analysis to provide strategic context for campaign development.*`;
      } else {
        throw new Error(`OpenAI fallback failed: ${response.status}`);
      }
    } catch (fallbackError) {
      console.error('Research fallback error:', fallbackError);
      throw new Error('Research services temporarily unavailable');
    }
  }
}

// Test cases for deep research functionality
export const researchTestCases = [
  {
    name: "Competitor Analysis - SaaS CRM",
    userQuery: "SaaS CRM software for small businesses",
    researchContext: "competitor analysis",
    expectedElements: [
      "Salesforce", "HubSpot", "Pipedrive", "Zoho",
      "pricing", "features", "market share", "strategies"
    ]
  },
  {
    name: "Market Research - Electric Vehicles",
    userQuery: "electric vehicle market 2024",
    researchContext: "market research",
    expectedElements: [
      "market size", "growth rate", "Tesla", "trends",
      "adoption rates", "government policies", "charging infrastructure"
    ]
  },
  {
    name: "Brand Analysis - Fintech",
    userQuery: "fintech startup brand messaging",
    researchContext: "brand analysis",
    expectedElements: [
      "trust", "security", "innovation", "accessibility",
      "tone of voice", "messaging examples", "brand positioning"
    ]
  },
  {
    name: "Design Trends - E-commerce",
    userQuery: "e-commerce website design trends 2024",
    researchContext: "design trends",
    expectedElements: [
      "minimalism", "mobile-first", "color palettes", "typography",
      "user experience", "conversion optimization", "visual examples"
    ]
  },
  {
    name: "Campaign Analysis - Sustainability",
    userQuery: "sustainability marketing campaigns",
    researchContext: "campaign analysis",
    expectedElements: [
      "campaign examples", "engagement metrics", "creative strategies",
      "target audiences", "channels", "measurable outcomes"
    ]
  },
  {
    name: "Product Research - AI Tools",
    userQuery: "AI productivity tools positioning",
    researchContext: "product research",
    expectedElements: [
      "feature comparison", "pricing strategies", "value propositions",
      "user feedback", "market positioning", "competitive advantages"
    ]
  }
];

// Function to validate research quality
export function validateResearchQuality(researchResult: string, expectedElements: string[]): {
  score: number;
  missingElements: string[];
  hasSpecificData: boolean;
} {
  const lowerResult = researchResult.toLowerCase();
  
  // Check for expected elements
  const foundElements = expectedElements.filter(element => 
    lowerResult.includes(element.toLowerCase())
  );
  
  const missingElements = expectedElements.filter(element => 
    !lowerResult.includes(element.toLowerCase())
  );
  
  // Check for specific data indicators
  const hasNumbers = /\d+/.test(researchResult);
  const hasCompanyNames = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/.test(researchResult);
  const hasSources = researchResult.includes("Sources:");
  const hasSpecificData = hasNumbers && hasCompanyNames;
  
  const score = (foundElements.length / expectedElements.length) * 100;
  
  return {
    score,
    missingElements,
    hasSpecificData: hasSpecificData && hasSources
  };
}