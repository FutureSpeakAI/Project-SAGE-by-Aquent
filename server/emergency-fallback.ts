import { Request, Response } from 'express';

export class EmergencyFallback {
  static generateSocialMediaPosts(userPrompt: string): string {
    // Detect L'Oréal content specifically
    const isLOreal = userPrompt.toLowerCase().includes('oreal') || userPrompt.toLowerCase().includes('l\'oréal');
    const brand = isLOreal ? "L'Oréal Revitalift" : "Brand";
    
    // Extract key details from prompt
    const hasAntiAging = userPrompt.toLowerCase().includes('anti-aging') || userPrompt.toLowerCase().includes('fine lines');
    const hasRetinol = userPrompt.toLowerCase().includes('retinol');
    const hasVitaminC = userPrompt.toLowerCase().includes('vitamin c');
    const hasHyaluronic = userPrompt.toLowerCase().includes('hyaluronic');
    const has47Percent = userPrompt.includes('47%') || userPrompt.includes('47 percent');
    
    return `
<h1>Facebook Posts for ${brand}</h1>

<h2>Post 1</h2>
<p><strong>✨ Transform your skin with ${brand} Triple Power Anti-Aging Serum! ✨</strong></p>
<p>Experience the perfect blend of science and luxury. ${has47Percent ? 'Clinical results show 47% reduction in fine lines in just 4 weeks!' : 'Visible results in just weeks!'}</p>
<p>${hasRetinol ? '🌟 Pro-Retinol + ' : ''}${hasVitaminC ? 'Vitamin C + ' : ''}${hasHyaluronic ? 'Hyaluronic Acid' : 'Advanced ingredients'} = Your secret to youthful skin!</p>
<p><strong>Hashtags:</strong> #AntiAging #LuxurySkincare #SkincareRoutine #BeautyEssentials #YouthfulSkin</p>
<p><strong>Visual:</strong> Elegant serum bottle with golden lighting showcasing premium quality</p>

<h2>Post 2</h2>
<p><strong>🌼 Ready to turn back time? 🌼</strong></p>
<p>Discover ${brand}'s breakthrough formula that combines clinical results with luxury skincare. ${has47Percent ? 'Proven to reduce fine lines by 47% in 4 weeks.' : 'Proven anti-aging results.'}</p>
<p>Your skin deserves the best - experience the difference today!</p>
<p><strong>Hashtags:</strong> #SkincareGoals #AntiAgingSerum #BeautyCommunity #GlowingSkin #LuxuryBeauty</p>
<p><strong>Visual:</strong> Before/after transformation showing radiant, youthful skin</p>

<h2>Post 3</h2>
<p><strong>💎 Elevate your skincare routine with science-backed luxury! 💎</strong></p>
<p>${brand} Triple Power Serum delivers visible anti-aging results. ${hasRetinol ? 'Pro-Retinol smooths, ' : ''}${hasVitaminC ? 'Vitamin C brightens, ' : ''}${hasHyaluronic ? 'Hyaluronic Acid hydrates.' : 'Advanced actives work together.'}</p>
<p>Join the skincare revolution - because you deserve to look as young as you feel!</p>
<p><strong>Hashtags:</strong> #SkincareScience #AntiAging #BeautyInnovation #LuxurySkincare #SkinGoals</p>
<p><strong>Visual:</strong> Lifestyle shot featuring confident woman with radiant skin</p>

<h2>Ready-to-Publish Format</h2>
<h3>Post 1 (Copy-Paste Ready)</h3>
<p>✨ Transform your skin with ${brand} Triple Power Anti-Aging Serum! ✨ Experience the perfect blend of science and luxury. ${has47Percent ? 'Clinical results show 47% reduction in fine lines in just 4 weeks!' : 'Visible results in just weeks!'} #AntiAging #LuxurySkincare #SkincareRoutine #BeautyEssentials #YouthfulSkin</p>

<h3>Post 2 (Copy-Paste Ready)</h3>
<p>🌼 Ready to turn back time? 🌼 Discover ${brand}'s breakthrough formula that combines clinical results with luxury skincare. ${has47Percent ? 'Proven to reduce fine lines by 47% in 4 weeks.' : 'Proven anti-aging results.'} Your skin deserves the best! #SkincareGoals #AntiAgingSerum #BeautyCommunity #GlowingSkin #LuxuryBeauty</p>

<h3>Post 3 (Copy-Paste Ready)</h3>
<p>💎 Elevate your skincare routine with science-backed luxury! 💎 ${brand} Triple Power Serum delivers visible anti-aging results. Join the skincare revolution - because you deserve to look as young as you feel! #SkincareScience #AntiAging #BeautyInnovation #LuxurySkincare #SkinGoals</p>
    `.trim();
  }

  static detectContentType(prompt: string): 'social_posts' | 'brief' | 'general' {
    const isSocialRequest = prompt.toLowerCase().includes('social') || 
                           prompt.toLowerCase().includes('post') || 
                           prompt.toLowerCase().includes('facebook') ||
                           prompt.toLowerCase().includes('instagram') ||
                           (prompt.toLowerCase().includes('create') && 
                            (prompt.toLowerCase().includes('campaign') || 
                             prompt.toLowerCase().includes('content')));
    
    if (isSocialRequest) return 'social_posts';
    
    const isBriefRequest = prompt.toLowerCase().includes('brief') && 
                          !prompt.toLowerCase().includes('based on') &&
                          !prompt.toLowerCase().includes('from this brief');
    
    if (isBriefRequest) return 'brief';
    
    return 'general';
  }

  static handleEmergencyGeneration(req: Request, res: Response, prompt: string): void {
    const contentType = this.detectContentType(prompt);
    
    if (contentType === 'social_posts') {
      const content = this.generateSocialMediaPosts(prompt);
      res.json({
        content,
        provider: 'emergency_fallback',
        fallback: true,
        message: 'Generated structured social media posts during API unavailability'
      });
    } else {
      res.json({
        content: '<h1>Service Temporarily Unavailable</h1><p>AI services are experiencing issues. Please try again in a moment.</p>',
        provider: 'emergency_fallback',
        fallback: true,
        message: 'Please try again when services are stable'
      });
    }
  }
}