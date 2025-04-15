import React, { useState, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BookMarked, MoreVertical, Pencil, Save, Trash2, PlusCircle } from "lucide-react";

interface PromptLibraryProps {
  onSelectPrompt: (prompt: SavedPrompt) => void;
}

export function PromptLibrary({ onSelectPrompt }: PromptLibraryProps) {
  const [isPromptFormOpen, setIsPromptFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<SavedPrompt | null>(null);
  const [formData, setFormData] = useState<CreatePromptRequest>({
    name: "",
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
      systemPrompt: prompt.systemPrompt || "",
      userPrompt: prompt.userPrompt || ""
    });
    setIsPromptFormOpen(true);
  };

  // Handle saving a prompt (create or update)
  const handleSavePrompt = () => {
    // Validate that at least one of systemPrompt or userPrompt is provided
    if (!formData.systemPrompt && !formData.userPrompt) {
      toast({
        title: "Validation Error",
        description: "Either a system prompt or user prompt must be provided.",
        variant: "destructive",
      });
      return;
    }

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prompt Library</h2>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          <span>New Prompt</span>
        </Button>
      </div>

      {prompts.length === 0 ? (
        <div className="border rounded-lg p-8 text-center bg-muted/50">
          <BookMarked className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No saved prompts</h3>
          <p className="text-muted-foreground mb-4">
            Save your favorite prompts to quickly use them later.
          </p>
          <Button onClick={handleCreateNew} variant="outline">
            Create Your First Prompt
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl truncate" title={prompt.name}>
                    {prompt.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditPrompt(prompt)} className="flex items-center gap-2">
                        <Pencil className="h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedPrompt(prompt);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-destructive flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>{formatDate(prompt.updatedAt)}</CardDescription>
              </CardHeader>
              <CardContent className="py-2 flex-grow">
                <div className="flex flex-col h-full">
                  {prompt.systemPrompt && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-muted-foreground">System Prompt:</span>
                      <p className="text-sm line-clamp-3">{prompt.systemPrompt}</p>
                    </div>
                  )}
                  {prompt.userPrompt && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">User Prompt:</span>
                      <p className="text-sm line-clamp-3">{prompt.userPrompt}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  onClick={() => onSelectPrompt(prompt)} 
                  variant="secondary" 
                  className="w-full flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Use This Prompt</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog for Creating/Editing Prompts */}
      <Dialog 
        open={isPromptFormOpen} 
        onOpenChange={(open) => {
          setIsPromptFormOpen(open);
          if (!open) {
            setFormData({
              name: "",
              systemPrompt: "",
              userPrompt: ""
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedPrompt ? 'Edit Prompt' : 'Create New Prompt'}</DialogTitle>
            <DialogDescription>
              {selectedPrompt 
                ? 'Make changes to your saved prompt.' 
                : 'Create a new prompt to save to your library.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Prompt Name</Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange}
                placeholder="Enter a descriptive name" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt (Optional)</Label>
              <Textarea 
                id="systemPrompt" 
                name="systemPrompt" 
                value={formData.systemPrompt} 
                onChange={handleInputChange}
                placeholder="Enter system instructions for the AI"
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="userPrompt">User Prompt (Optional)</Label>
              <Textarea 
                id="userPrompt" 
                name="userPrompt" 
                value={formData.userPrompt} 
                onChange={handleInputChange}
                placeholder="Enter the prompt text"
                className="min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground">
                At least one of System Prompt or User Prompt must be provided.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPromptFormOpen(false)}
              disabled={createPromptMutation.isPending || updatePromptMutation.isPending}
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
            >
              {createPromptMutation.isPending || updatePromptMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
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
    </div>
  );
}