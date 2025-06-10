/**
 * Brief Analysis: Working vs Timeout Comparison
 */

// Working briefs from the logs and tests
const workingBriefs = {
  nike_vw: {
    content: `CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)

Project: Nike x Volkswagen Beetle Shoe Collaboration
Objective: Create engaging social media content for product launch
Target Audience: Sneaker enthusiasts aged 18-35
Key Messages: Fusion of automotive heritage with athletic innovation
Deliverables: 
- Instagram post caption (engaging, trendy)
- Twitter thread (3-4 tweets)
- Facebook post (community-focused)

Brand Guidelines: Use energetic tone, highlight collaboration uniqueness`,
    length: 486,
    lines: 11,
    success: true,
    provider: 'openai',
    time: '6.5 seconds'
  },
  
  sample_brief: {
    content: `CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT):

S a m p l e C r e a t i v e B r i e f P r o j e c t T i t l e : B r e a t h E a s e H C P R e p - T r i g g e r e d E m a i l C a m p a i g n...`,
    length: 2000, // Estimated from file
    lines: 6,
    success: true,
    provider: 'anthropic/openai',
    time: '~20 seconds',
    note: 'Has weird spacing but works'
  }
};

// Timeout brief
const timeoutBrief = {
  loreal: {
    content: `CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT)

Project: L'Oreal Professional Hair Care Campaign
Objective: Launch premium anti-aging hair serum targeting professional women
Target Audience: Career-focused women aged 30-50 with disposable income
Deliverables:
- Press release headline and opening paragraph
- Email marketing subject line and preview text
- Social media package (LinkedIn post, Instagram story, Twitter thread)
- Product description for website
Tone: Sophisticated, empowering, results-driven
Key Messages: Advanced formula, visible results in 7 days, professional-grade quality`,
    length: 710,
    lines: 12,
    success: false,
    timeout: '40+ seconds across multiple providers'
  }
};

// Analysis function
function analyzeComplexity() {
  console.log('=== BRIEF COMPLEXITY ANALYSIS ===');
  
  // Analyze structure patterns
  const patterns = {
    multiLineDeliverables: /Deliverables:\s*\n\s*-.*\n\s*-.*\n\s*-/s,
    detailedDescriptions: /targeting|professional|sophisticated|advanced|premium/gi,
    multipleChannels: /LinkedIn|Instagram|Twitter|Facebook|email|press/gi,
    specificRequirements: /headline and opening paragraph|subject line and preview text/gi,
    brandComplexity: /L'Oreal|Professional|Career-focused|disposable income/gi
  };
  
  console.log('\n--- Pattern Analysis ---');
  
  Object.entries({...workingBriefs, ...timeoutBrief}).forEach(([name, brief]) => {
    console.log(`\n${name.toUpperCase()}:`);
    console.log(`Length: ${brief.content?.length || brief.length} chars`);
    console.log(`Lines: ${brief.content?.split('\n').length || brief.lines}`);
    
    if (brief.content) {
      const deliverables = (brief.content.match(patterns.multiLineDeliverables) || []).length;
      const channels = (brief.content.match(patterns.multipleChannels) || []).length;
      const complexity = (brief.content.match(patterns.detailedDescriptions) || []).length;
      const specific = (brief.content.match(patterns.specificRequirements) || []).length;
      
      console.log(`Multi-line deliverables: ${deliverables > 0 ? 'YES' : 'NO'}`);
      console.log(`Multiple channels: ${channels}`);
      console.log(`Complexity indicators: ${complexity}`);
      console.log(`Specific requirements: ${specific}`);
      console.log(`Success: ${brief.success ? 'YES' : 'NO'}`);
    }
  });
  
  // Key findings
  console.log('\n=== KEY FINDINGS ===');
  console.log('Working briefs:');
  console.log('- Nike/VW: Simple structure, 3 basic deliverables, 486 chars');
  console.log('- Sample: Long but simple format, basic email requirements');
  
  console.log('\nTimeout brief:');
  console.log('- L\'Oreal: Multi-line detailed deliverables');
  console.log('- Complex sub-requirements (headline AND paragraph)');
  console.log('- Multiple channel types (press, email, social)');
  console.log('- Sophisticated language complexity');
  
  console.log('\n=== TIMEOUT CAUSES ===');
  console.log('1. NESTED DELIVERABLES: "headline and opening paragraph"');
  console.log('2. MULTI-CHANNEL COMPLEXITY: press + email + 3 social platforms');
  console.log('3. DETAILED SPECIFICATIONS: "subject line and preview text"');
  console.log('4. BRAND SOPHISTICATION: L\'Oreal professional positioning');
  console.log('5. TARGET COMPLEXITY: "Career-focused women aged 30-50 with disposable income"');
  
  return {
    timeoutFactors: [
      'Nested deliverable requirements (headline AND paragraph)',
      'Multi-channel deliverables (5+ different content types)',
      'Detailed sub-specifications for each deliverable', 
      'Premium brand positioning language',
      'Complex target audience descriptions'
    ],
    solution: 'Simplify nested requirements into single deliverables'
  };
}

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { analyzeComplexity, workingBriefs, timeoutBrief };
}

// Run analysis
analyzeComplexity();