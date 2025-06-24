import React, { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SavedPersona, CreatePersonaRequest, UpdatePersonaRequest } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Pencil, Trash2, PlusCircle, UserCircle2, Filter, Tag } from "lucide-react";

interface PersonaLibraryProps {
  onSelectPersona: (persona: SavedPersona) => void;
}

export function PersonaLibrary({ onSelectPersona }: PersonaLibraryProps) {
  const [isPersonaFormOpen, setIsPersonaFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<SavedPersona | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [formData, setFormData] = useState<CreatePersonaRequest>({
    name: "",
    category: "General",
    description: "",
    instruction: ""
  });

  const { toast } = useToast();

  // Fetch saved personas
  const { data: personas = [], refetch } = useQuery({
    queryKey: ['/api/personas'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/personas');
      return response.json() as Promise<SavedPersona[]>;
    }
  });

  // Extract unique categories from personas
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>(personas.map(persona => persona.category || "General"));
    return ["all", ...Array.from(uniqueCategories)];
  }, [personas]);

  // Filter personas by category
  const filteredPersonas = useMemo(() => {
    if (activeCategory === "all") {
      return personas;
    }
    return personas.filter(persona => (persona.category || "General") === activeCategory);
  }, [personas, activeCategory]);

  // Create a new persona
  const createPersonaMutation = useMutation({
    mutationFn: async (data: CreatePersonaRequest) => {
      const response = await apiRequest('POST', '/api/personas', data);
      return response.json() as Promise<SavedPersona>;
    },
    onSuccess: () => {
      toast({
        title: "Persona saved",
        description: "Your persona has been saved to the library.",
      });
      setIsPersonaFormOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save persona",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update an existing persona
  const updatePersonaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePersonaRequest }) => {
      const response = await apiRequest('PUT', `/api/personas/${id}`, data);
      return response.json() as Promise<SavedPersona>;
    },
    onSuccess: () => {
      toast({
        title: "Persona updated",
        description: "Your persona has been updated successfully.",
      });
      setIsPersonaFormOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update persona",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete a persona
  const deletePersonaMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/personas/${id}`);
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Persona deleted",
        description: "The persona has been removed from your library.",
      });
      setIsDeleteDialogOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete persona",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle opening the form to create a new persona
  const handleCreateNew = () => {
    setFormData({
      name: "",
      category: "General",
      description: "",
      instruction: ""
    });
    setSelectedPersona(null);
    setIsPersonaFormOpen(true);
  };

  // Handle opening the form to edit an existing persona
  const handleEditPersona = (persona: SavedPersona) => {
    setSelectedPersona(persona);
    setFormData({
      name: persona.name,
      category: persona.category || "General",
      description: persona.description,
      instruction: persona.instruction
    });
    setIsPersonaFormOpen(true);
  };

  // Handle saving a persona (create or update)
  const handleSavePersona = () => {
    if (selectedPersona) {
      // Update existing persona
      updatePersonaMutation.mutate({
        id: selectedPersona.id,
        data: formData
      });
    } else {
      // Create new persona
      createPersonaMutation.mutate(formData);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (selectedPersona) {
      deletePersonaMutation.mutate(selectedPersona.id);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle selecting a category
  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({ ...prev, category }));
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#FF6600]">Persona Library</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Browse and manage your saved writing personas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={activeCategory}
            onValueChange={setActiveCategory}
          >
            <SelectTrigger className="w-[180px] border-[#FF6600]/20 focus:ring-[#FF6600]/20">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#FF6600]" />
                <SelectValue placeholder="Filter by category" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleCreateNew} 
            className="flex items-center gap-2 bg-[#FF6600] hover:bg-[#FF6600]/90"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Persona</span>
          </Button>
        </div>
      </div>
      
      <div className="overflow-y-auto pr-2 pb-6 space-y-6">
        {filteredPersonas.length === 0 ? (
          <div className="border rounded-lg p-8 text-center bg-white shadow-sm">
            <UserCircle2 className="h-16 w-16 mx-auto text-[#FF6600]/30 mb-4" />
            <h3 className="text-xl font-medium mb-2">
              {personas.length === 0 
                ? "No saved personas" 
                : `No personas found in "${activeCategory === "all" ? "All Categories" : activeCategory}"`}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {personas.length === 0 
                ? "Create personas to quickly transform your text with distinct writing styles and voice characteristics."
                : "Try selecting a different category or create a new persona to add to this collection."}
            </p>
            <Button 
              onClick={handleCreateNew} 
              className="bg-[#FF6600] hover:bg-[#FF6600]/90"
            >
              Create {personas.length === 0 ? "Your First" : "A New"} Persona
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredPersonas.map((persona) => (
                <Card key={persona.id} className="flex flex-col overflow-hidden border hover:border-[#FF6600]/70 transition-all shadow-sm hover:shadow-md bg-white group">
                  <CardHeader className="pb-3 bg-gray-50 group-hover:bg-[#FF6600]/5">
                    <div className="flex justify-between items-start">
                      <div className="w-4/5">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <CardTitle className="text-lg font-bold truncate" title={persona.name}>
                            {persona.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-[#FF6600]/10 text-[#FF6600] border-[#FF6600]/20 capitalize">
                            <Tag className="h-3 w-3 mr-1" />
                            {persona.category || "General"}
                          </Badge>
                          <CardDescription className="text-xs">
                            {formatDate(persona.updatedAt)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          onClick={() => handleEditPersona(persona)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-[#FF6600]/10"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          onClick={() => {
                            setSelectedPersona(persona);
                            setIsDeleteDialogOpen(true);
                          }} 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-red-100 text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3 flex-grow">
                    <div className="flex flex-col gap-3">
                      {persona.description && (
                        <div className="flex-1">
                          <h4 className="font-medium text-xs mb-1.5 text-[#FF6600] flex items-center">
                            Description:
                          </h4>
                          <div className="bg-gray-50 p-2.5 rounded-md border min-h-[60px] max-h-[100px] overflow-y-auto">
                            <p className="text-xs leading-relaxed line-clamp-4">{persona.description}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-xs mb-1.5 text-[#FF6600] flex items-center">
                          Instructions:
                        </h4>
                        <div className="bg-gray-50 p-2.5 rounded-md border min-h-[60px] max-h-[100px] overflow-y-auto">
                          <p className="text-xs leading-relaxed line-clamp-4">{persona.instruction}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-1 pb-3 flex justify-end">
                    <Button 
                      onClick={() => onSelectPersona(persona)} 
                      className="bg-white text-[#FF6600] hover:bg-[#FF6600] hover:text-white border-[#FF6600] border w-full sm:w-auto"
                    >
                      <UserCircle2 className="h-4 w-4 mr-1.5" />
                      <span>Choose Persona</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {filteredPersonas.length > 0 && filteredPersonas.length % 4 === 0 && (
              <div className="flex justify-center mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredPersonas.length} {filteredPersonas.length === 1 ? 'persona' : 'personas'} 
                  {activeCategory !== 'all' ? ` in category "${activeCategory}"` : ''}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Dialog for Creating/Editing Personas */}
      <Dialog 
        open={isPersonaFormOpen} 
        onOpenChange={(open) => {
          setIsPersonaFormOpen(open);
          if (!open) {
            setFormData({
              name: "",
              category: "General",
              description: "",
              instruction: ""
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-[#FF6600]">
              <UserCircle2 className="h-5 w-5" />
              {selectedPersona ? 'Edit Persona' : 'Create New Persona'}
            </DialogTitle>
            <DialogDescription>
              {selectedPersona 
                ? 'Make changes to your saved persona.' 
                : 'Create a new persona to save to your library for transforming content with distinct writing styles.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#FF6600] font-medium">Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange}
                  placeholder="e.g., Shakespearean, Business Professional, etc." 
                  className="border-gray-300 focus-visible:ring-[#FF6600]/30"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category" className="text-[#FF6600] font-medium">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger id="category" className="border-gray-300 focus-visible:ring-[#FF6600]/30">
                    <SelectValue  />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Creative">Creative</SelectItem>
                    <SelectItem value="Academic">Academic</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Conversational">Conversational</SelectItem>
                    <SelectItem value="Historical">Historical</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#FF6600] font-medium">Description (Optional)</Label>
              <Textarea 
                id="description" 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange}
                placeholder="Brief description of this persona style"
                className="min-h-[80px] border-gray-300 focus-visible:ring-[#FF6600]/30"
              />
              <p className="text-xs text-muted-foreground">
                Provide a short description that summarizes the writing style or tone of this persona.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instruction" className="text-[#FF6600] font-medium">Instructions</Label>
              <Textarea 
                id="instruction" 
                name="instruction" 
                value={formData.instruction} 
                onChange={handleInputChange}
                placeholder="e.g., Rewrite the text in the style of Shakespeare using Early Modern English vocabulary, iambic pentameter, and frequent metaphors."
                className="min-h-[120px] border-gray-300 focus-visible:ring-[#FF6600]/30"
              />
              <p className="text-xs text-muted-foreground">
                Provide clear, detailed instructions for how the AI should transform the text using this persona.
                The more specific your guidance, the more accurate and consistent the results will be.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsPersonaFormOpen(false)}
              disabled={createPersonaMutation.isPending || updatePersonaMutation.isPending}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSavePersona}
              disabled={
                !formData.name || 
                !formData.instruction ||
                createPersonaMutation.isPending || 
                updatePersonaMutation.isPending
              }
              className="bg-[#FF6600] hover:bg-[#FF6600]/90"
            >
              {createPersonaMutation.isPending || updatePersonaMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Saving...
                </span>
              ) : (
                selectedPersona ? 'Update Persona' : 'Save Persona'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this persona from your library.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePersonaMutation.isPending}
            >
              {deletePersonaMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}