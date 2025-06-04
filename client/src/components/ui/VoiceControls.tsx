import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useVoiceInteraction } from "@/hooks/useVoiceInteraction";
import { useEffect, useRef, useState } from "react";

interface VoiceControlsProps {
  onTranscript?: (text: string) => void;
  onSendMessage?: () => void; // Function to automatically send the message
  lastMessage?: string;
  autoPlayResponses?: boolean;
  className?: string;
}

export function VoiceControls({ 
  onTranscript, 
  onSendMessage,
  lastMessage, 
  autoPlayResponses = true,
  className = ""
}: VoiceControlsProps) {
  const {
    isListening,
    isSpeaking,
    isGeneratingAudio,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    cleanup
  } = useVoiceInteraction({ autoPlay: autoPlayResponses });

  // Track the last spoken message to prevent repeats
  const lastSpokenRef = useRef<string>('');
  // Track voice conversation state
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState<boolean>(false);

  // Auto-play new assistant messages only during active voice sessions
  useEffect(() => {
    if (lastMessage && autoPlayResponses && isVoiceSessionActive && !isListening && !isSpeaking && lastMessage !== lastSpokenRef.current) {
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
                onTranscript(transcript);
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
      console.log('Voice session ended by user');
    } else if (onTranscript) {
      // User wants to start voice conversation
      console.log('Starting voice session...');
      setIsVoiceSessionActive(true);
      startListening((transcript) => {
        console.log('Transcript received:', transcript);
        if (onTranscript) {
          onTranscript(transcript);
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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Microphone Button */}
      <Button
        variant={isListening ? "default" : "outline"}
        size="sm"
        onClick={handleMicToggle}
        disabled={isSpeaking || isGeneratingAudio}
        className={
          isListening 
            ? "bg-green-500 hover:bg-green-600 text-white" 
            : isVoiceSessionActive 
              ? "bg-blue-100 border-blue-300 text-blue-700" 
              : ""
        }
        title={
          isListening 
            ? "Stop listening" 
            : isVoiceSessionActive 
              ? "End voice conversation" 
              : "Start voice conversation"
        }
      >
        <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
      </Button>

      {/* Speaker Button */}
      <Button
        variant={isSpeaking || isGeneratingAudio ? "default" : "outline"}
        size="sm"
        onClick={handleSpeakerToggle}
        disabled={!lastMessage || isListening}
        className={isSpeaking || isGeneratingAudio ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
      >
        {isGeneratingAudio ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSpeaking ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}