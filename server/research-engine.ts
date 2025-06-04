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
      researchQuery = `Analyze successful marketing campaigns related to: ${userQuery}. Include recent campaign examples, creative strategies, channel mix, engagement tactics, and measurable outcomes from effective campaigns with specific campaign names and metrics.`;
    } else if (researchContext.includes("product research")) {
      researchQuery = `Research product positioning and features for: ${userQuery}. Include feature analysis, value propositions, user experience patterns, pricing strategies, and successful product launch approaches with specific product examples.`;
    } else {
      researchQuery = `Research comprehensive insights about: ${userQuery}. ${researchContext}`;
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "You are a research specialist. Provide comprehensive, factual research with current data, specific examples, and actionable insights. Include sources and current information. Focus on real companies, actual data points, and specific examples rather than general advice."
          },
          {
            role: "user",
            content: researchQuery
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
        search_recency_filter: "month",
        return_citations: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const researchContent = data.choices?.[0]?.message?.content || "No research data available";
    const citations = data.citations || [];
    
    // Format research with citations
    let formattedResearch = researchContent;
    if (citations.length > 0) {
      formattedResearch += "\n\nSources: " + citations.slice(0, 5).join(", ");
    }
    
    return formattedResearch;
    
  } catch (error) {
    console.error('Research error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `Research unavailable: ${errorMessage}. Please provide your PERPLEXITY_API_KEY for real-time research capabilities.`;
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