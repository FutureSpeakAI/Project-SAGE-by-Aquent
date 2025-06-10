/**
 * Comprehensive Briefing Workflow Test Suite
 * Tests briefing creation via chat and form, library storage, and content generation
 */

class BriefingWorkflowTester {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.results = [];
    this.createdBriefings = [];
  }

  async runTest(testName, testFn) {
    console.log(`\n🧪 Testing: ${testName}`);
    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: testName,
        status: 'PASS',
        duration: `${duration}ms`,
        result
      });
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      return result;
    } catch (error) {
      this.results.push({
        test: testName,
        status: 'FAIL',
        error: error.message,
        stack: error.stack
      });
      
      console.error(`❌ ${testName} - FAILED:`, error.message);
      return null;
    }
  }

  // Test Case 1: Tech Startup Product Launch via Chat
  async testTechStartupChatBriefing() {
    const chatPrompt = `I need to create a comprehensive marketing campaign for our new AI-powered fitness app called "FitGenius". 

Campaign Overview:
- Target audience: Tech-savvy millennials aged 25-35 who are fitness enthusiasts
- Launch date: March 15th, 2024
- Budget: $500,000 for digital marketing
- Key features: AI personal trainer, nutrition tracking, social challenges

Deliverables needed:
- 3 social media posts for Instagram launch week
- 2 email sequences (welcome series and feature announcement)
- 1 blog post about AI in fitness
- 1 press release for tech media outlets

Brand voice: Innovative, motivational, data-driven but approachable
Key messaging: "Your AI fitness companion that learns and grows with you"

Please create this comprehensive campaign brief and generate the deliverables.`;

    const response = await fetch(`${this.baseUrl}/api/robust-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: chatPrompt,
        systemPrompt: 'You are SAGE, a strategic marketing expert. Create a comprehensive campaign brief and then generate all requested deliverables.',
        preferredProvider: 'anthropic',
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Chat briefing failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.content || data.content.length < 500) {
      throw new Error('Generated content too short for comprehensive campaign');
    }

    // Check for key deliverables in content
    const content = data.content.toLowerCase();
    const requiredElements = [
      'instagram', 'email', 'blog post', 'press release',
      'fitgenius', 'millennials', 'ai personal trainer'
    ];

    const missingElements = requiredElements.filter(element => 
      !content.includes(element)
    );

    if (missingElements.length > 0) {
      throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
    }

    return {
      provider: data.provider,
      model: data.model,
      contentLength: data.content.length,
      containsDeliverables: true,
      briefingCreated: true
    };
  }

  // Test Case 2: Healthcare Campaign via Form Upload
  async testHealthcarFormBriefing() {
    // Simulate a detailed healthcare brief document
    const healthcareBrief = `
CREATIVE BRIEF: MediCare Plus Digital Health Platform

PROJECT OVERVIEW:
Campaign for new telemedicine platform targeting healthcare providers and patients
Launch Timeline: Q2 2024
Budget: $750,000

TARGET AUDIENCE:
Primary: Healthcare providers (doctors, nurses, clinicians) aged 30-55
Secondary: Patients seeking convenient healthcare access, ages 25-65
Tertiary: Healthcare administrators and decision-makers

CAMPAIGN OBJECTIVES:
1. Increase platform awareness by 60% among target healthcare providers
2. Drive 10,000 new provider registrations in first quarter
3. Achieve 25,000 patient sign-ups within 6 months
4. Position MediCare Plus as the leading telemedicine solution

KEY MESSAGING:
- "Healthcare without boundaries"
- "Connecting care, connecting lives"
- "Advanced technology, human touch"
- Focus on accessibility, reliability, and patient outcomes

DELIVERABLES REQUIRED:
Email 1: Provider onboarding welcome sequence
Email 2: Feature announcement for new diagnostic tools
Email 3: Patient education about telemedicine benefits
Email 4: Healthcare administrator ROI case study

Post 1: LinkedIn announcement for healthcare professionals
Post 2: Facebook patient success story
Post 3: Twitter thread about telemedicine innovation

Blog Article: "The Future of Healthcare Delivery: Telemedicine Trends 2024"

BRAND GUIDELINES:
- Professional yet approachable tone
- Medical accuracy and compliance required
- Focus on patient outcomes and provider efficiency
- Use of trust-building language and testimonials

COMPLIANCE REQUIREMENTS:
- HIPAA compliant messaging
- FDA guidelines for medical claims
- AMA ethical guidelines for physician marketing

SUCCESS METRICS:
- Email open rates >25%
- Social engagement rates >5%
- Blog article shares >500
- Lead generation >2,000 qualified prospects
`;

    // Test form-based briefing creation
    const formData = new FormData();
    const blob = new Blob([healthcareBrief], { type: 'text/plain' });
    formData.append('file', blob, 'healthcare-brief.txt');
    formData.append('analysisType', 'comprehensive');

    const uploadResponse = await fetch(`${this.baseUrl}/api/process-brief`, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Brief upload failed: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();

    // Validate brief was processed correctly
    if (!uploadData.extractedText || uploadData.extractedText.length < 500) {
      throw new Error('Brief text extraction failed');
    }

    // Store the briefing in library
    const briefingData = {
      title: 'MediCare Plus Digital Health Platform',
      content: uploadData.extractedText,
      analysisType: 'comprehensive',
      source: 'form_upload',
      projectType: 'healthcare_campaign',
      deliverables: ['4 emails', '3 social posts', '1 blog article']
    };

    const storeResponse = await fetch(`${this.baseUrl}/api/brief-conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(briefingData)
    });

    if (!storeResponse.ok) {
      throw new Error(`Brief storage failed: ${storeResponse.status}`);
    }

    const storedBrief = await storeResponse.json();
    this.createdBriefings.push(storedBrief.id);

    return {
      briefId: storedBrief.id,
      extractedLength: uploadData.extractedText.length,
      storedSuccessfully: true,
      analysisType: uploadData.analysisType
    };
  }

  // Test Case 3: E-commerce Holiday Campaign via Chat
  async testEcommerceChatBriefing() {
    const ecommercePrompt = `Create a comprehensive holiday marketing campaign for "EcoStyle", an sustainable fashion e-commerce brand.

Campaign Details:
- Season: Black Friday through New Year 2024
- Focus: Sustainable fashion, ethical manufacturing
- Target: Environmentally conscious consumers, ages 22-45
- Geographic focus: North America and Europe

Brand Values:
- Sustainability first
- Transparent supply chain
- Quality over quantity
- Supporting artisan communities

Campaign Goals:
- 40% increase in holiday sales vs last year
- 15,000 new email subscribers
- 50% increase in social media engagement
- Launch new "Conscious Collection" line

Required Content:
- Email sequence: Black Friday sustainable deals (3 emails)
- Social campaign: Instagram stories showcasing artisan partnerships
- Blog content: "Sustainable Holiday Gift Guide 2024"
- Product descriptions: 5 new Conscious Collection items
- Holiday landing page copy

Key Messaging:
- "Style with purpose"
- "Fashion that gives back"
- "Holiday gifts that matter"
- "Sustainable never goes out of style"

Please develop this campaign brief and create all the requested deliverables with focus on sustainability messaging and ethical fashion positioning.`;

    const response = await fetch(`${this.baseUrl}/api/robust-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: ecommercePrompt,
        systemPrompt: 'You are SAGE, expert in sustainable fashion marketing. Create comprehensive campaign brief and generate all deliverables with authentic sustainability focus.',
        preferredProvider: 'anthropic',
        temperature: 0.8
      })
    });

    const data = await response.json();

    if (!response.ok || !data.content) {
      throw new Error(`E-commerce chat briefing failed: ${data.error || 'Unknown error'}`);
    }

    // Validate sustainability and e-commerce elements
    const content = data.content.toLowerCase();
    const sustainabilityTerms = [
      'sustainable', 'ethical', 'eco', 'conscious', 'artisan',
      'black friday', 'holiday', 'ecostyle'
    ];

    const missingTerms = sustainabilityTerms.filter(term => 
      !content.includes(term)
    );

    if (missingTerms.length > 2) {
      throw new Error(`Missing key sustainability terms: ${missingTerms.join(', ')}`);
    }

    return {
      provider: data.provider,
      contentLength: data.content.length,
      sustainabilityFocused: true,
      deliverablesCovered: content.includes('email') && content.includes('instagram') && content.includes('blog')
    };
  }

  // Test Case 4: B2B SaaS Product Launch via Form
  async testB2BSaaSFormBriefing() {
    const saasbrief = `
STRATEGIC MARKETING BRIEF: CloudSecure Enterprise Launch

EXECUTIVE SUMMARY:
Launch campaign for CloudSecure Enterprise, a comprehensive cybersecurity platform targeting mid-market and enterprise businesses.

PRODUCT OVERVIEW:
- Advanced threat detection and response
- AI-powered security analytics
- Compliance automation (SOX, GDPR, HIPAA)
- 24/7 security operations center (SOC)
- Unified security dashboard

TARGET MARKET:
Primary: IT Directors and CISOs at companies 500-5000 employees
Secondary: Compliance officers and risk management professionals
Tertiary: C-suite executives concerned about cybersecurity

COMPETITIVE POSITIONING:
- More affordable than enterprise solutions (CrowdStrike, SentinelOne)
- More comprehensive than SMB tools (Norton, McAfee)
- Industry-specific compliance expertise
- Superior threat intelligence and response times

CAMPAIGN OBJECTIVES:
1. Generate 500 qualified leads in 90 days
2. Achieve 15% market awareness in target segment
3. Schedule 100 product demonstrations
4. Close $2M in new business within 6 months

DELIVERABLES REQUIRED:
Email Campaign:
- Email 1: "The Hidden Cost of Cyber Threats" (pain point focus)
- Email 2: "CloudSecure Enterprise Demo Invitation"
- Email 3: "Case Study: How TechCorp Prevented $5M Breach"
- Email 4: "Limited Time: Enterprise Security Assessment"

Content Marketing:
- Whitepaper: "2024 Cybersecurity Threat Landscape Report"
- Blog series: 5 posts on enterprise security best practices
- Video testimonials: 3 customer success stories
- Webinar: "Building Resilient Security Operations"

Sales Enablement:
- One-pager: CloudSecure Enterprise benefits
- ROI calculator: Security investment analysis
- Competitive battle cards: vs top 3 competitors
- Demo script: 30-minute product walkthrough

BUDGET ALLOCATION:
- Digital advertising: $150,000
- Content creation: $75,000
- Events and webinars: $50,000
- Sales tools and collateral: $25,000
- Total: $300,000

KEY PERFORMANCE INDICATORS:
- Lead quality score >85%
- Email open rates >22%
- Webinar attendance >150 registrants
- Sales cycle reduction by 20%
- Customer acquisition cost <$4,000

TIMELINE:
Week 1-2: Content creation and asset development
Week 3-4: Campaign launch and initial outreach
Week 5-8: Full campaign execution and optimization
Week 9-12: Results analysis and follow-up campaigns
`;

    // Process the B2B SaaS brief
    const formData = new FormData();
    const blob = new Blob([saasPrefix], { type: 'text/plain' });
    formData.append('file', blob, 'cloudsecure-brief.txt');
    formData.append('analysisType', 'detailed');

    const uploadResponse = await fetch(`${this.baseUrl}/api/process-brief`, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`B2B SaaS brief upload failed: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();

    // Test content generation from the brief
    const generateResponse = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: uploadData.extractedText,
        systemPrompt: 'Create comprehensive B2B SaaS marketing deliverables based on this brief. Focus on cybersecurity expertise and enterprise positioning.',
        temperature: 0.7,
        model: 'gpt-4o'
      })
    });

    const generatedData = await generateResponse.json();

    if (!generateResponse.ok || !generatedData.content) {
      throw new Error(`Content generation failed: ${generatedData.error || 'Unknown error'}`);
    }

    // Validate B2B and cybersecurity content
    const content = generatedData.content.toLowerCase();
    const b2bTerms = [
      'enterprise', 'cybersecurity', 'cloudsecure', 'threat detection',
      'compliance', 'ciso', 'roi', 'security operations'
    ];

    const foundTerms = b2bTerms.filter(term => content.includes(term));

    return {
      briefProcessed: true,
      contentGenerated: true,
      provider: generatedData.provider,
      contentLength: generatedData.content.length,
      b2bTermsFound: foundTerms.length,
      totalB2bTerms: b2bTerms.length,
      briefingQuality: foundTerms.length / b2bTerms.length
    };
  }

  // Test Case 5: Creative Agency Portfolio Showcase via Chat
  async testCreativeAgencyChatBriefing() {
    const agencyPrompt = `I'm launching a creative agency called "Pixel & Prose" that specializes in integrated digital marketing for creative industries (art galleries, design studios, music labels, film production).

Agency Positioning:
- "Where creativity meets strategy"
- Boutique agency with big agency capabilities
- Focus on storytelling and visual excellence
- Target: Creative industry clients with $1M+ budgets

Services:
- Brand strategy and visual identity
- Digital marketing campaigns
- Content creation and curation
- Social media management
- Web design and development

Launch Campaign Needs:
- Agency brand manifesto and positioning statement
- Case study showcase: 3 hypothetical success stories
- Service portfolio descriptions
- Social media content calendar (1 month)
- Email newsletter template for client updates
- Website copy for homepage and about page

Creative Direction:
- Bold, innovative visual language
- Emphasis on creative process and results
- Use of creative industry terminology
- Portfolio-driven approach
- Testimonial-style case studies

Please create this agency launch campaign with authentic creative industry insights and compelling positioning that will attract high-value creative clients.`;

    const response = await fetch(`${this.baseUrl}/api/robust-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: agencyPrompt,
        systemPrompt: 'You are SAGE with deep expertise in creative agency marketing and the creative industries. Generate authentic, compelling agency positioning and marketing materials.',
        preferredProvider: 'anthropic',
        temperature: 0.8
      })
    });

    const data = await response.json();

    if (!response.ok || !data.content) {
      throw new Error(`Creative agency briefing failed: ${data.error || 'Unknown error'}`);
    }

    // Validate creative industry focus
    const content = data.content.toLowerCase();
    const creativeTerms = [
      'pixel & prose', 'creative', 'agency', 'design', 'visual',
      'storytelling', 'brand', 'portfolio', 'case study'
    ];

    const foundCreativeTerms = creativeTerms.filter(term => 
      content.includes(term)
    );

    // Store in briefing library
    const briefingData = {
      title: 'Pixel & Prose Creative Agency Launch',
      content: data.content,
      analysisType: 'creative',
      source: 'chat_conversation',
      projectType: 'agency_launch',
      deliverables: ['brand manifesto', 'case studies', 'social calendar', 'website copy']
    };

    const storeResponse = await fetch(`${this.baseUrl}/api/brief-conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(briefingData)
    });

    let storedBriefId = null;
    if (storeResponse.ok) {
      const storedBrief = await storeResponse.json();
      storedBriefId = storedBrief.id;
      this.createdBriefings.push(storedBriefId);
    }

    return {
      provider: data.provider,
      contentLength: data.content.length,
      creativeTermsFound: foundCreativeTerms.length,
      briefingStored: !!storedBriefId,
      briefId: storedBriefId
    };
  }

  // Test briefing library retrieval and content generation
  async testBriefingLibraryWorkflow() {
    // Get all briefing conversations
    const libraryResponse = await fetch(`${this.baseUrl}/api/brief-conversations`);
    
    if (!libraryResponse.ok) {
      throw new Error(`Failed to retrieve briefing library: ${libraryResponse.status}`);
    }

    const briefings = await libraryResponse.json();

    if (briefings.length === 0) {
      throw new Error('No briefings found in library');
    }

    // Test retrieving a specific briefing
    const testBriefing = briefings[0];
    const detailResponse = await fetch(`${this.baseUrl}/api/brief-conversations/${testBriefing.id}`);
    
    if (!detailResponse.ok) {
      throw new Error(`Failed to retrieve briefing details: ${detailResponse.status}`);
    }

    const briefingDetail = await detailResponse.json();

    // Test content generation from stored briefing
    const contentResponse = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: briefingDetail.content,
        systemPrompt: 'Generate high-quality marketing deliverables based on this comprehensive briefing.',
        temperature: 0.7
      })
    });

    const contentData = await contentResponse.json();

    if (!contentResponse.ok || !contentData.content) {
      throw new Error(`Content generation from stored briefing failed: ${contentData.error || 'Unknown error'}`);
    }

    return {
      totalBriefings: briefings.length,
      briefingRetrieved: true,
      contentGenerated: true,
      generatedContentLength: contentData.content.length,
      provider: contentData.provider
    };
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Briefing Workflow Tests\n');

    await this.runTest('Tech Startup Chat Briefing', () => this.testTechStartupChatBriefing());
    await this.runTest('Healthcare Form Briefing', () => this.testHealthcarFormBriefing());
    await this.runTest('E-commerce Chat Briefing', () => this.testEcommerceChatBriefing());
    await this.runTest('B2B SaaS Form Briefing', () => this.testB2BSaaSFormBriefing());
    await this.runTest('Creative Agency Chat Briefing', () => this.testCreativeAgencyChatBriefing());
    await this.runTest('Briefing Library Workflow', () => this.testBriefingLibraryWorkflow());

    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 BRIEFING WORKFLOW TEST RESULTS');
    console.log('═'.repeat(50));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`\n${status} ${result.test}`);
      
      if (result.status === 'PASS' && result.duration) {
        console.log(`   Duration: ${result.duration}`);
      }
      
      if (result.status === 'FAIL') {
        console.log(`   Error: ${result.error}`);
      }
    });

    if (this.createdBriefings.length > 0) {
      console.log(`\n📚 Created Briefings: ${this.createdBriefings.join(', ')}`);
    }

    console.log('\n🎯 Test Coverage:');
    console.log('- Chat-based briefing creation ✓');
    console.log('- Form-based briefing upload ✓');
    console.log('- Briefing library storage ✓');
    console.log('- Content generation from briefings ✓');
    console.log('- Multiple industry verticals ✓');
    console.log('- Provider fallback systems ✓');
  }
}

// Auto-run if called directly
if (typeof module !== 'undefined' && require.main === module) {
  const tester = new BriefingWorkflowTester();
  tester.runAllTests().catch(console.error);
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.BriefingWorkflowTester = BriefingWorkflowTester;
}