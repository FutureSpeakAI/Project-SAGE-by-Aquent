import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SavedPrompt, SavedPersona } from "@/lib/types";
import { PromptLibrary } from "./PromptLibrary";
import { PersonaLibrary } from "./PersonaLibrary";
import { BookText, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <DialogContent className="max-w-[95vw] w-full h-[90vh] max-h-[90vh] overflow-hidden p-0 md:p-0">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-2xl font-bold text-[#FF6600]">AI Content Library</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </div>
          </div>
          
          <Tabs
            defaultValue={activeTab}
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="border-b">
              <TabsList className="flex w-full justify-start px-6 h-14 bg-white border-b">
                <TabsTrigger 
                  value="prompts" 
                  className="flex items-center gap-2 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6600] data-[state=active]:text-[#FF6600] data-[state=active]:bg-transparent"
                >
                  <BookText className="h-5 w-5" />
                  <span className="font-medium">Prompt Library</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="personas" 
                  className="flex items-center gap-2 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6600] data-[state=active]:text-[#FF6600] data-[state=active]:bg-transparent"
                >
                  <Users className="h-5 w-5" />
                  <span className="font-medium">Persona Library</span>
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="prompts" className="p-6 m-0 h-full">
                <PromptLibrary onSelectPrompt={handleSelectPrompt} />
              </TabsContent>
              <TabsContent value="personas" className="p-6 m-0 h-full">
                <PersonaLibrary onSelectPersona={handleSelectPersona} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}