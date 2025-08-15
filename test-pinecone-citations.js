#!/usr/bin/env node
/**
 * Test script to examine Pinecone citation structure
 */

async function testPineconeCitations() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🔍 Testing Pinecone Citations Structure\n');
  
  try {
    // Test with a question that should return citations
    const chatResponse = await fetch(`${baseUrl}/api/pinecone/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Tell me about Aquent\'s major clients'
          }
        ]
      })
    });
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ Chat request failed:', chatResponse.status, errorText);
      return;
    }
    
    const chatResult = await chatResponse.json();
    console.log('✅ Response received\n');
    
    console.log('📝 Content preview:', chatResult.content?.substring(0, 200) + '...\n');
    
    console.log('📚 Sources structure:');
    if (chatResult.sources && chatResult.sources.length > 0) {
      console.log('Number of sources:', chatResult.sources.length);
      chatResult.sources.forEach((source, idx) => {
        console.log(`\nSource ${idx + 1}:`);
        console.log('  Title:', source.title);
        console.log('  Text preview:', source.text?.substring(0, 100) || '[No text]');
        console.log('  Has metadata:', !!source.metadata);
      });
    } else {
      console.log('No sources found in response');
    }
    
    // Also print the raw JSON to see full structure
    console.log('\n📦 Raw response JSON:');
    console.log(JSON.stringify(chatResult, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Wait for server to be ready
console.log('Waiting for server to be ready...');
setTimeout(() => {
  testPineconeCitations()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test failed:', err);
      process.exit(1);
    });
}, 2000);