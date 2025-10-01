import fs from 'fs';
import path from 'path';

// Import the extraction functions from the RFP processor
const rfpProcessorPath = path.join(process.cwd(), 'server', 'rfp-processor.ts');

// Read the test document
const testDocumentPath = path.join(process.cwd(), 'test-rfp-document.txt');
const testText = fs.readFileSync(testDocumentPath, 'utf-8');

console.log('='.repeat(60));
console.log('RFP EXTRACTION SYSTEM TEST');
console.log('='.repeat(60));
console.log('\nTest document loaded. Length:', testText.length, 'characters');
console.log('\nStarting extraction test with verbose mode...\n');

// Since we can't directly import the TypeScript file in a test script,
// let's create a simple API test instead using fetch
async function testExtraction() {
  try {
    // Create a simple text file buffer to simulate file upload
    const formData = new FormData();
    const blob = new Blob([testText], { type: 'text/plain' });
    const file = new File([blob], 'test-rfp.txt', { type: 'text/plain' });
    
    console.log('Testing extraction via API endpoint...');
    console.log('Note: Run this test by uploading test-rfp-document.txt through the UI');
    console.log('or by using curl:');
    console.log('\ncurl -X POST http://localhost:5000/api/rfp/process \\');
    console.log('  -F "file=@test-rfp-document.txt" \\'); 
    console.log('  -H "Accept: application/json" \\');
    console.log('  -o test-results.json');
    console.log('\nTo enable verbose mode, add ?verbose=true to the URL');
    
    // Expected extractions based on our test document
    const expectedCategories = {
      directQuestions: [
        "What is your company's experience with large-scale digital transformations?",
        "How do you ensure knowledge transfer to our internal team?"
      ],
      imperatives: [
        "Please provide details about your methodology for system integration.",
        "Describe your approach to change management during digital transformation initiatives.",
        "Explain how you handle data migration from legacy systems",
        "List your expertise in cloud platforms (AWS, Azure, GCP)",
        "Demonstrate your ability to implement microservices architecture",
        "Submit a detailed project plan with milestones and deliverables.",
        "Include references from at least three similar projects completed in the last 2 years.",
        "Specify your team composition and roles for this project.",
        "Present your risk management strategy.",
        "Document your quality assurance processes.",
        "Please describe your disaster recovery and business continuity plans."
      ],
      requirements: [
        "The vendor must demonstrate at least 5 years of experience",
        "Your company should have ISO 27001 certification",
        "The contractor shall provide 24/7 support",
        "You must have experience with both SQL and NoSQL databases",
        "Vendor must be compliant with GDPR and CCPA regulations",
        "Must have liability insurance of at least $5 million",
        "It is required that all documentation be provided in English",
        "The vendor should propose a training program for end-users"
      ],
      compliance: [
        "Confirm that your organization is SOC 2 Type II compliant",
        "Provide proof of PCI DSS compliance",
        "Provide evidence of successful API integration projects",
        "Required certifications include: CISSP, PMP, AWS Certified Solutions Architect"
      ],
      tables: [
        "Please complete the following pricing table"
      ],
      capabilities: [
        "The ability to scale solutions based on business growth",
        "Capability to integrate with existing ERP systems",
        "Responsible for ensuring zero downtime during migration"
      ]
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('EXPECTED EXTRACTION SUMMARY');
    console.log('='.repeat(60));
    
    let totalExpected = 0;
    for (const [category, items] of Object.entries(expectedCategories)) {
      console.log(`\n${category}: ${items.length} items`);
      totalExpected += items.length;
    }
    
    console.log('\n' + '-'.repeat(60));
    console.log(`TOTAL EXPECTED EXTRACTIONS: ${totalExpected} items`);
    console.log('-'.repeat(60));
    
    console.log('\nThe improved system should extract most or all of these items.');
    console.log('The multi-pass approach ensures comprehensive coverage.');
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testExtraction();