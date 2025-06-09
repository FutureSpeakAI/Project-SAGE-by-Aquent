/**
 * Final Voice Interruption Validation Test
 * Run in browser console to validate all fixes
 */

class VoiceInterruptionValidator {
  constructor() {
    this.testResults = [];
    this.audioStopped = false;
    this.listeningRestarted = false;
  }

  async validateAudioStopImmediate() {
    console.log('🎯 Testing immediate audio stop...');
    
    // Monitor audio elements
    const allAudio = document.querySelectorAll('audio');
    let audioWasPlaying = false;
    
    allAudio.forEach(audio => {
      if (!audio.paused) {
        audioWasPlaying = true;
        console.log('📢 Audio detected playing');
      }
    });
    
    if (!audioWasPlaying) {
      console.log('ℹ️ No audio currently playing - start SAGE speaking first');
      return false;
    }
    
    // Click microphone to interrupt
    const micButton = document.querySelector('button[class*="mic"], button svg[data-lucide="mic"]')?.closest('button');
    if (micButton) {
      console.log('🖱️ Clicking microphone to interrupt...');
      micButton.click();
      
      // Check if audio stopped within 200ms
      setTimeout(() => {
        let stillPlaying = false;
        allAudio.forEach(audio => {
          if (!audio.paused && audio.currentTime > 0) {
            stillPlaying = true;
          }
        });
        
        if (!stillPlaying) {
          console.log('✅ Audio stopped immediately');
          this.audioStopped = true;
        } else {
          console.log('❌ Audio still playing after interruption');
        }
      }, 200);
    }
    
    return true;
  }

  async validateSpeechRecognitionSpeed() {
    console.log('🎤 Testing speech recognition startup speed...');
    
    const startTime = performance.now();
    
    // Monitor for speech recognition start
    const checkRecognition = () => {
      // Look for green microphone indicating listening
      const micButton = document.querySelector('button[class*="mic"], button svg[data-lucide="mic"]')?.closest('button');
      if (micButton && micButton.className.includes('green')) {
        const elapsed = performance.now() - startTime;
        console.log(`⚡ Speech recognition started in ${elapsed.toFixed(0)}ms`);
        
        if (elapsed < 500) {
          console.log('✅ Fast recognition startup (under 500ms)');
          this.listeningRestarted = true;
        } else {
          console.log('⚠️ Slow recognition startup (over 500ms)');
        }
        return true;
      }
      
      if (performance.now() - startTime > 3000) {
        console.log('❌ Recognition did not start within 3 seconds');
        return true;
      }
      
      return false;
    };
    
    // Poll for recognition start
    const pollRecognition = () => {
      if (!checkRecognition()) {
        setTimeout(pollRecognition, 100);
      }
    };
    
    pollRecognition();
  }

  async validateVoiceActivityDetection() {
    console.log('🔊 Testing voice activity detection...');
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(micStream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxLevel = 0;
      let frames = 0;
      
      const checkLevels = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += (dataArray[i] / 255) ** 2;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        if (rms > maxLevel) maxLevel = rms;
        frames++;
        
        if (frames < 30) {
          setTimeout(checkLevels, 100);
        } else {
          console.log(`📊 Max voice level detected: ${maxLevel.toFixed(4)}`);
          console.log(`🎯 Interrupt threshold: 0.015`);
          console.log(`${maxLevel > 0.015 ? '✅' : '❌'} Voice can trigger interruption`);
          
          micStream.getTracks().forEach(track => track.stop());
          audioContext.close();
        }
      };
      
      console.log('🗣️ Speak now for 3 seconds...');
      checkLevels();
      
    } catch (error) {
      console.error('❌ Microphone access denied or failed:', error);
    }
  }

  generateReport() {
    console.log('='.repeat(50));
    console.log('📋 VOICE INTERRUPTION VALIDATION REPORT');
    console.log('='.repeat(50));
    
    console.log(`Audio Stop: ${this.audioStopped ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Recognition Speed: ${this.listeningRestarted ? '✅ PASS' : '❌ FAIL'}`);
    
    if (this.audioStopped && this.listeningRestarted) {
      console.log('🎉 Voice interruption is working correctly!');
    } else {
      console.log('⚠️ Some issues remain with voice interruption');
    }
    
    console.log('='.repeat(50));
  }

  async runFullValidation() {
    console.log('🚀 Starting comprehensive voice interruption validation...');
    console.log('='.repeat(60));
    
    // Step 1: Test voice activity detection
    await this.validateVoiceActivityDetection();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 2: Test audio interruption (requires SAGE to be speaking)
    console.log('\n🎯 NEXT: Start SAGE speaking, then run validator.validateAudioStopImmediate()');
    
    // Step 3: Generate final report after tests
    setTimeout(() => this.generateReport(), 10000);
  }
}

// Initialize validator
const validator = new VoiceInterruptionValidator();
console.log('Voice Interruption Validator loaded.');
console.log('Run: validator.runFullValidation()');
window.validator = validator;