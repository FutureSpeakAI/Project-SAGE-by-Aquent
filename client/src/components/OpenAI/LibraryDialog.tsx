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
      <DialogContent className="max-w-[100vw] w-full h-[100vh] max-h-[100vh] overflow-hidden p-0 md:p-0 rounded-none">
        <div className="flex flex-col h-full">
          <div className="p-4 md:p-6 border-b bg-[#FF6600]/5">
            <div className="flex justify-between items-center max-w-screen-2xl mx-auto">
              <DialogTitle className="text-2xl font-bold text-[#FF6600]">
                <div className="flex items-center gap-2">
                  {activeTab === "prompts" ? (
                    <BookText className="h-6 w-6" />
                  ) : (
                    <Users className="h-6 w-6" />
                  )}
                  <span>
                    {activeTab === "prompts" ? "Prompt Library" : "Persona Library"}
                  </span>
                </div>
              </DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-[#FF6600]/10">
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
            <div className="border-b bg-white">
              <div className="max-w-screen-2xl mx-auto">
                <TabsList className="flex justify-start h-14 bg-white border-b-0 w-auto rounded-none">
                  <TabsTrigger 
                    value="prompts" 
                    className="flex items-center gap-2 py-3 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6600] data-[state=active]:text-[#FF6600] data-[state=active]:bg-transparent"
                  >
                    <BookText className="h-5 w-5" />
                    <span className="font-medium">Prompt Library</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="personas" 
                    className="flex items-center gap-2 py-3 px-6 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6600] data-[state=active]:text-[#FF6600] data-[state=active]:bg-transparent"
                  >
                    <Users className="h-5 w-5" />
                    <span className="font-medium">Persona Library</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
              <div className="max-w-screen-2xl mx-auto">
                <TabsContent value="prompts" className="p-4 md:p-6 m-0 h-full">
                  <PromptLibrary onSelectPrompt={handleSelectPrompt} />
                </TabsContent>
                <TabsContent value="personas" className="p-4 md:p-6 m-0 h-full">
                  <PersonaLibrary onSelectPersona={handleSelectPersona} />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}