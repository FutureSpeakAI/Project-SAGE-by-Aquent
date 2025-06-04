import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInteractionConfig {
  voiceId?: string;
  autoPlay?: boolean;
}

export function useVoiceInteraction(config: VoiceInteractionConfig = {}) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize speech recognition
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
    
    recognition.continuous = false;
    recognition.interimResults = true; // Show interim results for better UX
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    return recognition;
  }, [toast]);

  // Start listening for speech input
  const startListening = useCallback((onResult: (transcript: string) => void) => {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const generateTime = performance.now() - startTime;
      console.log(`TTS generation completed in ${generateTime.toFixed(0)}ms`);
      
      // Use Web Audio API for precise speed control
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Create audio source with speed control
      const source = audioContext.createBufferSource();
      source.buffer = decodedAudio;
      source.playbackRate.value = 1.33; // 33% faster
      source.connect(audioContext.destination);
      
      console.log('Audio playback rate set to:', source.playbackRate.value);
      
      setIsGeneratingAudio(false);
      setIsSpeaking(true);

      source.onended = () => {
        setIsSpeaking(false);
        console.log('Audio playback completed at faster rate');
      };

      if (config.autoPlay !== false) {
        source.start(0);
        // Store reference for stopping
        (audioRef as any).current = { 
          pause: () => source.stop(),
          currentTime: 0,
          src: ''
        };
      }

    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsGeneratingAudio(false);
      toast({
        title: "Text-to-speech error",
        description: "Failed to generate speech. Please check your connection.",
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

  // Cleanup
  const cleanup = useCallback(() => {
    stopListening();
    stopSpeaking();
  }, [stopListening, stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    isGeneratingAudio,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
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