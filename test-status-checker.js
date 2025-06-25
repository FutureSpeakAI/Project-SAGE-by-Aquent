/**
 * Test Status Checker - Monitor campaign test progress
 */

import fetch from 'node-fetch';

async function checkTestProgress() {
  const baseUrl = 'http://localhost:5000';
  
  console.log("🔍 Checking current test progress...");
  
  try {
    // Check recent generated content
    const contentResponse = await fetch(`${baseUrl}/api/generated-contents`);
    const content = await contentResponse.json();
    
    // Filter for Nike/ZeroCarbon content created in last 10 minutes
    const recent = content.filter(c => {
      const isNike = c.title?.includes('Nike') || c.title?.includes('ZeroCarbon');
      const isRecent = new Date(c.createdAt) > new Date(Date.now() - 10 * 60 * 1000);
      return isNike && isRecent;
    });
    
    console.log(`📋 Recent Nike content found: ${recent.length} items`);
    recent.forEach(item => {
      console.log(`  - ${item.title} (${item.contentType}) - ${new Date(item.createdAt).toLocaleTimeString()}`);
    });
    
    // Check chat sessions
    const sessionsResponse = await fetch(`${baseUrl}/api/chat-sessions`);
    const sessions = await sessionsResponse.json();
    console.log(`💬 Total chat sessions: ${sessions.length}`);
    
    // Check system status
    const statusResponse = await fetch(`${baseUrl}/api/status`);
    const status = await statusResponse.json();
    console.log(`🟢 System status: ${status.status}`);
    
    return {
      recentNikeContent: recent.length,
      totalSessions: sessions.length,
      systemStatus: status.status,
      testInProgress: recent.length > 0
    };
    
  } catch (error) {
    console.error("❌ Status check failed:", error.message);
    return { error: error.message };
  }
}

checkTestProgress().then(result => {
  console.log("\n📊 Test Progress Summary:");
  console.log(JSON.stringify(result, null, 2));
}).catch(console.error);