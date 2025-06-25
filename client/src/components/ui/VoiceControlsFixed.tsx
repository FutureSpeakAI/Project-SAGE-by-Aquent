import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Waves } from "lucide-react";
import { useVoiceInteraction } from "@/hooks/useVoiceInteraction";
import { useSimpleAudio } from "@/hooks/useSimpleAudio";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VoiceControlsProps {
  onTranscript?: (text: string, isVoiceInitiated?: boolean) => void;
  onSendMessage?: () => void;
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
    isIntelligentMode,
    voiceActivity,
    startListening,
    stopListening,
    toggleIntelligentMode,
    startIntelligentListening,
    cleanup
  } = useVoiceInteraction({ 
    autoPlay: false,
    intelligentMode: false
  });

  const { isPlaying, isGenerating, playText, stopAudio } = useSimpleAudio({
    voiceId: 'EIiMwBhVWqDH8qqOWIrt',
    playbackRate: 1.33
  });

  const lastSpokenRef = useRef<string>('');
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState<boolean>(false);

  // Auto-play assistant messages
  useEffect(() => {
    if (lastMessage && autoPlayResponses && (isVoiceSessionActive || isVoiceInitiated) && !isListening && !isPlaying && lastMessage !== lastSpokenRef.current) {
      const cleanText = lastMessage
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/\n+/g, ' ')
        .trim();
      
      if (cleanText && cleanText.length > 10) {
        lastSpokenRef.current = lastMessage;
        playText(cleanText);
      }
    }
  }, [lastMessage, autoPlayResponses, isVoiceSessionActive, isListening, isPlaying, playText]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const handleMicToggle = () => {
    // Handle interruption
    if (isPlaying || isGenerating) {
      stopAudio();
      return;
    }

    // Toggle listening
    if (isListening) {
      stopListening();
      setIsVoiceSessionActive(false);
      onVoiceStateChange?.(false);
    } else {
      setIsVoiceSessionActive(true);
      onVoiceStateChange?.(true);
      startListening((transcript) => {
        if (onTranscript) {
          onTranscript(transcript, true);
        }
        if (onSendMessage) {
          onSendMessage();
        }
      });
    }
  };



  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Voice Button */}
      <Button
        variant={isListening ? "default" : "outline"}
        size="sm"
        onClick={handleMicToggle}
        className={cn(
          "relative transition-all duration-200 min-w-[80px]",
          isListening && "bg-red-500 hover:bg-red-600 text-white"
        )}
      >
        {isListening ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
        {isListening ? "Stop" : "Voice"}
        
        {voiceActivity.isUserSpeaking && (
          <div className="absolute -top-1 -right-1">
            <Waves className="h-3 w-3 text-green-400 animate-pulse" />
          </div>
        )}
      </Button>

      {/* Status Badge */}
      {(isListening || isPlaying || isGenerating) && (
        <Badge variant="secondary" className="text-xs">
          {isGenerating ? "Generating..." : isPlaying ? "Speaking" : "Listening"}
        </Badge>
      )}
    </div>
  );
}