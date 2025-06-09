/**
 * Voice Interruption Test - Run in browser console
 * This test validates voice and click interruption functionality
 */

async function testVoiceInterruption() {
  console.log('🚀 Starting Voice Interruption Test...');
  
  // Test 1: Check if microphone button exists and is clickable
  const micButton = document.querySelector('button[class*="mic"], button svg[data-lucide="mic"]')?.closest('button');
  if (!micButton) {
    console.error('❌ Microphone button not found');
    return false;
  }
  console.log('✅ Microphone button found');
  
  // Test 2: Activate intelligent mode
  console.log('🔄 Activating intelligent mode...');
  micButton.click();
  
  // Wait for mode activation
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Check for voice activity detection setup
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  
  const source = audioContext.createMediaStreamSource(micStream);
  source.connect(analyser);
  
  console.log('🎤 Audio context initialized for testing');
  
  // Test 4: Simulate voice activity detection
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  let testFrames = 0;
  let maxRMS = 0;
  
  const testDetection = () => {
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += (dataArray[i] / 255) ** 2;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    if (rms > maxRMS) maxRMS = rms;
    
    testFrames++;
    if (testFrames < 50) {
      setTimeout(testDetection, 50);
    } else {
      console.log(`📊 Voice detection test complete:`);
      console.log(`   Max RMS detected: ${maxRMS.toFixed(4)}`);
      console.log(`   Interrupt threshold: 0.02`);
      console.log(`   Can interrupt: ${maxRMS > 0.02 ? '✅ YES' : '❌ NO'}`);
      
      // Cleanup
      micStream.getTracks().forEach(track => track.stop());
      audioContext.close();
    }
  };
  
  console.log('🗣️ Speak into microphone for voice level testing (5 seconds)...');
  testDetection();
  
  return true;
}

// Test click interruption specifically
async function testClickInterruption() {
  console.log('🖱️ Testing click interruption...');
  
  // Find microphone button
  const micButton = document.querySelector('button[class*="mic"], button svg[data-lucide="mic"]')?.closest('button');
  if (!micButton) {
    console.error('❌ Microphone button not found for click test');
    return false;
  }
  
  // Check if SAGE is currently speaking
  const audioElements = document.querySelectorAll('audio');
  let isPlaying = false;
  audioElements.forEach(audio => {
    if (!audio.paused && !audio.ended) {
      isPlaying = true;
    }
  });
  
  if (isPlaying) {
    console.log('🔊 Audio is playing - testing click interruption...');
    micButton.click();
    
    // Check if audio stopped
    setTimeout(() => {
      let stillPlaying = false;
      audioElements.forEach(audio => {
        if (!audio.paused && !audio.ended) {
          stillPlaying = true;
        }
      });
      
      if (!stillPlaying) {
        console.log('✅ Click interruption successful - audio stopped');
      } else {
        console.log('❌ Click interruption failed - audio still playing');
      }
    }, 500);
  } else {
    console.log('ℹ️ No audio playing - cannot test click interruption');
  }
  
  return true;
}

// Monitor console for interruption messages
function monitorInterruptionLogs() {
  console.log('👀 Monitoring console for interruption messages...');
  console.log('Look for these messages during testing:');
  console.log('   🔴 VOICE INTERRUPTION DETECTED!');
  console.log('   🛑 CLICK INTERRUPTION - Stopping SAGE speech immediately...');
  console.log('   🟢 STARTING continuous voice activity detection...');
  console.log('   🎤 Restarting listening after interruption...');
}

// Run comprehensive test
async function runInterruptionTests() {
  console.log('='.repeat(60));
  console.log('VOICE INTERRUPTION COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(60));
  
  try {
    monitorInterruptionLogs();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testVoiceInterruption();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testClickInterruption();
    
    console.log('='.repeat(60));
    console.log('✅ Test suite completed');
    console.log('Check console messages above for interruption detection');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Auto-run test
console.log('Voice Interruption Test loaded. Run runInterruptionTests() to start.');
window.runInterruptionTests = runInterruptionTests;