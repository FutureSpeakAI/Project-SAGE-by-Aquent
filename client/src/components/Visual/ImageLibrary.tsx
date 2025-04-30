import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoaderCircle, X, Download, Trash2, Search, Library, FilterX, Copy, Edit, FolderPlus, Folder, FolderMinus, Plus, Loader2 } from "lucide-react";
import { GeneratedImage, ImageProject } from "@shared/schema";
import { cn } from "@/lib/utils";
import * as React from "react";

// Custom Label component since there seems to be an import issue
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label";

interface ImageLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateVariations?: (imageUrl: string, prompt: string) => void;
  onEditImage?: (imageUrl: string, id: number) => void;
}

export function ImageLibrary({ open, onOpenChange, onCreateVariations, onEditImage }: ImageLibraryProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Utility function to safely parse metadata
  const parseMetadata = (metadata: any): Record<string, any> => {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch {
        return {};
      }
    }
    return metadata as Record<string, any>;
  };
  
  // Fetch images
  const { data: images = [], isLoading, error } = useQuery<GeneratedImage[]>({
    queryKey: ["/api/generated-images"],
    enabled: open,
  });
  
  // Fetch projects
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<ImageProject[]>({
    queryKey: ["/api/image-projects"],
    enabled: open,
  });
  
  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/generated-images/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete image");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-images"] });
      toast({
        title: "Success",
        description: "Image was deleted successfully",
      });
      // Close the preview if the deleted image was being previewed
      if (previewImage && previewImage.id === deleteImageMutation.variables) {
        setPreviewImage(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive",
      });
    },
  });
  
  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string, description: string | null }) => {
      const response = await apiRequest("POST", "/api/image-projects", projectData);
      if (!response.ok) {
        throw new Error("Failed to create project");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/image-projects"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      // Reset form
      setNewProjectName("");
      setNewProjectDescription("");
      setIsNewProjectDialogOpen(false);
      // Select the newly created project
      setSelectedProjectId(data.id.toString());
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    },
  });
  
  // Add image to project mutation
  const addToProjectMutation = useMutation({
    mutationFn: async ({ imageId, projectId }: { imageId: number, projectId: number }) => {
      const response = await apiRequest("POST", `/api/image-projects/${projectId}/images/${imageId}`);
      if (!response.ok) {
        throw new Error("Failed to add image to project");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/image-projects"] });
      toast({
        title: "Success",
        description: "Image added to project successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add image to project",
        variant: "destructive",
      });
    },
  });
  
  // Remove image from project mutation
  const removeFromProjectMutation = useMutation({
    mutationFn: async ({ imageId, projectId }: { imageId: number, projectId: number }) => {
      const response = await apiRequest("DELETE", `/api/image-projects/${projectId}/images/${imageId}`);
      if (!response.ok) {
        throw new Error("Failed to remove image from project");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generated-images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/image-projects"] });
      toast({
        title: "Success",
        description: "Image removed from project successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove image from project",
        variant: "destructive",
      });
    },
  });

  // Extract unique categories from the images metadata
  const getCategories = () => {
    const categories = new Set<string>();
    images.forEach(image => {
      const metadata = parseMetadata(image.metadata);
      if (metadata?.category) {
        categories.add(metadata.category);
      } else {
        categories.add("Uncategorized");
      }
    });
    return Array.from(categories);
  };
  
  const categories = getCategories();
  
  // Filter images based on search, category, and project
  const filteredImages = images.filter(image => {
    const matchesSearch = search === "" || 
      (image.title?.toLowerCase().includes(search.toLowerCase()) || 
       image.prompt?.toLowerCase().includes(search.toLowerCase()));
      
    const matchesCategory = selectedCategory === "all" || 
      (() => {
        const metadata = parseMetadata(image.metadata);
        if (selectedCategory === "Uncategorized") {
          return !metadata?.category;
        }
        return metadata?.category === selectedCategory;
      })();
    
    const matchesProject = selectedProjectId === "all" || 
      (selectedProjectId === "unassigned" 
        ? !image.projectId 
        : image.projectId === parseInt(selectedProjectId));
      
    return matchesSearch && matchesCategory && matchesProject;
  });
  
  // Handle adding image to project
  const handleAddToProject = (imageId: number, projectId: number) => {
    addToProjectMutation.mutate({ imageId, projectId });
  };
  
  // Handle removing image from project
  const handleRemoveFromProject = (imageId: number, projectId: number) => {
    removeFromProjectMutation.mutate({ imageId, projectId });
  };

  // Handle image download
  const handleDownloadImage = (imageUrl: string, title: string) => {
    // Create an invisible anchor element
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Download started",
      description: "Your image download has begun",
    });
  };
  
  // Handle image deletion
  const handleDeleteImage = (id: number) => {
    if (confirm("Are you sure you want to delete this image? This action cannot be undone.")) {
      deleteImageMutation.mutate(id);
    }
  };
  
  // Handle creating a new project
  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }
    
    createProjectMutation.mutate({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || null
    });
  };
  
  return (
    <>
      {/* Main Library Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden" hideDefaultCloseButton>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center">
                <Library className="mr-2 h-5 w-5" />
                Image Library
              </DialogTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4 overflow-hidden">
            {/* Search and filter controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search images..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 items-center">
                {/* Project selector dropdown */}
                <div className="flex-shrink-0 min-w-[200px]">
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Add new project button */}
                <Button 
                  variant="outline" 
                  className="h-10 flex items-center gap-1"
                  onClick={() => setIsNewProjectDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span>New Project</span>
                </Button>
                
                {/* Category filter */}
                <Tabs 
                  value={selectedCategory} 
                  onValueChange={setSelectedCategory}
                  className="flex-shrink-0"
                >
                  <TabsList className="h-10">
                    <TabsTrigger value="all" className="text-xs px-3">
                      All
                    </TabsTrigger>
                    
                    {categories.map(category => (
                      <TabsTrigger 
                        key={category} 
                        value={category}
                        className="text-xs px-3"
                      >
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                
                {/* Reset filters button */}
                {(search || selectedCategory !== "all" || selectedProjectId !== "all") && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      setSearch("");
                      setSelectedCategory("all");
                      setSelectedProjectId("all");
                    }}
                    className="h-10 w-10"
                  >
                    <FilterX className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Image grid */}
            <div className="overflow-y-auto flex-grow">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoaderCircle className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64 text-red-500">
                  Error loading images
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Library className="h-12 w-12 mb-4 opacity-20" />
                  {search || selectedCategory !== "all" ? (
                    <p>No matching images found</p>
                  ) : (
                    <p>Your image library is empty</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                  {filteredImages.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <div className="p-2 cursor-pointer" onClick={() => setPreviewImage(image)}>
                        <AspectRatio ratio={16 / 9}>
                          <img
                            src={image.imageUrl}
                            alt={image.title}
                            className="object-cover w-full h-full rounded-md"
                          />
                        </AspectRatio>
                      </div>
                      
                      <CardContent className="px-4 py-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-sm font-medium truncate flex-1">
                            {image.title}
                          </CardTitle>
                          
                          {/* Project badge, if assigned */}
                          {image.projectId && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer">
                              {projects.find(p => p.id === image.projectId)?.name || "Project"}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {image.prompt}
                        </p>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {image.model || "gpt-image-1"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {image.size || "1024x1024"}
                          </Badge>
                          {image.isVariation && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                              Variation
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                      
                      <CardFooter className="p-2 flex justify-between gap-2 border-t">
                        {/* Project actions */}
                        <div className="flex items-center">
                          {image.projectId ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveFromProject(image.id, image.projectId!)}
                              className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              title="Remove from project"
                            >
                              <FolderMinus className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Select 
                              onValueChange={(value) => handleAddToProject(image.id, parseInt(value))}
                            >
                              <SelectTrigger className="h-8 w-8 p-0 border-0">
                                <FolderPlus className="h-4 w-4 text-blue-500" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="placeholder" disabled>Add to project</SelectItem>
                                {projects.map(project => (
                                  <SelectItem key={project.id} value={project.id.toString()}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        
                        {/* Other actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadImage(image.imageUrl, image.title)}
                            className="h-8 w-8"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          {onCreateVariations && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onCreateVariations(image.imageUrl, image.prompt || "")}
                              className="h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
                              title="Create Variations"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {onEditImage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEditImage(image.imageUrl, image.id)}
                              className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              title="Edit Image"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteImage(image.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Image Preview Dialog */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewImage.title}</DialogTitle>
              <DialogDescription className="text-sm text-gray-500 truncate mt-1">
                {previewImage.prompt}
              </DialogDescription>
            </DialogHeader>
            
            <div className="my-4 flex justify-center">
              <div className="max-h-[50vh] overflow-hidden flex items-center justify-center">
                <img 
                  src={previewImage.imageUrl} 
                  alt={previewImage.title}
                  className="max-w-full max-h-[50vh] object-contain rounded-md" 
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline">
                Model: {previewImage.model || "gpt-image-1"}
              </Badge>
              {previewImage.size && (
                <Badge variant="outline">
                  Size: {previewImage.size}
                </Badge>
              )}
              {previewImage.quality && (
                <Badge variant="outline">
                  Quality: {previewImage.quality}
                </Badge>
              )}
              {previewImage.projectId && (
                <Badge className="bg-blue-100 text-blue-800">
                  Project: {projects.find(p => p.id === previewImage.projectId)?.name || "Unknown"}
                </Badge>
              )}
              {previewImage.isVariation && (
                <Badge className="bg-purple-100 text-purple-800">
                  Variation
                </Badge>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => handleDownloadImage(previewImage.imageUrl, previewImage.title)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              
              {onCreateVariations && (
                <Button 
                  onClick={() => {
                    onCreateVariations(previewImage.imageUrl, previewImage.prompt || "");
                    setPreviewImage(null);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Create Variations
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* New Project Dialog */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your images.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="Enter project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Input
                id="project-description"
                placeholder="Enter project description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsNewProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending || !newProjectName.trim()}
            >
              {createProjectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Folder className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}