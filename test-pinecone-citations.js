
#!/usr/bin/env node

async function testPineconeCitations() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🔍 Testing Pinecone Citations Fix\n');
  
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
            content: 'Provide a brief history of your company. Is your company publicly traded? If so, since when? At which stock exchange? How many years have you been in business? Describe any alliances you have with other hardware, software, or service providers.'
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
    
    console.log('📝 Content length:', chatResult.content?.length || 0);
    console.log('📝 Content preview:', chatResult.content?.substring(0, 300) + '...\n');
    
    console.log('📚 Sources analysis:');
    if (chatResult.sources && chatResult.sources.length > 0) {
      console.log('✅ Sources found:', chatResult.sources.length);
      chatResult.sources.forEach((source, idx) => {
        console.log(`\nSource ${idx + 1}:`);
        console.log('  Title:', source.title);
        console.log('  Text:', source.text?.substring(0, 100) + '...' || '[No text]');
        console.log('  Has URL:', !!source.url);
        console.log('  Metadata:', Object.keys(source.metadata || {}).join(', '));
      });
    } else {
      console.log('❌ No sources found in response');
      console.log('Response structure:', Object.keys(chatResult));
    }
    
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
