#!/usr/bin/env node
/**
 * Test script for Pinecone Assistant integration
 * Tests the connection and chat functionality
 */

async function testPineconeIntegration() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🧪 Testing Pinecone Assistant Integration\n');
  
  // Test 1: Check Pinecone status
  console.log('1️⃣ Checking Pinecone status...');
  try {
    const statusResponse = await fetch(`${baseUrl}/api/pinecone/status`);
    const status = await statusResponse.json();
    
    console.log('   Status:', status);
    
    if (!status.configured) {
      console.log('   ❌ Pinecone API key not configured');
      return;
    }
    
    if (!status.connected) {
      console.log('   ❌ Pinecone Assistant not connected');
      return;
    }
    
    console.log('   ✅ Pinecone Assistant connected:', status.assistantName);
  } catch (error) {
    console.error('   ❌ Failed to check status:', error);
    return;
  }
  
  // Test 2: Send a test chat message
  console.log('\n2️⃣ Testing chat functionality...');
  try {
    const chatResponse = await fetch(`${baseUrl}/api/pinecone/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'What can you help me with?'
          }
        ],
        stream: false
      })
    });
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.log('   ❌ Chat request failed:', chatResponse.status, errorText);
      return;
    }
    
    const chatResult = await chatResponse.json();
    console.log('   ✅ Chat response received');
    console.log('   Content:', chatResult.content?.substring(0, 100) + '...');
    
    if (chatResult.sources && chatResult.sources.length > 0) {
      console.log('   Sources found:', chatResult.sources.length);
      chatResult.sources.forEach((source, idx) => {
        console.log(`     ${idx + 1}. ${source.title}`);
      });
    } else {
      console.log('   No sources included in response');
    }
  } catch (error) {
    console.error('   ❌ Chat test failed:', error);
    return;
  }
  
  console.log('\n✅ All tests completed successfully!');
  console.log('📝 The RAG Search toggle should now work in the SAGE tab.');
}

// Wait for server to be ready
console.log('Waiting for server to be ready...');
setTimeout(() => {
  testPineconeIntegration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test failed:', err);
      process.exit(1);
    });
}, 2000);