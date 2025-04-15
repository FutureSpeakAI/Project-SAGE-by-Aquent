import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SavedPrompt, SavedPersona } from "@/lib/types";
import { PromptLibrary } from "./PromptLibrary";
import { PersonaLibrary } from "./PersonaLibrary";
import { BookText, Users } from "lucide-react";

interface LibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPrompt: (prompt: SavedPrompt) => void;
  onSelectPersona: (persona: SavedPersona) => void;
  initialTab?: "prompts" | "personas";
}

export function LibraryDialog({ 
  open, 
  onOpenChange, 
  onSelectPrompt, 
  onSelectPersona,
  initialTab = "prompts" 
}: LibraryDialogProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const handleSelectPrompt = (prompt: SavedPrompt) => {
    onSelectPrompt(prompt);
    onOpenChange(false);
  };

  const handleSelectPersona = (persona: SavedPersona) => {
    onSelectPersona(persona);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Content Library</DialogTitle>
        </DialogHeader>
        
        <Tabs
          defaultValue={activeTab}
          value={activeTab}
          onValueChange={setActiveTab}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <BookText className="h-4 w-4" />
              <span>Prompts</span>
            </TabsTrigger>
            <TabsTrigger value="personas" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Personas</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="prompts" className="pt-4">
            <PromptLibrary onSelectPrompt={handleSelectPrompt} />
          </TabsContent>
          <TabsContent value="personas" className="pt-4">
            <PersonaLibrary onSelectPersona={handleSelectPersona} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}