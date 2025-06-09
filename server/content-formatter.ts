export class ContentFormatter {
  static cleanAndFormat(content: string): string {
    if (!content) return "";

    // Remove all currency artifacts and placeholder symbols
    content = content.replace(/\$\d+/g, '');
    content = content.replace(/^\s*[\$\#\*\-\+]+\s*/gm, '');
    content = content.replace(/\$\s*(\w+)/g, '$1'); // Remove $ before words
    
    // Fix specific formatting issues seen in L'Oréal brief
    content = content.replace(/^(Platform|Campaign Duration|Objective|Target Audience):\s*\$?\d*\s*/gm, '$1: ');
    content = content.replace(/\$\s*(Platform|Facebook|Creative|Visual)/g, '$1');
    
    // Clean up line breaks and spacing
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.replace(/^\s+|\s+$/gm, ''); // Trim lines
    
    // Convert markdown to HTML for better display
    content = content.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    content = content.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    content = content.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Ensure proper section headers
    content = content.replace(/^([A-Z][a-z\s&]+)$/gm, '<h2>$1</h2>');
    content = content.replace(/^([A-Z][A-Z\s]+)$/gm, '<h2>$1</h2>');
    
    // Clean up any remaining artifacts
    content = content.replace(/\s+<h/g, '\n<h');
    content = content.replace(/<\/h[1-6]>\s*/g, '</h1>\n');
    
    return content.trim();
  }

  static validateQuality(content: string): boolean {
    // Check if content looks properly formatted
    const hasProperStructure = content.includes('<h') || content.includes('**') || content.length > 100;
    const hasArtifacts = /\$\d+/.test(content) || /^\s*[\$\#\*\-]+/.test(content);
    
    return hasProperStructure && !hasArtifacts;
  }

  static generateFallbackContent(prompt: string): string {
    // Detect if this is executing deliverables from a brief
    const isExecutingFromBrief = prompt.toLowerCase().includes('brief') || 
                                 prompt.toLowerCase().includes('campaign') ||
                                 (prompt.toLowerCase().includes('create') && 
                                  (prompt.toLowerCase().includes('post') || 
                                   prompt.toLowerCase().includes('social') ||
                                   prompt.toLowerCase().includes('content')));

    const isSocialPostRequest = prompt.toLowerCase().includes('social') || 
                               prompt.toLowerCase().includes('post') || 
                               prompt.toLowerCase().includes('facebook') ||
                               prompt.toLowerCase().includes('instagram');

    if (isExecutingFromBrief || isSocialPostRequest) {
      // Generate actual deliverables instead of briefs
      const brand = prompt.toLowerCase().includes('oreal') ? "L'Oréal" : "Brand";
      return `
<h1>Social Media Posts</h1>

<h2>Post 1</h2>
<p><strong>Transform your skin with ${brand}!</strong> Experience visible results in just 4 weeks. Our advanced formula delivers clinical-grade anti-aging benefits. #AntiAging #Skincare #BeautyEssentials</p>
<p><strong>Visual:</strong> Product hero shot with elegant lighting</p>

<h2>Post 2</h2>
<p><strong>Luxury meets science.</strong> Discover the power of professional-grade skincare at home. Reduce fine lines and reveal your youthful glow. #LuxurySkincare #SkincareThatWorks #BeautyGoals</p>
<p><strong>Visual:</strong> Before/after transformation imagery</p>

<h2>Post 3</h2>
<p><strong>Your skin deserves the best.</strong> Join thousands who have experienced the difference. Premium ingredients, proven results. #SkincareRoutine #BeautyTips #GlowUp</p>
<p><strong>Visual:</strong> Lifestyle shot showing confident, radiant skin</p>

<p><em>Note: This is basic content generated during API unavailability. For customized, high-quality posts, please try again when services are stable.</em></p>`;
    }

    // This should never execute since we have comprehensive social media fallback above
    return `
<h1>Content Generation Unavailable</h1>
<p>All AI services are temporarily unavailable. Please try again in a moment for your content request.</p>
    `.trim();
  }
}