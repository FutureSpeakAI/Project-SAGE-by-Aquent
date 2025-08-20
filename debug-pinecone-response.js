
#!/usr/bin/env node

const { Pinecone } = require('@pinecone-database/pinecone');

async function debugPineconeResponse() {
  console.log('🔍 Debugging Pinecone Response Structure\n');
  
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const assistant = pinecone.Assistant('pinecone-helper');
    
    const response = await assistant.chat({
      messages: [
        {
          role: 'user',
          content: 'Tell me about Aquent\'s history and major clients'
        }
      ]
    });
    
    console.log('🔧 Raw Response Structure:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n🔧 Citations Structure:');
    if (response.citations) {
      console.log('Citations found:', response.citations.length);
      response.citations.forEach((citation, idx) => {
        console.log(`\nCitation ${idx}:`, JSON.stringify(citation, null, 2));
      });
    } else {
      console.log('No citations in response');
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugPineconeResponse();
