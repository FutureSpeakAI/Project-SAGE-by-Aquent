/**
 * Test Perplexity API Fix
 * Validates the research system with refreshed API credentials
 */

async function testPerplexityResearch() {
  try {
    console.log('Testing Perplexity API research...');
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Research Sanofi Dupixent brand strategy and positioning",
        conversation_id: null,
        persona_id: null,
        memory_enabled: false
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Research system working');
      console.log('Response length:', data.content?.length || 0);
      console.log('Research quality check:', data.content?.includes('Dupixent') ? 'PASS' : 'FAIL');
      return true;
    } else {
      console.log('❌ API call failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

testPerplexityResearch();