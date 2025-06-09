import { Request, Response } from "express";
import OpenAI from "openai";

export interface SocialPostRequest {
  briefContent: string;
  platform: string;
  numberOfPosts: number;
  tone?: string;
  model?: string;
}

export class SocialPostGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 2,
    });
  }

  async generateSocialPosts(req: Request, res: Response): Promise<Response | void> {
    try {
      const { briefContent, platform, numberOfPosts, tone, model } = req.body as SocialPostRequest;

      if (!briefContent) {
        res.status(400).json({ error: "Brief content is required" });
        return;
      }

      const platformSpecs = this.getPlatformSpecs(platform || 'facebook');
      const postTone = tone || 'professional';
      const postsToGenerate = Math.min(numberOfPosts || 3, 5); // Limit to 5 posts max

      console.log(`[Social Posts] Generating ${postsToGenerate} ${platform} posts`);

      const systemPrompt = `You are a social media expert specializing in creating engaging ${platform} posts. 

CRITICAL: Your task is to create actual social media posts, NOT a creative brief. The user has already provided their brief - use it to create the specific posts they requested.

Platform: ${platform}
${platformSpecs}

Generate exactly ${postsToGenerate} distinct social media posts based on the provided brief. Each post should be complete and ready to publish.

Format your response as:
<h2>Social Media Posts for ${platform}</h2>

<div class="post">
<h3>Post 1</h3>
<p><strong>Copy:</strong> [The actual post text]</p>
<p><strong>Hashtags:</strong> [Relevant hashtags]</p>
<p><strong>Visual Note:</strong> [Brief description of recommended image/video]</p>
</div>

[Repeat for each post]

Focus on variety - different angles, hooks, and approaches while maintaining brand consistency.`;

      const userPrompt = `Based on this creative brief, create ${postsToGenerate} engaging ${platform} posts:

${briefContent}

Remember: I want actual social media posts, not another brief. Create posts that are ready to publish, with copy, hashtags, and visual recommendations.`;

      const completion = await this.openai.chat.completions.create({
        model: model || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });

      let content = completion.choices[0].message.content || "";
      
      // Clean up formatting artifacts
      content = this.cleanContent(content);

      res.json({ 
        content,
        platform,
        numberOfPosts: postsToGenerate,
        generatedAt: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Social post generation error:', error.message);
      
      // Provide helpful fallback for server errors
      if (error.status === 500) {
        const { briefContent, platform, numberOfPosts } = req.body;
        const fallbackContent = this.generateFallbackPosts(briefContent, platform || 'facebook', numberOfPosts || 3);
        
        return res.json({
          content: fallbackContent,
          platform: platform || 'facebook',
          numberOfPosts: numberOfPosts || 3,
          fallback: true,
          message: 'Generated using fallback due to temporary API issues'
        });
      }

      res.status(500).json({ 
        error: 'Social post generation failed',
        message: error.message
      });
    }
  }

  private getPlatformSpecs(platform: string): string {
    const specs: { [key: string]: string } = {
      facebook: "Character limit: 2200, optimal: 100-250. Use engaging hooks, clear CTAs, and 3-5 hashtags.",
      instagram: "Character limit: 2200, optimal: 150-300. Visual-focused, use 10-30 hashtags, story-driven.",
      twitter: "Character limit: 280. Concise, punchy, use 1-3 hashtags, thread-friendly.",
      linkedin: "Character limit: 3000, optimal: 150-300. Professional tone, industry insights, career relevance.",
      tiktok: "Captions: 2200 chars. Trend-aware, authentic, youth-focused, entertainment value."
    };
    
    return specs[platform.toLowerCase()] || specs.facebook;
  }

  private cleanContent(content: string): string {
    // Remove currency artifacts and formatting issues
    content = content.replace(/\$\d+/g, '');
    content = content.replace(/^\s*[\$\#\*\-]+\s*/gm, '');
    content = content.replace(/\n{3,}/g, '\n\n');
    
    // Ensure proper HTML structure
    if (!content.includes('<h2>')) {
      content = '<h2>Social Media Posts</h2>\n\n' + content;
    }
    
    return content.trim();
  }

  private generateFallbackPosts(briefContent: string, platform: string, numberOfPosts: number): string {
    const brand = briefContent.toLowerCase().includes('oreal') ? "L'Oréal" : "Brand";
    const product = briefContent.toLowerCase().includes('serum') ? "serum" : "product";
    
    return `<h2>Social Media Posts for ${platform}</h2>

<div class="post">
<h3>Post 1 - Product Introduction</h3>
<p><strong>Copy:</strong> Introducing our revolutionary ${product}! ✨ Experience the difference that premium skincare can make. #${brand.replace(/[^a-zA-Z0-9]/g, '')} #SkincareRoutine #Beauty</p>
<p><strong>Visual Note:</strong> Hero shot of product with elegant lighting</p>
</div>

<div class="post">
<h3>Post 2 - Benefits Focus</h3>
<p><strong>Copy:</strong> See visible results in just 30 days! Our clinically-proven formula delivers the anti-aging benefits you've been looking for. Try it risk-free today! #AntiAging #SkincareThatWorks #Beauty</p>
<p><strong>Visual Note:</strong> Before/after transformation imagery</p>
</div>

<div class="post">
<h3>Post 3 - Call to Action</h3>
<p><strong>Copy:</strong> Ready to turn back time? 🕰️ Join thousands who have discovered the power of premium skincare. Your skin deserves the best. #SkinCare #BeautyTips #AntiAging</p>
<p><strong>Visual Note:</strong> Lifestyle shot showing confident, radiant skin</p>
</div>

<p><em>Note: These are basic posts generated during API unavailability. For customized, high-quality content, please try again when services are stable.</em></p>`;
  }
}

export const socialPostGenerator = new SocialPostGenerator();