/**
 * Test Smart Notification System for Complex Brief Detection
 * Run this in browser console to validate the fixes
 */

// Test the L'Oreal brief detection
async function testLOrealBriefDetection() {
  const lOrealBrief = `CREATIVE BRIEF (FOLLOW THESE INSTRUCTIONS TO CREATE CONTENT):

Sample Creative Brief Project Title: BreathEase HCP Rep-Triggered Email Campaign Client/Brand: Medicine Brand X Product Name: BreathEase – A new treatment designed to help COPD patients live longer, breathe easier, and experience fewer symptoms. Objective: Educate healthcare providers (HCPs) about BreathEase, a novel treatment for COPD that offers measurable improvements in patient quality of life, symptom control, and long-term health outcomes. The goal is to build awareness and interest, drive clinical consideration, and prompt HCPs to engage with a sales rep, request more information, or review the latest clinical data. Target Audience: Primary Care Physicians, Pulmonologists, Nurse Practitioners, and Physician Assistants who treat patients with moderate to severe COPD. Key Message: BreathEase is a breakthrough in COPD care — helping your patients breathe easier, live longer, and do more. Clinically proven to reduce exacerbations and improve daily functioning. Tone of Voice: ● Friendly and confident ● Respectfully educational, not promotional ● Conversational but grounded in clinical credibility ● Empathetic to patient needs and provider priorities Deliverables: ● 3 rep-triggered HCP emails (max 300 words each) ● Each email to include: ○ A headline that captures attention ○ Brief clinical benefit messaging ○ 1 supporting stat or quote if relevant ○ Clear and compelling call to action (e.g., "Request a visit," "View the data," "Download the HCP guide") CTA Examples: ● "See the data that's changing COPD care." ● "Let's talk: request a visit from your BreathEase rep." ● "Get the latest COPD treatment insights — delivered to your inbox." Timeline: Kickoff: ASAP First Draft Due: [2 Weeks from Today] Final Emails Delivered: [One Month from Today] Success Metrics: ● Open rate and click-through rate ● Increase in rep meeting requests ● Engagement with educational assets (e.g., data sheets, guides)

Based on the creative brief above, create the actual deliverable content. Do not restate or summarize the brief. Produce only the final content as specified in the brief.`;

  console.log('Testing L\'Oreal brief detection...');
  
  try {
    const response = await fetch('/api/analyze-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPrompt: lOrealBrief })
    });
    
    const analysis = await response.json();
    console.log('L\'Oreal Brief Analysis Result:', analysis);
    
    if (analysis.isComplex) {
      console.log('✅ SUCCESS: L\'Oreal brief correctly detected as complex');
      console.log('Reason:', analysis.reason);
      console.log('Suggestions:', analysis.suggestions.length);
      return true;
    } else {
      console.log('❌ FAILED: L\'Oreal brief not detected as complex');
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR testing L\'Oreal brief:', error);
    return false;
  }
}

// Test simple brief detection (should not trigger notification)
async function testSimpleBriefDetection() {
  const simpleBrief = "Create an Instagram post about summer vacation.";
  
  console.log('Testing simple brief detection...');
  
  try {
    const response = await fetch('/api/analyze-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPrompt: simpleBrief })
    });
    
    const analysis = await response.json();
    console.log('Simple Brief Analysis Result:', analysis);
    
    if (!analysis.isComplex) {
      console.log('✅ SUCCESS: Simple brief correctly identified as non-complex');
      return true;
    } else {
      console.log('❌ FAILED: Simple brief incorrectly flagged as complex');
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR testing simple brief:', error);
    return false;
  }
}

// Test notification system in UI
function testNotificationUI() {
  console.log('Testing notification UI integration...');
  
  // Check if notification component is loaded
  const sageNotificationExists = document.querySelector('[class*="notification"]') !== null;
  console.log('Sage notification component available:', sageNotificationExists);
  
  // Check if Content tab has brief analysis functionality
  const contentTabExists = window.location.hash.includes('content') || 
                           document.querySelector('[data-tab="content"]') !== null;
  console.log('Content tab accessible:', contentTabExists);
  
  return sageNotificationExists && contentTabExists;
}

// Run comprehensive test
async function runSmartNotificationTests() {
  console.log('🧪 Starting Smart Notification System Tests');
  console.log('==========================================');
  
  const lOrealTest = await testLOrealBriefDetection();
  const simpleTest = await testSimpleBriefDetection();
  const uiTest = testNotificationUI();
  
  console.log('\n📊 Test Results Summary:');
  console.log('L\'Oreal Brief Detection:', lOrealTest ? '✅ PASS' : '❌ FAIL');
  console.log('Simple Brief Detection:', simpleTest ? '✅ PASS' : '❌ FAIL');
  console.log('UI Integration:', uiTest ? '✅ PASS' : '❌ FAIL');
  
  const allTestsPassed = lOrealTest && simpleTest && uiTest;
  console.log('\n🎯 Overall Status:', allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  if (allTestsPassed) {
    console.log('\n🎉 Smart notification system is working correctly!');
    console.log('Next steps: Paste the L\'Oreal brief in Content tab to see notification in action.');
  } else {
    console.log('\n🔧 Issues found that need attention:');
    if (!lOrealTest) console.log('- L\'Oreal brief detection needs fixing');
    if (!simpleTest) console.log('- Simple brief detection has false positives');
    if (!uiTest) console.log('- UI integration needs completion');
  }
  
  return allTestsPassed;
}

// Auto-run tests
runSmartNotificationTests();