import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useVoiceInteraction } from "@/hooks/useVoiceInteraction";
import { useEffect } from "react";

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

  // Auto-play new assistant messages if enabled
  useEffect(() => {
    if (lastMessage && autoPlayResponses && !isListening) {
      // Clean the message text for better speech synthesis
      const cleanText = lastMessage
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/`(.*?)`/g, '$1') // Remove code backticks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/#{1,6}\s/g, '') // Remove headers
        .replace(/\n+/g, ' ') // Replace newlines with spaces
        .trim();
      
      if (cleanText) {
        speakText(cleanText);
      }
    }
  }, [lastMessage, autoPlayResponses, isListening, speakText]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else if (onTranscript) {
      startListening(onTranscript);
    }
  };

  const handleSpeakerToggle = () => {
    if (isSpeaking || isGeneratingAudio) {
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
      
      if (cleanText) {
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
        className={isListening ? "bg-red-500 hover:bg-red-600 text-white" : ""}
      >
        {isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
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