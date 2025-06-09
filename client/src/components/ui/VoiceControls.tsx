import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, VolumeX, Loader2, Brain, Waves } from "lucide-react";
import { useVoiceInteraction } from "@/hooks/useVoiceInteraction";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VoiceControlsProps {
  onTranscript?: (text: string, isVoiceInitiated?: boolean) => void;
  onSendMessage?: () => void; // Function to automatically send the message
  lastMessage?: string;
  autoPlayResponses?: boolean;
  isVoiceInitiated?: boolean;
  onVoiceStateChange?: (isVoiceActive: boolean) => void;
  className?: string;
}

export function VoiceControls({ 
  onTranscript, 
  onSendMessage,
  lastMessage, 
  autoPlayResponses = true,
  isVoiceInitiated = false,
  onVoiceStateChange,
  className = ""
}: VoiceControlsProps) {
  const {
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
  } = useVoiceInteraction({ 
    autoPlay: autoPlayResponses,
    intelligentMode: false
  });

  // Track the last spoken message to prevent repeats
  const lastSpokenRef = useRef<string>('');
  // Track voice conversation state
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState<boolean>(false);

  // Auto-play new assistant messages only during active voice sessions or when voice is initiated
  useEffect(() => {
    if (lastMessage && autoPlayResponses && (isVoiceSessionActive || isVoiceInitiated) && !isListening && !isSpeaking && lastMessage !== lastSpokenRef.current) {
      // Clean the message text for better speech synthesis
      const cleanText = lastMessage
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/`(.*?)`/g, '$1') // Remove code backticks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/#{1,6}\s/g, '') // Remove headers
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .trim();
      
      if (cleanText && cleanText.length > 10) { // Only speak substantial messages
        lastSpokenRef.current = lastMessage; // Mark this message as spoken
        speakText(cleanText);
      }
    }
  }, [lastMessage, autoPlayResponses, isVoiceSessionActive, isListening, isSpeaking, speakText]);

  // Auto-reactivate microphone only after SAGE finishes speaking (not on errors or initial load)
  const lastSpeakingRef = useRef(false);
  
  useEffect(() => {
    // Track when SAGE just finished speaking
    if (lastSpeakingRef.current && !isSpeaking && !isGeneratingAudio) {
      console.log('SAGE finished speaking, will reactivate microphone soon...');
      if (isVoiceSessionActive && !isListening && onTranscript) {
        const timer = setTimeout(() => {
          if (isVoiceSessionActive && !isSpeaking && !isGeneratingAudio && !isListening && onTranscript) {
            console.log('Auto-reactivating microphone after SAGE finished speaking...');
            startListening((transcript) => {
              if (onTranscript) {
                onTranscript(transcript, isVoiceSessionActive);
              }
            });
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
    lastSpeakingRef.current = isSpeaking || isGeneratingAudio;
  }, [isSpeaking, isGeneratingAudio, isVoiceSessionActive, isListening, onTranscript, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleMicToggle = () => {
    console.log('Mic toggle clicked, isListening:', isListening, 'voiceSessionActive:', isVoiceSessionActive);
    if (isListening) {
      // User wants to stop current listening
      stopListening();
    } else if (isVoiceSessionActive) {
      // User wants to end the voice session
      setIsVoiceSessionActive(false);
      onVoiceStateChange?.(false);
      console.log('Voice session ended by user');
    } else if (onTranscript) {
      // User wants to start voice conversation
      console.log('Starting voice session...');
      setIsVoiceSessionActive(true);
      onVoiceStateChange?.(true);
      startListening((transcript) => {
        console.log('Transcript received:', transcript);
        if (onTranscript) {
          onTranscript(transcript, true);
        }
      });
    }
  };

  const handleSpeakerToggle = () => {
    console.log('Speaker toggle clicked, isSpeaking:', isSpeaking, 'lastMessage:', lastMessage);
    if (isSpeaking || isGeneratingAudio) {
      console.log('Stopping speech...');
      stopSpeaking();
    } else if (lastMessage) {
      const cleanText = lastMessage
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/\n+/g, ' ')
        .trim();
      
      console.log('Clean text for speech:', cleanText);
      if (cleanText) {
        console.log('Starting text-to-speech...');
        speakText(cleanText);
      }
    }
  };

  // Handle intelligent mode activation
  const handleIntelligentModeToggle = () => {
    if (isIntelligentMode) {
      toggleIntelligentMode();
      setIsVoiceSessionActive(false);
      onVoiceStateChange?.(false);
    } else {
      toggleIntelligentMode();
      setIsVoiceSessionActive(true);
      onVoiceStateChange?.(true);
      // Start intelligent listening after a brief delay
      setTimeout(() => {
        if (onTranscript) {
          startIntelligentListening();
        }
      }, 500);
    }
  };

  // Unified microphone handler for intelligent voice mode
  const handleUnifiedMicToggle = () => {
    console.log('Unified mic toggle clicked, current states:', { 
      isIntelligentMode, 
      isListening, 
      isVoiceSessionActive 
    });
    
    if (!isIntelligentMode) {
      // First click - activate intelligent mode
      console.log('Activating intelligent voice mode...');
      toggleIntelligentMode();
      setIsVoiceSessionActive(true);
      onVoiceStateChange?.(true);
      
      // Start intelligent listening after a brief delay
      setTimeout(() => {
        if (onTranscript) {
          console.log('Starting intelligent listening...');
          startIntelligentListening((transcript) => {
            console.log('Intelligent transcript received:', transcript);
            onTranscript(transcript, true);
          });
        }
      }, 500);
    } else if (isListening) {
      // Currently listening - stop listening but stay in intelligent mode
      console.log('Stopping current listening...');
      stopListening();
    } else {
      // In intelligent mode but not listening - restart listening
      console.log('Restarting intelligent listening...');
      if (onTranscript) {
        startIntelligentListening((transcript) => {
          console.log('Intelligent transcript received:', transcript);
          onTranscript(transcript, true);
        });
      }
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Unified Microphone Button */}
      <Button
        variant={isIntelligentMode ? "default" : "outline"}
        size="sm"
        onClick={handleUnifiedMicToggle}
        disabled={isSpeaking || isGeneratingAudio}
        className={cn(
          "relative",
          isListening 
            ? "bg-green-500 hover:bg-green-600 text-white" 
            : isIntelligentMode 
              ? "bg-blue-500 hover:bg-blue-600 text-white" 
              : "hover:bg-gray-50"
        )}
        title={
          !isIntelligentMode 
            ? "Click to start intelligent voice mode" 
            : isListening 
              ? "Click to stop listening"
              : "Click to start listening"
        }
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {isIntelligentMode && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </Button>

      {/* Voice Activity Indicator - only show when in intelligent mode */}
      {isIntelligentMode && (
        <div className="flex items-center gap-1">
          <Waves className={cn(
            "h-3 w-3 transition-colors",
            voiceActivity?.isUserSpeaking ? "text-green-500" : "text-gray-400"
          )} />
          <div className="w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-100 ease-out"
              style={{ width: `${Math.min((voiceActivity?.audioLevel || 0) * 500, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Badge - only show when actively listening */}
      {isIntelligentMode && isListening && (
        <Badge variant="secondary" className="text-xs">
          Listening
        </Badge>
      )}
    </div>
  );
}