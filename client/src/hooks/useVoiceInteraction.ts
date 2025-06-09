import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInteractionConfig {
  voiceId?: string;
  autoPlay?: boolean;
  intelligentMode?: boolean;
  silenceThreshold?: number;
  interruptThreshold?: number;
}

interface VoiceActivityState {
  isUserSpeaking: boolean;
  silenceStartTime: number | null;
  lastSpeechTime: number;
  audioLevel: number;
  interruptDetected: boolean;
}

export function useVoiceInteraction(config: VoiceInteractionConfig = {}) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isIntelligentMode, setIsIntelligentMode] = useState(config.intelligentMode || false);
  const [voiceActivity, setVoiceActivity] = useState<VoiceActivityState>({
    isUserSpeaking: false,
    silenceStartTime: null,
    lastSpeechTime: 0,
    audioLevel: 0,
    interruptDetected: false
  });
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const vadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');
  
  // More aggressive thresholds for reliable interruption
  const SILENCE_THRESHOLD = config.silenceThreshold || 2000; // 2 seconds default
  const INTERRUPT_THRESHOLD = config.interruptThreshold || 0.015; // Very sensitive threshold
  const NOISE_GATE = 0.005; // Very low noise gate
  const VAD_CHECK_INTERVAL = 30; // Ultra-fast polling for immediate response

  // Initialize audio context for voice activity detection
  const initializeAudioContext = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (!micStreamRef.current) {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          } 
        });
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        const source = audioContextRef.current.createMediaStreamSource(micStreamRef.current);
        source.connect(analyserRef.current);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      toast({
        title: "Microphone access required",
        description: "Please allow microphone access for intelligent voice mode",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Voice activity detection using audio levels - runs continuously in intelligent mode
  const startVoiceActivityDetection = useCallback(() => {
    // Clear any existing timer first
    if (vadTimerRef.current) {
      clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }

    if (!analyserRef.current || !audioContextRef.current) {
      console.warn('Audio context or analyser not available for voice activity detection');
      return;
    }

    console.log('🟢 STARTING continuous voice activity detection for interruption...');

    let frameCount = 0;
    const checkVoiceActivity = () => {
      if (!analyserRef.current || !audioContextRef.current) {
        console.warn('Audio context lost, stopping voice activity detection');
        return;
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate RMS (Root Mean Square) for audio level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += (dataArray[i] / 255) ** 2;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Update voice activity state
      setVoiceActivity(prev => ({
        ...prev,
        audioLevel: rms,
        isUserSpeaking: rms > NOISE_GATE,
        lastSpeechTime: rms > NOISE_GATE ? Date.now() : prev.lastSpeechTime
      }));

      // CRITICAL INTERRUPTION LOGIC - Check every frame
      if (isSpeaking && rms > INTERRUPT_THRESHOLD) {
        console.log('🔴 VOICE INTERRUPTION DETECTED!', { 
          rms: rms.toFixed(4), 
          threshold: INTERRUPT_THRESHOLD,
          frameCount 
        });
        
        // Immediate audio stop
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsSpeaking(false);
          setIsGeneratingAudio(false);
          console.log('🛑 Audio stopped immediately');
          
          // Restart listening in intelligent mode
          if (isIntelligentMode && onTranscriptCompleteRef.current) {
            setTimeout(() => {
              console.log('🎤 Restarting listening after voice interruption...');
              if (onTranscriptCompleteRef.current) {
                startListening(onTranscriptCompleteRef.current);
              }
            }, 300);
          }
        }
      }

      // Log activity periodically for debugging
      frameCount++;
      if (frameCount % 20 === 0 && rms > 0.01) {
        console.log(`Voice monitor: RMS=${rms.toFixed(4)}, Speaking=${isSpeaking}, Threshold=${INTERRUPT_THRESHOLD}`);
      }
    };

    // Start monitoring at high frequency for responsive interruption
    vadTimerRef.current = setInterval(checkVoiceActivity, VAD_CHECK_INTERVAL);
    console.log(`🟢 Voice activity monitor started (${VAD_CHECK_INTERVAL}ms intervals)`);
  }, [isSpeaking, isIntelligentMode, NOISE_GATE, INTERRUPT_THRESHOLD, VAD_CHECK_INTERVAL]);

  // Initialize speech recognition with intelligent settings
  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech recognition not supported",
        description: "Your browser doesn't support speech recognition",
        variant: "destructive"
      });
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    if (isIntelligentMode) {
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
    } else {
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
    }
    
    recognition.lang = 'en-US';
    
    return recognition;
  }, [toast, isIntelligentMode]);

  // Process completed speech with natural language understanding
  const processCompletedSpeech = useCallback(() => {
    const transcript = lastTranscriptRef.current.trim();
    if (!transcript) return;

    // Clear the transcript for next input
    lastTranscriptRef.current = '';
    
    // Trigger speech processing with context awareness
    onTranscriptCompleteRef.current?.(transcript);
    
    // In intelligent mode, continue listening after processing
    if (isIntelligentMode) {
      setTimeout(() => {
        if (!isSpeaking) {
          startIntelligentListening();
        }
      }, 500);
    }
  }, [isIntelligentMode, isSpeaking]);

  // Start intelligent listening mode with continuous detection
  const startIntelligentListening = useCallback(async (onTranscript?: (transcript: string) => void) => {
    // Set the callback if provided
    if (onTranscript) {
      onTranscriptCompleteRef.current = onTranscript;
    }

    if (isIntelligentMode) {
      const audioInitialized = await initializeAudioContext();
      if (audioInitialized) {
        startVoiceActivityDetection();
      }
    }
    
    if (!recognitionRef.current) {
      recognitionRef.current = initializeSpeechRecognition();
      if (!recognitionRef.current) return;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        lastTranscriptRef.current = fullTranscript;
        
        // For final results, trigger the callback immediately
        if (finalTranscript && onTranscriptCompleteRef.current) {
          onTranscriptCompleteRef.current(finalTranscript);
        }
        
        // Provide real-time feedback for interim results
        onTranscriptUpdateRef.current?.(fullTranscript, !event.results[event.results.length - 1].isFinal);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone access denied",
            description: "Please allow microphone access for voice interaction",
            variant: "destructive"
          });
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isIntelligentMode && !isSpeaking) {
          // Automatically restart in intelligent mode
          setTimeout(() => {
            if (recognitionRef.current && isIntelligentMode) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.log('Recognition restart skipped - already running');
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };
    }

    try {
      setIsListening(true);
      recognitionRef.current.start();
    } catch (error) {
      console.log('Recognition already started');
    }
  }, [isIntelligentMode, isSpeaking, initializeAudioContext, startVoiceActivityDetection, initializeSpeechRecognition, toast]);

  // Callback refs for external handlers
  const onTranscriptCompleteRef = useRef<((transcript: string) => void) | null>(null);
  const onTranscriptUpdateRef = useRef<((transcript: string, isInterim: boolean) => void) | null>(null);

  // Start listening for speech input
  const startListening = useCallback((onResult: (transcript: string) => void) => {
    onTranscriptCompleteRef.current = onResult;
    
    if (isIntelligentMode) {
      startIntelligentListening();
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = initializeSpeechRecognition();
      if (!recognitionRef.current) return;
    }

    const recognition = recognitionRef.current;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        onResult(finalTranscript);
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      // Don't show error for common expected errors
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast({
          title: "Speech recognition error",
          description: "Failed to recognize speech. Please try again.",
          variant: "destructive"
        });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
    }
  }, [initializeSpeechRecognition, toast]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Generate and play speech from text using ElevenLabs with fast playback
  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsGeneratingAudio(true);
    console.log('Starting TTS generation for:', text.substring(0, 50) + '...');

    try {
      const startTime = performance.now();
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: config.voiceId || 'XB0fDUnXU5powFXDhCwa' // Charlotte - British female voice
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('TTS API error:', response.status, errorData);
        
        // Handle specific error scenarios
        if (response.status === 408) {
          throw new Error('Message too long for speech generation');
        } else if (response.status === 503) {
          throw new Error('Speech service temporarily unavailable');
        } else {
          throw new Error(`Speech generation failed: ${errorData.error || response.status}`);
        }
      }

      const audioBlob = await response.blob();
      const generateTime = performance.now() - startTime;
      console.log(`TTS generation completed in ${generateTime.toFixed(0)}ms`);
      
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      audioRef.current = new Audio(audioUrl);
      
      // Preload audio for faster playback
      audioRef.current.preload = 'auto';
      
      audioRef.current.oncanplaythrough = () => {
        console.log('Audio ready for playback');
        setIsGeneratingAudio(false);
        setIsSpeaking(true);
      };

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        console.log('Audio playback completed');
      };

      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        setIsGeneratingAudio(false);
        URL.revokeObjectURL(audioUrl);
        toast({
          title: "Audio playback error",
          description: "Failed to play generated speech",
          variant: "destructive"
        });
      };

      if (config.autoPlay !== false) {
        // Start playback and set rate after audio loads
        audioRef.current.onloadedmetadata = () => {
          if (audioRef.current) {
            audioRef.current.playbackRate = 1.33; // 33% faster
            console.log('Playback rate set to:', audioRef.current.playbackRate);
          }
        };
        
        audioRef.current.oncanplay = () => {
          setIsGeneratingAudio(false);
          setIsSpeaking(true);
          audioRef.current?.play().catch(console.error);
        };
        
        audioRef.current.load();
      }

    } catch (error: any) {
      console.error('Text-to-speech error:', error);
      setIsGeneratingAudio(false);
      
      // Provide specific error messages based on error type
      let errorMessage = "Failed to generate speech. Please try again.";
      if (error.message?.includes('too long')) {
        errorMessage = "Message too long for speech generation. Try a shorter response.";
      } else if (error.message?.includes('temporarily unavailable')) {
        errorMessage = "Speech service temporarily unavailable. Please try again in a moment.";
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      toast({
        title: "Speech generation failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [config.voiceId, config.autoPlay, toast]);

  // Stop current speech
  const stopSpeaking = useCallback(() => {
    console.log('Stopping speech playback...');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = ''; // Clear the audio source
      setIsSpeaking(false);
      setIsGeneratingAudio(false);
    }
  }, []);

  // Toggle intelligent mode with proper audio context initialization
  const toggleIntelligentMode = useCallback(async () => {
    const newMode = !isIntelligentMode;
    setIsIntelligentMode(newMode);
    
    if (isListening) {
      stopListening();
    }
    
    // When activating intelligent mode, initialize audio context for interruption detection
    if (newMode) {
      console.log('🟢 Activating intelligent mode - initializing audio context...');
      const audioInitialized = await initializeAudioContext();
      if (audioInitialized) {
        console.log('🟢 Audio context ready - starting continuous voice activity detection...');
        // Start voice activity detection immediately and keep it running
        startVoiceActivityDetection();
      } else {
        console.error('❌ Failed to initialize audio context');
        setIsIntelligentMode(false);
      }
    } else {
      // When deactivating, clean up voice activity detection
      console.log('🔴 Deactivating intelligent mode - stopping voice activity detection...');
      if (vadTimerRef.current) {
        clearInterval(vadTimerRef.current);
        vadTimerRef.current = null;
      }
    }
  }, [isIntelligentMode, isListening, stopListening, initializeAudioContext, startVoiceActivityDetection]);

  // Ensure voice activity detection runs when in intelligent mode
  useEffect(() => {
    if (isIntelligentMode && analyserRef.current && !vadTimerRef.current) {
      console.log('🟢 Starting voice activity detection for intelligent mode...');
      startVoiceActivityDetection();
    } else if (!isIntelligentMode && vadTimerRef.current) {
      console.log('🔴 Stopping voice activity detection...');
      clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
    
    return () => {
      if (vadTimerRef.current) {
        clearInterval(vadTimerRef.current);
        vadTimerRef.current = null;
      }
    };
  }, [isIntelligentMode, startVoiceActivityDetection]);

  // Enhanced cleanup function
  const cleanup = useCallback(() => {
    if (vadTimerRef.current) {
      clearInterval(vadTimerRef.current);
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    stopListening();
    stopSpeaking();
  }, [stopListening, stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    isGeneratingAudio,
    isIntelligentMode,
    voiceActivity,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    toggleIntelligentMode,
    startIntelligentListening,
    cleanup
  };
}

// Extend window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}