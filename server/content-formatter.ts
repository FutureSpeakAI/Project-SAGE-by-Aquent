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
    // Generate a basic structured response when all APIs fail
    const topic = prompt.toLowerCase().includes('oreal') ? "L'Oréal" : 
                 prompt.toLowerCase().includes('campaign') ? "Campaign" : "Content";
    
    return `
<h1>${topic} Marketing Brief</h1>

<h2>Campaign Overview</h2>
<p>Professional marketing campaign designed to engage target audiences and drive measurable results.</p>

<h2>Key Objectives</h2>
<ul>
<li>Increase brand awareness and recognition</li>
<li>Drive customer engagement and interaction</li>
<li>Generate qualified leads and conversions</li>
<li>Build long-term customer relationships</li>
</ul>

<h2>Target Audience</h2>
<p>Primary demographic segments based on market research and customer analysis.</p>

<h2>Creative Strategy</h2>
<p>Multi-channel approach leveraging digital and traditional marketing channels for maximum reach and impact.</p>

<h2>Success Metrics</h2>
<p>Measurable KPIs including engagement rates, conversion metrics, and ROI analysis.</p>

<p><em>Note: This is a basic framework. For detailed, customized content, please try again when AI services are available.</em></p>
    `.trim();
  }
}