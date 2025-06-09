import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Share2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SocialPostGeneratorProps {
  briefContent?: string;
}

export function SocialPostGenerator({ briefContent }: SocialPostGeneratorProps) {
  const [platform, setPlatform] = useState('facebook');
  const [numberOfPosts, setNumberOfPosts] = useState('3');
  const [tone, setTone] = useState('professional');
  const [customBrief, setCustomBrief] = useState(briefContent || '');
  const [generatedPosts, setGeneratedPosts] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const handleGeneratePosts = async () => {
    if (!customBrief.trim()) {
      toast({
        title: "Brief Required",
        description: "Please provide a creative brief to generate social posts from.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-social-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          briefContent: customBrief,
          platform,
          numberOfPosts: parseInt(numberOfPosts),
          tone,
          model: 'gpt-4o-mini'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate social posts');
      }

      const data = await response.json();
      setGeneratedPosts(data.content);
      
      toast({
        title: "Posts Generated",
        description: `Successfully created ${numberOfPosts} ${platform} posts`,
      });
    } catch (error) {
      console.error('Error generating social posts:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate social posts. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      toast({
        title: "Copied to Clipboard",
        description: "Post content copied successfully",
      });
      
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const extractPostContent = (htmlContent: string) => {
    const posts: Array<{ copy: string, hashtags: string, visual: string }> = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    const postDivs = doc.querySelectorAll('.post');
    postDivs.forEach(postDiv => {
      const copyElement = postDiv.querySelector('p:has(strong:contains("Copy:"))');
      const hashtagsElement = postDiv.querySelector('p:has(strong:contains("Hashtags:"))');
      const visualElement = postDiv.querySelector('p:has(strong:contains("Visual"))');
      
      const copy = copyElement?.textContent?.replace('Copy:', '').trim() || '';
      const hashtags = hashtagsElement?.textContent?.replace('Hashtags:', '').trim() || '';
      const visual = visualElement?.textContent?.replace(/Visual.*?:/, '').trim() || '';
      
      if (copy) {
        posts.push({ copy, hashtags, visual });
      }
    });
    
    return posts;
  };

  const posts = generatedPosts ? extractPostContent(generatedPosts) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Social Media Post Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="posts">Number of Posts</Label>
              <Select value={numberOfPosts} onValueChange={setNumberOfPosts}>
                <SelectTrigger>
                  <SelectValue placeholder="Select number" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Post</SelectItem>
                  <SelectItem value="2">2 Posts</SelectItem>
                  <SelectItem value="3">3 Posts</SelectItem>
                  <SelectItem value="4">4 Posts</SelectItem>
                  <SelectItem value="5">5 Posts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="energetic">Energetic</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="brief">Creative Brief</Label>
            <Textarea
              id="brief"
              placeholder="Paste your creative brief here or describe your campaign..."
              value={customBrief}
              onChange={(e) => setCustomBrief(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          <Button 
            onClick={handleGeneratePosts}
            disabled={isGenerating || !customBrief.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Posts...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                Generate Social Posts
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedPosts && (
        <Card>
          <CardHeader>
            <CardTitle>Generated {platform.charAt(0).toUpperCase() + platform.slice(1)} Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post, index) => (
                  <Card key={index} className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-sm text-gray-600">Post {index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`${post.copy}\n\n${post.hashtags}`, `post-${index}`)}
                            className="h-8 w-8 p-0"
                          >
                            {copiedStates[`post-${index}`] ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        <div>
                          <Label className="text-xs font-medium text-gray-500">COPY</Label>
                          <p className="mt-1 text-sm leading-relaxed">{post.copy}</p>
                        </div>
                        
                        {post.hashtags && (
                          <div>
                            <Label className="text-xs font-medium text-gray-500">HASHTAGS</Label>
                            <p className="mt-1 text-sm text-blue-600">{post.hashtags}</p>
                          </div>
                        )}
                        
                        {post.visual && (
                          <div>
                            <Label className="text-xs font-medium text-gray-500">VISUAL RECOMMENDATION</Label>
                            <p className="mt-1 text-xs text-gray-600 italic">{post.visual}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: generatedPosts }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}