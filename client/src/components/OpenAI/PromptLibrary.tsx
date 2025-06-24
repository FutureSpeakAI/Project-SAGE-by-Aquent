import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SavedPrompt, CreatePromptRequest, UpdatePromptRequest } from "@/lib/types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BookMarked, MoreVertical, Pencil, Save, Trash2, PlusCircle, Filter, Tag } from "lucide-react";

interface PromptLibraryProps {
  onSelectPrompt: (prompt: SavedPrompt) => void;
}

export function PromptLibrary({ onSelectPrompt }: PromptLibraryProps) {
  const [isPromptFormOpen, setIsPromptFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<SavedPrompt | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [formData, setFormData] = useState<CreatePromptRequest>({
    name: "",
    category: "General",
    systemPrompt: "",
    userPrompt: ""
  });

  const { toast } = useToast();

  // Fetch saved prompts
  const { data: prompts = [], refetch } = useQuery({
    queryKey: ['/api/prompts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/prompts');
      return response.json() as Promise<SavedPrompt[]>;
    }
  });

  // Extract unique categories from prompts
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>(prompts.map(prompt => prompt.category || "General"));
    return ["all", ...Array.from(uniqueCategories)];
  }, [prompts]);

  // Filter prompts by category
  const filteredPrompts = useMemo(() => {
    if (activeCategory === "all") {
      return prompts;
    }
    return prompts.filter(prompt => (prompt.category || "General") === activeCategory);
  }, [prompts, activeCategory]);

  // Create a new prompt
  const createPromptMutation = useMutation({
    mutationFn: async (data: CreatePromptRequest) => {
      const response = await apiRequest('POST', '/api/prompts', data);
      return response.json() as Promise<SavedPrompt>;
    },
    onSuccess: () => {
      toast({
        title: "Prompt saved",
        description: "Your prompt has been saved to the library.",
      });
      setIsPromptFormOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save prompt",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update an existing prompt
  const updatePromptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePromptRequest }) => {
      const response = await apiRequest('PUT', `/api/prompts/${id}`, data);
      return response.json() as Promise<SavedPrompt>;
    },
    onSuccess: () => {
      toast({
        title: "Prompt updated",
        description: "Your prompt has been updated successfully.",
      });
      setIsPromptFormOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update prompt",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete a prompt
  const deletePromptMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/prompts/${id}`);
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Prompt deleted",
        description: "The prompt has been removed from your library.",
      });
      setIsDeleteDialogOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete prompt",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle opening the form to create a new prompt
  const handleCreateNew = () => {
    setFormData({
      name: "",
      category: "General",
      systemPrompt: "",
      userPrompt: ""
    });
    setSelectedPrompt(null);
    setIsPromptFormOpen(true);
  };

  // Handle opening the form to edit an existing prompt
  const handleEditPrompt = (prompt: SavedPrompt) => {
    setSelectedPrompt(prompt);
    setFormData({
      name: prompt.name,
      category: prompt.category || "General",
      systemPrompt: prompt.systemPrompt || "",
      userPrompt: prompt.userPrompt || ""
    });
    setIsPromptFormOpen(true);
  };

  // Handle saving a prompt (create or update)
  const handleSavePrompt = () => {
    if (selectedPrompt) {
      // Update existing prompt
      updatePromptMutation.mutate({
        id: selectedPrompt.id,
        data: formData
      });
    } else {
      // Create new prompt
      createPromptMutation.mutate(formData);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (selectedPrompt) {
      deletePromptMutation.mutate(selectedPrompt.id);
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
          <h2 className="text-2xl font-bold text-[#FF6600]">Prompt Library</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Browse and manage your saved prompt templates
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
            <span>New Prompt</span>
          </Button>
        </div>
      </div>
      
      <div className="overflow-y-auto pr-2 pb-6 space-y-6">
        {filteredPrompts.length === 0 ? (
          <div className="border rounded-lg p-8 text-center bg-white shadow-sm">
            <BookMarked className="h-16 w-16 mx-auto text-[#FF6600]/30 mb-4" />
            <h3 className="text-xl font-medium mb-2">
              {prompts.length === 0 
                ? "No saved prompts" 
                : `No prompts found in "${activeCategory === "all" ? "All Categories" : activeCategory}"`}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {prompts.length === 0 
                ? "Save your favorite prompts to quickly use them later and streamline your content creation workflow."
                : "Try selecting a different category or create a new prompt to add to this collection."}
            </p>
            <Button 
              onClick={handleCreateNew} 
              className="bg-[#FF6600] hover:bg-[#FF6600]/90"
            >
              Create {prompts.length === 0 ? "Your First" : "A New"} Prompt
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredPrompts.map((prompt) => (
                <Card key={prompt.id} className="flex flex-col overflow-hidden border hover:border-[#FF6600]/70 transition-all shadow-sm hover:shadow-md bg-white group">
                  <CardHeader className="pb-3 bg-gray-50 group-hover:bg-[#FF6600]/5">
                    <div className="flex justify-between items-start">
                      <div className="w-4/5">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <CardTitle className="text-lg font-bold truncate" title={prompt.name}>
                            {prompt.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-[#FF6600]/10 text-[#FF6600] border-[#FF6600]/20 capitalize">
                            <Tag className="h-3 w-3 mr-1" />
                            {prompt.category || "General"}
                          </Badge>
                          <CardDescription className="text-xs">
                            {formatDate(prompt.updatedAt)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          onClick={() => handleEditPrompt(prompt)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-[#FF6600]/10"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          onClick={() => {
                            setSelectedPrompt(prompt);
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
                      {prompt.systemPrompt && (
                        <div className="flex-1">
                          <h4 className="font-medium text-xs mb-1.5 text-[#FF6600] flex items-center">
                            System Prompt:
                          </h4>
                          <div className="bg-gray-50 p-2.5 rounded-md border min-h-[60px] max-h-[100px] overflow-y-auto">
                            <p className="text-xs leading-relaxed line-clamp-4">{prompt.systemPrompt}</p>
                          </div>
                        </div>
                      )}
                      {prompt.userPrompt && (
                        <div className="flex-1">
                          <h4 className="font-medium text-xs mb-1.5 text-[#FF6600] flex items-center">
                            User Prompt:
                          </h4>
                          <div className="bg-gray-50 p-2.5 rounded-md border min-h-[60px] max-h-[100px] overflow-y-auto">
                            <p className="text-xs leading-relaxed line-clamp-4">{prompt.userPrompt}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-1 pb-3 flex justify-end">
                    <Button 
                      onClick={() => onSelectPrompt(prompt)} 
                      className="bg-white text-[#FF6600] hover:bg-[#FF6600] hover:text-white border-[#FF6600] border w-full sm:w-auto"
                    >
                      <Save className="h-4 w-4 mr-1.5" />
                      <span>Deploy Prompt</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {filteredPrompts.length > 0 && filteredPrompts.length % 4 === 0 && (
              <div className="flex justify-center mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredPrompts.length} {filteredPrompts.length === 1 ? 'prompt' : 'prompts'} 
                  {activeCategory !== 'all' ? ` in category "${activeCategory}"` : ''}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Dialog for Creating/Editing Prompts */}
      <Dialog 
        open={isPromptFormOpen} 
        onOpenChange={(open) => {
          setIsPromptFormOpen(open);
          if (!open) {
            setFormData({
              name: "",
              category: "General",
              systemPrompt: "",
              userPrompt: ""
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-[#FF6600]">
              <BookMarked className="h-5 w-5" />
              {selectedPrompt ? 'Edit Prompt' : 'Create New Prompt'}
            </DialogTitle>
            <DialogDescription>
              {selectedPrompt 
                ? 'Make changes to your saved prompt.' 
                : 'Create a new prompt to save to your library for quicker content generation.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#FF6600] font-medium">Prompt Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange}
                  placeholder="Enter a descriptive name" 
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
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Creative">Creative</SelectItem>
                    <SelectItem value="Academic">Academic</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="systemPrompt" className="text-[#FF6600] font-medium">System Prompt (Optional)</Label>
              <Textarea 
                id="systemPrompt" 
                name="systemPrompt" 
                value={formData.systemPrompt} 
                onChange={handleInputChange}
                placeholder="Enter system instructions for the AI"
                className="min-h-[100px] border-gray-300 focus-visible:ring-[#FF6600]/30"
              />
              <p className="text-xs text-muted-foreground">
                System prompts set the general behavior, capabilities, and limitations of the AI. They define how the model should operate overall.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="userPrompt" className="text-[#FF6600] font-medium">User Prompt (Optional)</Label>
              <Textarea 
                id="userPrompt" 
                name="userPrompt" 
                value={formData.userPrompt} 
                onChange={handleInputChange}
                placeholder="Enter the prompt text"
                className="min-h-[100px] border-gray-300 focus-visible:ring-[#FF6600]/30"
              />
              <p className="text-xs text-muted-foreground">
                User prompts are the specific requests or questions for the AI. At least one of System Prompt or User Prompt must be provided.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsPromptFormOpen(false)}
              disabled={createPromptMutation.isPending || updatePromptMutation.isPending}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSavePrompt}
              disabled={
                !formData.name || 
                (!formData.systemPrompt && !formData.userPrompt) ||
                createPromptMutation.isPending || 
                updatePromptMutation.isPending
              }
              className="bg-[#FF6600] hover:bg-[#FF6600]/90"
            >
              {createPromptMutation.isPending || updatePromptMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Saving...
                </span>
              ) : (
                selectedPrompt ? 'Update Prompt' : 'Save Prompt'
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
              This will permanently delete this prompt from your library.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePromptMutation.isPending}
            >
              {deletePromptMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}