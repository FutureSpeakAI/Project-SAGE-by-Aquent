import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useVoiceInteraction } from "@/hooks/useVoiceInteraction";
import { useEffect, useRef } from "react";

interface VoiceControlsProps {
  onTranscript?: (text: string) => void;
  lastMessage?: string;
  autoPlayResponses?: boolean;
  className?: string;
}

export function VoiceControls({ 
  onTranscript, 
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

  // Auto-play new assistant messages if enabled
  useEffect(() => {
    if (lastMessage && autoPlayResponses && !isListening && !isSpeaking && lastMessage !== lastSpokenRef.current) {
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
  }, [lastMessage, autoPlayResponses, isListening, isSpeaking, speakText]);

  // Auto-reactivate microphone after SAGE finishes speaking for natural conversation
  useEffect(() => {
    if (!isSpeaking && !isGeneratingAudio && !isListening && onTranscript && autoPlayResponses) {
      // Small delay to ensure speech has fully stopped
      const timer = setTimeout(() => {
        if (!isSpeaking && !isGeneratingAudio && onTranscript) {
          startListening((transcript) => {
            onTranscript(transcript);
          });
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isSpeaking, isGeneratingAudio, isListening, onTranscript, autoPlayResponses, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleMicToggle = () => {
    console.log('Mic toggle clicked, isListening:', isListening);
    if (isListening) {
      stopListening();
    } else if (onTranscript) {
      console.log('Starting speech recognition...');
      startListening((transcript) => {
        console.log('Transcript received:', transcript);
        onTranscript(transcript);
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
        className={isListening ? "bg-green-500 hover:bg-green-600 text-white" : ""}
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