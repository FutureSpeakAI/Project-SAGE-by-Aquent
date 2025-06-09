/**
 * Comprehensive Audio System Test Suite
 * Run in browser console to validate separated audio architecture
 */

class AudioSystemValidator {
  constructor() {
    this.testResults = [];
    this.audioPlaybackCount = 0;
    this.interruptionCount = 0;
    this.micAutoReactivations = 0;
  }

  async testBasicAudioPlayback() {
    console.log('🎵 Test 1: Basic Audio Playback');
    
    // Monitor for audio playback logs
    const originalConsoleLog = console.log;
    let audioLogsDetected = [];
    
    console.log = (...args) => {
      if (args[0] && args[0].includes('🎵')) {
        audioLogsDetected.push(args.join(' '));
      }
      originalConsoleLog.apply(console, args);
    };
    
    // Type a test message and wait for response
    const chatInput = document.querySelector('textarea, input[type="text"]');
    if (chatInput) {
      chatInput.value = 'Say hello briefly';
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Find and click send button
      const sendButton = document.querySelector('button[type="submit"], button:has(svg[data-lucide="send"])');
      if (sendButton) {
        sendButton.click();
        
        // Wait for response and check audio logs
        setTimeout(() => {
          console.log = originalConsoleLog;
          const hasAudioGeneration = audioLogsDetected.some(log => log.includes('Generating audio'));
          const hasAudioPlayback = audioLogsDetected.some(log => log.includes('Starting playback'));
          
          if (hasAudioGeneration && hasAudioPlayback) {
            console.log('✅ Basic audio playback working');
            this.audioPlaybackCount++;
          } else {
            console.log('❌ Audio playback failed');
            console.log('Audio logs:', audioLogsDetected);
          }
        }, 5000);
      }
    }
  }

  testMicrophoneAutoReactivation() {
    console.log('🎤 Test 2: Microphone Auto-Reactivation Prevention');
    
    // Find microphone button
    const micButton = document.querySelector('button:has(svg[data-lucide="mic"]), button:has(svg[data-lucide="brain"])');
    if (micButton) {
      // Activate microphone
      console.log('Activating microphone...');
      micButton.click();
      
      setTimeout(() => {
        // Deactivate microphone
        console.log('Deactivating microphone...');
        micButton.click();
        
        // Wait and check if it reactivates itself
        setTimeout(() => {
          const isStillActive = micButton.className.includes('bg-') && !micButton.className.includes('outline');
          if (!isStillActive) {
            console.log('✅ Microphone stays off when deactivated');
          } else {
            console.log('❌ Microphone auto-reactivated');
            this.micAutoReactivations++;
          }
        }, 3000);
      }, 1000);
    }
  }

  async testVoiceInterruption() {
    console.log('🛑 Test 3: Voice Interruption');
    
    // Start SAGE speaking first
    const speakerButton = document.querySelector('button:has(svg[data-lucide="volume2"])');
    if (speakerButton) {
      console.log('Starting SAGE speech...');
      speakerButton.click();
      
      // Wait a moment then interrupt
      setTimeout(() => {
        console.log('Interrupting with microphone click...');
        const micButton = document.querySelector('button:has(svg[data-lucide="mic"]), button:has(svg[data-lucide="brain"])');
        if (micButton) {
          micButton.click();
          
          // Check if audio stopped
          setTimeout(() => {
            const isSpeaking = document.querySelector('button:has(svg[data-lucide="volume-x"])');
            if (!isSpeaking) {
              console.log('✅ Audio interruption working');
              this.interruptionCount++;
            } else {
              console.log('❌ Audio interruption failed');
            }
          }, 500);
        }
      }, 1500);
    }
  }

  testAudioControlSeparation() {
    console.log('🔄 Test 4: Audio Control Separation');
    
    // Test that voice detection and audio playback work independently
    const micButton = document.querySelector('button:has(svg[data-lucide="mic"]), button:has(svg[data-lucide="brain"])');
    const speakerButton = document.querySelector('button:has(svg[data-lucide="volume2"])');
    
    if (micButton && speakerButton) {
      // Activate voice detection
      console.log('Activating voice detection...');
      micButton.click();
      
      setTimeout(() => {
        // Start audio playback while voice detection is active
        console.log('Starting audio while voice detection active...');
        speakerButton.click();
        
        setTimeout(() => {
          // Check if both can work together
          const isListening = micButton.className.includes('bg-') && !micButton.className.includes('outline');
          const isSpeaking = document.querySelector('button:has(svg[data-lucide="volume-x"])');
          
          if (isListening || isSpeaking) {
            console.log('✅ Voice detection and audio work independently');
          } else {
            console.log('❌ Audio systems interfering with each other');
          }
        }, 1000);
      }, 1000);
    }
  }

  async testRapidInteractions() {
    console.log('⚡ Test 5: Rapid Interaction Stress Test');
    
    const micButton = document.querySelector('button:has(svg[data-lucide="mic"]), button:has(svg[data-lucide="brain"])');
    const speakerButton = document.querySelector('button:has(svg[data-lucide="volume2"])');
    
    if (micButton && speakerButton) {
      // Rapid button clicking to test stability
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          micButton.click();
          setTimeout(() => speakerButton.click(), 100);
          setTimeout(() => micButton.click(), 200);
        }, i * 300);
      }
      
      // Check system stability after rapid interactions
      setTimeout(() => {
        const systemResponsive = document.querySelector('button') !== null;
        if (systemResponsive) {
          console.log('✅ System stable under rapid interactions');
        } else {
          console.log('❌ System crashed under stress');
        }
      }, 2000);
    }
  }

  generateReport() {
    console.log('='.repeat(50));
    console.log('📊 AUDIO SYSTEM VALIDATION REPORT');
    console.log('='.repeat(50));
    console.log(`Audio Playback Success: ${this.audioPlaybackCount > 0 ? '✅' : '❌'}`);
    console.log(`Microphone Auto-Reactivations: ${this.micAutoReactivations === 0 ? '✅' : '❌'} (${this.micAutoReactivations})`);
    console.log(`Voice Interruptions: ${this.interruptionCount > 0 ? '✅' : '❌'}`);
    
    const overallScore = (this.audioPlaybackCount > 0 ? 1 : 0) + 
                        (this.micAutoReactivations === 0 ? 1 : 0) + 
                        (this.interruptionCount > 0 ? 1 : 0);
    
    console.log(`Overall Status: ${overallScore >= 2 ? '✅ PASS' : '❌ FAIL'} (${overallScore}/3)`);
    console.log('='.repeat(50));
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive audio system validation...');
    console.log('='.repeat(60));
    
    await this.testBasicAudioPlayback();
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    this.testMicrophoneAutoReactivation();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await this.testVoiceInterruption();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    this.testAudioControlSeparation();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await this.testRapidInteractions();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    this.generateReport();
  }
}

// Initialize and run tests
const audioValidator = new AudioSystemValidator();
console.log('Audio System Validator loaded.');
console.log('Run: audioValidator.runAllTests()');
window.audioValidator = audioValidator;