/**
 * Quick Audio Fix Validation
 * Tests the separated audio architecture
 */

console.log('🎵 Testing separated audio system...');

// Test 1: Send message and monitor audio playback
async function testAudioPlayback() {
  console.log('Test 1: Audio playback after message');
  
  // Find chat input and send test message
  const chatInput = document.querySelector('textarea');
  if (chatInput) {
    chatInput.value = 'Test audio playback';
    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Find send button and click
    const sendButton = document.querySelector('button[type="submit"]');
    if (sendButton) {
      sendButton.click();
      console.log('Message sent, waiting for audio...');
    }
  }
}

// Test 2: Microphone stays off when clicked off
function testMicrophoneBehavior() {
  console.log('Test 2: Microphone control');
  
  const micButton = document.querySelector('button:has(svg[data-lucide="mic"])');
  if (micButton) {
    console.log('Clicking microphone ON...');
    micButton.click();
    
    setTimeout(() => {
      console.log('Clicking microphone OFF...');
      micButton.click();
      
      setTimeout(() => {
        const isActive = micButton.className.includes('bg-red') || micButton.className.includes('bg-green') || micButton.className.includes('bg-blue');
        console.log('Microphone stays off:', !isActive ? '✅' : '❌');
      }, 2000);
    }, 1000);
  }
}

// Test 3: Audio interruption
function testAudioInterruption() {
  console.log('Test 3: Audio interruption');
  
  const speakerButton = document.querySelector('button:has(svg[data-lucide="volume2"])');
  if (speakerButton) {
    console.log('Starting audio playback...');
    speakerButton.click();
    
    setTimeout(() => {
      const micButton = document.querySelector('button:has(svg[data-lucide="mic"])');
      if (micButton) {
        console.log('Interrupting with microphone...');
        micButton.click();
      }
    }, 1500);
  }
}

// Run tests
testAudioPlayback();
setTimeout(testMicrophoneBehavior, 8000);
setTimeout(testAudioInterruption, 15000);