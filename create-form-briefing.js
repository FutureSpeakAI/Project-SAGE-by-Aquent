/**
 * Script to create a sample briefing through the form interface
 * This simulates filling out all the individual form fields
 */

const createFormBriefing = async () => {
  const formData = {
    // Project Details
    projectName: "FreshMart Organic Grocery Launch",
    projectDescription: "Grand opening campaign for new organic grocery store targeting health-conscious families in downtown area",
    projectBackground: "Family-owned business expanding from successful farmers market presence to first brick-and-mortar location. Known for high-quality local organic produce.",
    
    // Audience & Objectives  
    targetAudience: "Health-conscious families and young professionals aged 25-45 living within 5 miles of downtown location. Primary shoppers who prioritize organic, local food options.",
    objectives: "Generate 500 new customers in first month, achieve 20% brand awareness in local area, establish store as go-to destination for organic groceries",
    keyMessages: "Fresh, Local, Organic - Your Neighborhood Health Food Destination. Supporting local farmers while nourishing your family.",
    
    // Content Parameters
    contentType: "Email",
    contentTones: ["Professional", "Educational"], 
    contentLength: "Medium (500-1000 words)",
    
    // Deliverables & Timeline
    deliverables: "2 email campaigns (grand opening announcement with special offers, weekly specials newsletter), 3 social media posts (virtual store tour, featured local products, community involvement story)",
    timeline: "4-week launch campaign starting 2 weeks before grand opening",
    
    // Additional Information
    additionalInfo: "Budget: $25,000 for digital marketing. Store features: 15 local farm partnerships, extensive organic produce section, prepared foods counter, bulk goods. Special opening promotions: 20% off first purchase, free reusable bags, cooking demonstrations."
  };

  const systemPrompt = "You are an expert content strategist and creative director. Create a detailed, actionable creative brief based on the information provided. Format your response as rich HTML with proper headings, sections, and bullet points.";
  
  const userPrompt = `Create a comprehensive creative brief for the following project:
      
PROJECT DETAILS:
Project Name: ${formData.projectName}
Project Description: ${formData.projectDescription}
Background/Context: ${formData.projectBackground}

AUDIENCE & OBJECTIVES:
Target Audience: ${formData.targetAudience}
Objectives: ${formData.objectives}
Key Messages: ${formData.keyMessages}

CONTENT PARAMETERS:
Content Type: ${formData.contentType}
Tone/Voice: ${formData.contentTones.join(', ')}
Length: ${formData.contentLength}

DELIVERABLES & TIMELINE:
Deliverables: ${formData.deliverables}
Timeline: ${formData.timeline}

ADDITIONAL INFORMATION:
${formData.additionalInfo}

The brief should follow this structure:
1. Project Overview (detailed description, context, and background)
2. Objectives (specific, measurable goals)
3. Target Audience (detailed persona descriptions)
4. Key Messages (primary communication points)
5. Deliverables (detailed specifications)
6. Content Creation Guidelines (voice, tone, and specific terminology)
7. Timeline (schedule with milestones)
8. Content Creation Instructions (specific, actionable instructions)

IMPORTANT FORMATTING REQUIREMENTS:
- Use proper HTML formatting with h1, h2, p, ul/li, ol/li tags
- Make the final section titled "Content Creation Instructions" extremely specific and actionable
- Use imperative voice in the instructions section (e.g., "Create a blog post that...")
- Format content to be visually organized and professional
- Do NOT include any markdown, code blocks, or commentary
- Ensure all lists use proper HTML list tags, not plain text bullets or numbers`;

  try {
    console.log('Creating briefing through form interface...');
    
    const response = await fetch('http://localhost:5000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        systemPrompt,
        userPrompt,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Briefing generated successfully');
    console.log('Content length:', data.content.length);
    console.log('Provider used:', data.provider);
    
    return {
      success: true,
      content: data.content,
      formData: formData
    };
    
  } catch (error) {
    console.error('Error creating briefing:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Execute the briefing creation
createFormBriefing().then(result => {
  if (result.success) {
    console.log('\n✅ Form-based briefing created successfully');
    console.log('This briefing was created using the exact same process as filling out the form fields:');
    console.log('- Project Name: FreshMart Organic Grocery Launch');
    console.log('- Content Type: Email campaigns and social media');
    console.log('- Target Audience: Health-conscious families aged 25-45');
    console.log('- Timeline: 4-week launch campaign');
  } else {
    console.log('\n❌ Failed to create form-based briefing');
    console.log('Error:', result.error);
  }
});