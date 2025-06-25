import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
));
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
  const [downloadFormat, setDownloadFormat] = useState<string>("png");
  const [downloadResolution, setDownloadResolution] = useState<string>("original");
  const [isDownloading, setIsDownloading] = useState(false);
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
  
  // Fetch images with error handling and retry settings
  const { data: images = [], isLoading, error } = useQuery<GeneratedImage[]>({
    queryKey: ["/api/generated-images"],
    enabled: open,
    retry: false, // Disable automatic retries to prevent endless error loops
    staleTime: 30000, // Set stale time to 30 seconds to reduce fetching frequency
    refetchOnWindowFocus: false, // Disable refetching on window focus
    refetchOnMount: false, // Only fetch once when component mounts
    refetchOnReconnect: false, // Disable refetch on reconnect
    onError: (err) => {
      console.error("Error fetching images:", err);
      // Silent error handling to prevent crashes - just log to console
    }
  });
  
  // Fetch projects with similar safer settings
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<ImageProject[]>({
    queryKey: ["/api/image-projects"],
    enabled: open,
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    onError: (err) => {
      console.error("Error fetching projects:", err);
      // Silent error handling to prevent crashes
    }
  });
  
  // Delete image mutation with improved error handling
  const deleteImageMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await apiRequest("DELETE", `/api/generated-images/${id}`);
        if (!response.ok) {
          throw new Error("Failed to delete image");
        }
        return id;
      } catch (err) {
        console.error("Error deleting image:", err);
        throw err; // Re-throw to trigger onError
      }
    },
    onSuccess: () => {
      try {
        // Safely invalidate queries with error handling
        queryClient.invalidateQueries({ queryKey: ["/api/generated-images"] });
        toast({
          title: "Success",
          description: "Image was deleted successfully",
        });
        // Close the preview if the deleted image was being previewed
        if (previewImage && previewImage.id === deleteImageMutation.variables) {
          setPreviewImage(null);
        }
      } catch (err) {
        console.error("Error in delete mutation success handler:", err);
        // Don't throw - prevent cascading errors
      }
    },
    onError: (error) => {
      // Safely handle errors without crashing
      try {
        console.error("Delete mutation error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete image",
          variant: "destructive",
        });
      } catch (toastErr) {
        console.error("Error showing error toast:", toastErr);
      }
    },
    // Add retry settings
    retry: false,
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

  // Handle image download with format and resolution options
  const handleDownloadImage = async (imageUrl: string, title: string, format?: string, resolution?: string) => {
    setIsDownloading(true);
    
    try {
      const useFormat = format || downloadFormat;
      const useResolution = resolution || downloadResolution;
      
      // Handle SVG format specially since it's vector-based
      if (useFormat === "svg") {
        // Create SVG with embedded raster image
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });

        const multiplier = useResolution === "2x" ? 2 : useResolution === "4x" ? 4 : 1;
        const width = img.width * multiplier;
        const height = img.height * multiplier;

        // Create SVG with embedded base64 image
        const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image x="0" y="0" width="${width}" height="${height}" xlink:href="${imageUrl}"/>
</svg>`;

        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${useResolution}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download complete",
          description: `Image downloaded as SVG at ${useResolution} resolution`,
        });
        return;
      }
      
      // If original format and resolution for raster formats, download directly
      if (useFormat === "png" && useResolution === "original") {
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
        return;
      }
      
      // Calculate dimensions based on resolution for raster formats
      let width: number | undefined;
      let height: number | undefined;
      
      if (useResolution !== "original") {
        const multiplier = useResolution === "2x" ? 2 : useResolution === "4x" ? 4 : 1;
        width = 1024 * multiplier;
        height = 1024 * multiplier;
      }
      
      // Process image through API for raster formats
      const response = await fetch("/api/image-processing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          format: useFormat,
          width,
          height,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Image processing failed");
      }
      
      // Get the processed image
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Download the processed image
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${useResolution}.${useFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download complete",
        description: `Image downloaded as ${useFormat.toUpperCase()} at ${useResolution} resolution`,
      });
      
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to process and download image",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
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
      <Dialog open={open} onOpenChange={(isOpen) => {
        // If closing, also reset preview image
        if (!isOpen) {
          setPreviewImage(null);
        }
        onOpenChange(isOpen);
      }}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden" hideDefaultCloseButton>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center">
                <Library className="mr-2 h-5 w-5" />
                {previewImage ? 'Image Preview' : 'Image Library'}
              </DialogTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  if (previewImage) {
                    setPreviewImage(null);
                  } else {
                    onOpenChange(false);
                  }
                }}
                className="rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {previewImage ? (
            // Image Preview Content
            <div className="p-4 flex flex-col flex-grow overflow-auto">
              <div className="mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPreviewImage(null)}
                  className="mb-4"
                >
                  <span className="mr-2">←</span> Back to Library
                </Button>
                <h3 className="text-lg font-semibold mt-2">{previewImage.title}</h3>
                <p className="text-sm text-gray-500 break-words mt-1 mb-4 max-h-[80px] overflow-y-auto">
                  {previewImage.prompt || "No prompt available"}
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 flex justify-center">
                <img 
                  src={previewImage.imageUrl} 
                  alt={previewImage.title}
                  className="max-w-full max-h-[50vh] object-contain rounded-md" 
                />
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
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
              
              {/* Download Options */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="format-select">Format</Label>
                    <Select value={downloadFormat} onValueChange={setDownloadFormat}>
                      <SelectTrigger id="format-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="jpg">JPG</SelectItem>
                        <SelectItem value="webp">WebP</SelectItem>
                        <SelectItem value="svg">SVG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="resolution-select">Resolution</Label>
                    <Select value={downloadResolution} onValueChange={setDownloadResolution}>
                      <SelectTrigger id="resolution-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="2x">2x (2048px)</SelectItem>
                        <SelectItem value="4x">4x (4096px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadImage(previewImage.imageUrl, previewImage.title)}
                  className="flex-1"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isDownloading ? "Processing..." : "Download"}
                </Button>
                
                {/* Variations feature temporarily disabled */}
                
                {onEditImage && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onEditImage(previewImage.imageUrl, previewImage.id);
                      setPreviewImage(null);
                      onOpenChange(false);
                    }}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Image
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 flex-1"
                  onClick={() => {
                    handleDeleteImage(previewImage.id);
                    setPreviewImage(null);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            // Image Library Content
            <div className="p-4 flex flex-col space-y-4 overflow-hidden">
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
                
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Project selector dropdown */}
                  <div className="flex-shrink-0 min-w-[200px]">
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="h-10">
                        <SelectValue  />
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromProject(image.id, image.projectId!);
                                }}
                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                title="Remove from project"
                              >
                                <FolderMinus className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Select 
                                onValueChange={(value) => handleAddToProject(image.id, parseInt(value))}
                              >
                                <SelectTrigger className="h-8 w-8 p-0 border-0"
                                  onClick={(e) => e.stopPropagation()}>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadImage(image.imageUrl, image.title);
                              }}
                              className="h-8 w-8"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            
                            {/* Variations feature temporarily disabled */}
                            
                            {onEditImage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditImage(image.imageUrl, image.id);
                                }}
                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit Image"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(image.id);
                              }}
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
          )}
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
        <DialogContent hideDefaultCloseButton>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Create a new project to organize your images.
            </p>
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