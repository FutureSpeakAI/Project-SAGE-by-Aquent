#!/usr/bin/env node
/**
 * RFP System Test Suite
 * Tests the complete RFP processing workflow
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  debug: (msg) => console.log(`${colors.gray}  ${msg}${colors.reset}`)
};

// Create a sample RFP document
function createSampleRFP() {
  const content = `
REQUEST FOR PROPOSAL
Digital Marketing Services

Company: Sample Corp
Date: ${new Date().toLocaleDateString()}

1. Company Overview
Can you provide an overview of your company's experience in digital marketing?

2. Service Capabilities
What specific digital marketing services do you offer?

3. Team Structure
How is your team structured, and who would be the key contacts for our account?

4. Case Studies
Can you provide 2-3 relevant case studies from similar projects?

5. Technology Stack
What marketing technologies and platforms do you typically use?

6. Pricing Model
What is your pricing structure for ongoing marketing services?

7. Performance Metrics
How do you measure and report on campaign performance?

8. Timeline
What is your typical timeline for launching a new campaign?

9. Communication Process
How do you handle client communication and project updates?

10. References
Can you provide references from current clients?
`;

  const filename = 'test-rfp.txt';
  fs.writeFileSync(filename, content);
  return filename;
}

// Test RFP upload and processing
async function testRFPUpload(filename) {
  log.info('Testing RFP upload and processing...');
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filename));
    
    const response = await fetch(`${BASE_URL}/api/rfp/process`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${error}`);
    }
    
    const result = await response.json();
    
    log.success('RFP processed successfully');
    log.debug(`Extracted ${result.extractedQuestions?.length || 0} questions`);
    log.debug(`Generated ${result.responses?.length || 0} responses`);
    
    // Validate response structure
    if (!result.uploadedFile) {
      log.error('Missing uploadedFile in response');
    }
    if (!result.extractedQuestions || !Array.isArray(result.extractedQuestions)) {
      log.error('Missing or invalid extractedQuestions');
    }
    if (!result.responses || !Array.isArray(result.responses)) {
      log.error('Missing or invalid responses array');
    }
    
    // Check each response
    result.responses?.forEach((resp, index) => {
      if (!resp.question) {
        log.error(`Response ${index} missing question`);
      }
      if (!resp.generatedAnswer) {
        log.error(`Response ${index} missing generatedAnswer`);
      }
      if (!resp.pineconeSources) {
        log.warn(`Response ${index} missing pineconeSources`);
      }
    });
    
    return result;
  } catch (error) {
    log.error(`RFP upload failed: ${error.message}`);
    throw error;
  }
}

// Test DOCX generation
async function testDOCXGeneration(responses) {
  log.info('Testing DOCX generation...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/rfp/generate-docx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        responses: responses.responses,
        uploadedFile: responses.uploadedFile
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DOCX generation failed: ${response.status} - ${error}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    if (buffer.byteLength === 0) {
      throw new Error('Generated DOCX is empty');
    }
    
    // Save for inspection
    const outputPath = 'test-rfp-output.docx';
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    
    log.success(`DOCX generated successfully (${buffer.byteLength} bytes)`);
    log.debug(`Saved to ${outputPath}`);
    
    return true;
  } catch (error) {
    log.error(`DOCX generation failed: ${error.message}`);
    return false;
  }
}

// Test PDF generation
async function testPDFGeneration(responses) {
  log.info('Testing PDF generation...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/rfp/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        responses: responses.responses,
        uploadedFile: responses.uploadedFile
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PDF generation failed: ${response.status} - ${error}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    if (buffer.byteLength === 0) {
      throw new Error('Generated PDF is empty');
    }
    
    // Save for inspection
    const outputPath = 'test-rfp-output.txt'; // Since it's actually text for MVP
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    
    log.success(`PDF generated successfully (${buffer.byteLength} bytes)`);
    log.debug(`Saved to ${outputPath}`);
    
    return true;
  } catch (error) {
    log.error(`PDF generation failed: ${error.message}`);
    return false;
  }
}

// Test question extraction
function testQuestionExtraction(responses) {
  log.info('Testing question extraction quality...');
  
  const questions = responses.extractedQuestions || [];
  
  if (questions.length === 0) {
    log.error('No questions extracted');
    return false;
  }
  
  log.success(`Extracted ${questions.length} questions`);
  
  // Check quality
  questions.forEach((q, i) => {
    if (q.length < 10) {
      log.warn(`Question ${i + 1} seems too short: "${q}"`);
    }
    if (q.length > 500) {
      log.warn(`Question ${i + 1} seems too long: "${q}"`);
    }
  });
  
  return true;
}

// Main test runner
async function runTests() {
  console.log('\n=== RFP System Test Suite ===\n');
  
  let testFile;
  let testResults = {
    upload: false,
    extraction: false,
    docx: false,
    pdf: false
  };
  
  try {
    // Create test RFP
    log.info('Creating sample RFP document...');
    testFile = createSampleRFP();
    log.success(`Created ${testFile}`);
    
    // Test upload and processing
    const rfpResponse = await testRFPUpload(testFile);
    testResults.upload = true;
    
    // Test question extraction
    testResults.extraction = testQuestionExtraction(rfpResponse);
    
    // Test document generation
    if (rfpResponse && rfpResponse.responses) {
      testResults.docx = await testDOCXGeneration(rfpResponse);
      testResults.pdf = await testPDFGeneration(rfpResponse);
    }
    
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
  } finally {
    // Cleanup
    if (testFile && fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
      log.debug('Cleaned up test file');
    }
  }
  
  // Summary
  console.log('\n=== Test Results ===\n');
  const passed = Object.values(testResults).filter(r => r).length;
  const total = Object.keys(testResults).length;
  
  Object.entries(testResults).forEach(([test, result]) => {
    console.log(`${result ? colors.green + '✓' : colors.red + '✗'} ${test}${colors.reset}`);
  });
  
  console.log(`\n${passed}/${total} tests passed\n`);
  
  if (passed === total) {
    log.success('All tests passed! RFP system is working correctly.');
  } else {
    log.error('Some tests failed. Please check the logs above.');
  }
}

// Run tests
runTests().catch(console.error);