import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Input } from "@/components/ui/input";
import { LoaderCircle, X, Download, Trash2, Search, Library, FilterX } from "lucide-react";
import { GeneratedImage } from "@shared/schema";

interface ImageLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLibrary({ open, onOpenChange }: ImageLibraryProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch images
  const { data: images = [], isLoading, error } = useQuery<GeneratedImage[]>({
    queryKey: ["/api/generated-images"],
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
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive",
      });
    },
  });
  
  // Extract unique categories from the images metadata
  const getCategories = () => {
    const categories = new Set<string>();
    images.forEach(image => {
      try {
        if (image.metadata) {
          const metadata = typeof image.metadata === 'string' 
            ? JSON.parse(image.metadata) 
            : image.metadata;
          if (metadata?.category) {
            categories.add(metadata.category);
          } else {
            categories.add("Uncategorized");
          }
        } else {
          categories.add("Uncategorized");
        }
      } catch {
        categories.add("Uncategorized");
      }
    });
    return Array.from(categories);
  };
  
  const categories = getCategories();
  
  // Filter images based on search and category
  const filteredImages = images.filter(image => {
    const matchesSearch = search === "" || 
      (image.title?.toLowerCase().includes(search.toLowerCase()) || 
       image.prompt?.toLowerCase().includes(search.toLowerCase()));
      
    const matchesCategory = selectedCategory === "all" || 
      (() => {
        try {
          if (image.metadata) {
            const metadata = JSON.parse(image.metadata as string);
            if (selectedCategory === "Uncategorized") {
              return !metadata?.category;
            }
            return metadata?.category === selectedCategory;
          }
          return selectedCategory === "Uncategorized";
        } catch {
          return selectedCategory === "Uncategorized";
        }
      })();
      
    return matchesSearch && matchesCategory;
  });

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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden">
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
            
            <div className="flex gap-2">
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
              
              {(search || selectedCategory !== "all") && (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
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
                    <div className="p-2">
                      <AspectRatio ratio={16 / 9}>
                        <img
                          src={image.imageUrl}
                          alt={image.title}
                          className="object-cover w-full h-full rounded-md"
                        />
                      </AspectRatio>
                    </div>
                    
                    <CardContent className="px-4 py-2">
                      <CardTitle className="text-sm font-medium truncate">
                        {image.title}
                      </CardTitle>
                      
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {image.prompt}
                      </p>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {image.model || "dall-e-3"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {image.size || "1024x1024"}
                        </Badge>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="p-2 flex justify-end gap-2 border-t">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadImage(image.imageUrl, image.title)}
                        className="h-8 w-8"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteImage(image.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}