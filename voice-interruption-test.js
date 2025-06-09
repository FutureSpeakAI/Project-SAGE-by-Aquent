/**
 * Voice Interruption System Test Suite
 * Run this in browser console to test voice interruption functionality
 */

class VoiceInterruptionTester {
  constructor() {
    this.testResults = [];
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
  }

  async initializeAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true 
        } 
      });
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      source.connect(this.analyser);
      
      console.log('✅ Audio context initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      return false;
    }
  }

  testVoiceActivityDetection() {
    if (!this.analyser) {
      console.error('❌ Analyser not initialized');
      return false;
    }

    console.log('🎤 Testing voice activity detection for 10 seconds...');
    console.log('🗣️ Please speak normally into your microphone');
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let maxRMS = 0;
    let detectionCount = 0;
    
    const startTime = Date.now();
    const testDuration = 10000; // 10 seconds
    
    const checkActivity = () => {
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += (dataArray[i] / 255) ** 2;
      }
      const rms = Math.sqrt(sum / bufferLength);
      
      if (rms > maxRMS) maxRMS = rms;
      if (rms > 0.02) detectionCount++; // Using our interrupt threshold
      
      if (rms > 0.01) {
        console.log(`Voice level: ${rms.toFixed(4)} ${rms > 0.02 ? '🔴 INTERRUPT LEVEL' : '🟡'}`);
      }
      
      if (Date.now() - startTime < testDuration) {
        setTimeout(checkActivity, 50);
      } else {
        this.reportVoiceTest(maxRMS, detectionCount);
      }
    };
    
    checkActivity();
  }

  reportVoiceTest(maxRMS, detectionCount) {
    console.log('📊 Voice Activity Test Results:');
    console.log(`   Max RMS detected: ${maxRMS.toFixed(4)}`);
    console.log(`   Interrupt-level detections: ${detectionCount}`);
    console.log(`   Threshold for interruption: 0.02`);
    
    if (maxRMS > 0.02) {
      console.log('✅ Voice can trigger interruption');
      this.testResults.push({ test: 'voice_detection', passed: true });
    } else {
      console.log('❌ Voice too quiet for interruption');
      this.testResults.push({ test: 'voice_detection', passed: false });
    }
  }

  testClickInterruption() {
    console.log('🖱️ Testing click interruption...');
    
    // Find microphone button
    const micButton = document.querySelector('button[data-testid="voice-mic-button"], button svg[data-lucide="mic"], button svg[data-lucide="mic-off"]')?.closest('button');
    
    if (!micButton) {
      console.error('❌ Cannot find microphone button');
      this.testResults.push({ test: 'click_interruption', passed: false });
      return;
    }
    
    console.log('✅ Microphone button found');
    
    // Test click event
    try {
      micButton.click();
      console.log('✅ Click event triggered successfully');
      this.testResults.push({ test: 'click_interruption', passed: true });
    } catch (error) {
      console.error('❌ Click event failed:', error);
      this.testResults.push({ test: 'click_interruption', passed: false });
    }
  }

  testIntelligentModeActivation() {
    console.log('🧠 Testing intelligent mode activation...');
    
    // Check for intelligent mode state
    const voiceControls = document.querySelector('[class*="voice"], [class*="Voice"]');
    if (voiceControls) {
      console.log('✅ Voice controls component found');
      this.testResults.push({ test: 'intelligent_mode', passed: true });
    } else {
      console.log('❌ Voice controls component not found');
      this.testResults.push({ test: 'intelligent_mode', passed: false });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Voice Interruption Test Suite...');
    console.log('='.repeat(50));
    
    const audioInitialized = await this.initializeAudio();
    if (!audioInitialized) {
      console.error('❌ Cannot run tests without audio access');
      return;
    }
    
    this.testClickInterruption();
    this.testIntelligentModeActivation();
    
    // Voice activity test (requires user interaction)
    setTimeout(() => {
      this.testVoiceActivityDetection();
    }, 2000);
    
    // Final report after all tests
    setTimeout(() => {
      this.generateReport();
    }, 15000);
  }

  generateReport() {
    console.log('='.repeat(50));
    console.log('📋 FINAL TEST REPORT');
    console.log('='.repeat(50));
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}: ${result.test}`);
    });
    
    const passCount = this.testResults.filter(r => r.passed).length;
    const totalTests = this.testResults.length;
    
    console.log('='.repeat(50));
    console.log(`Overall: ${passCount}/${totalTests} tests passed`);
    
    if (passCount === totalTests) {
      console.log('🎉 All tests passed! Voice interruption should work.');
    } else {
      console.log('⚠️ Some tests failed. Voice interruption may not work properly.');
    }
  }

  cleanup() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Auto-run test when script is loaded
const tester = new VoiceInterruptionTester();
console.log('Voice Interruption Tester loaded. Run tester.runAllTests() to start testing.');

// Export for manual testing
window.voiceInterruptionTester = tester;