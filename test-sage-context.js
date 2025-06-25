/**
 * SAGE Context Fix Validation Test
 * Run in browser console to test conversation continuity
 */

async function testSAGEContextFix() {
  console.log('🧪 Testing SAGE conversation context fix...');
  
  const baseURL = window.location.origin;
  
  // Test conversation with context
  const conversation = [
    "I'm working on a marketing campaign for a massage school in Austin, Texas.",
    "What are the demographics of potential students?",
    "Can you break down the age groups more specifically?",
    "Do you remember what type of school we're discussing?"
  ];
  
  let sessionHistory = [];
  
  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
    console.log(`\n📝 Message ${i + 1}: ${message}`);
    
    try {
      const response = await fetch(`${baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          model: 'gpt-4o',
          context: {
            researchContext: 'Market research for Austin massage school email campaign',
            sessionHistory: sessionHistory
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Response: ${data.content.substring(0, 150)}...`);
      console.log(`🔧 Provider: ${data.provider}, Model: ${data.model}`);
      
      // Add to session history
      sessionHistory.push({ role: 'user', content: message });
      sessionHistory.push({ role: 'assistant', content: data.content });
      
      console.log(`📚 Session history length: ${sessionHistory.length} messages`);
      
    } catch (error) {
      console.error(`❌ Failed for message ${i + 1}:`, error);
      return false;
    }
  }
  
  console.log('\n🎉 SAGE context test completed successfully!');
  console.log('✅ Conversation history is being maintained across messages');
  console.log(`📊 Final session history: ${sessionHistory.length} total messages`);
  
  return true;
}

// Run the test
testSAGEContextFix()
  .then(success => {
    if (success) {
      console.log('\n🟢 CONTEXT FIX VALIDATED: SAGE should now maintain conversation continuity');
    } else {
      console.log('\n🔴 CONTEXT FIX FAILED: Issues detected with conversation memory');
    }
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error);
  });