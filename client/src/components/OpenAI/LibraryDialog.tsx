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
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#FF6600]">AI Content Library</DialogTitle>
        </DialogHeader>
        
        <Tabs
          defaultValue={activeTab}
          value={activeTab}
          onValueChange={setActiveTab}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100">
            <TabsTrigger 
              value="prompts" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:text-[#FF6600] data-[state=active]:shadow-md"
            >
              <BookText className="h-5 w-5" />
              <span className="font-medium">Prompt Library</span>
            </TabsTrigger>
            <TabsTrigger 
              value="personas" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-white data-[state=active]:text-[#FF6600] data-[state=active]:shadow-md"
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">Persona Library</span>
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