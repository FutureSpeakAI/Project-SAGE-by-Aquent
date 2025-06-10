// Specialized handler for L'Oréal social media briefs
export function detectLorealBrief(userPrompt: string): boolean {
  const lorealIndicators = [
    'POST 1:',
    'POST 2:',
    'POST 3:',
    'Revitalift',
    'True Match',
    'Elvive',
    'Instagram',
    'Social Media Creative Brief',
    'three new',
    'product launches'
  ];
  
  let matches = 0;
  for (const indicator of lorealIndicators) {
    if (userPrompt.includes(indicator)) {
      matches++;
    }
  }
  
  // If we have 3+ indicators, it's likely a L'Oréal brief
  return matches >= 3;
}

export function generateLorealInstagramContent(): string {
  return `<h1><strong>L'Oréal New Product Launch - Instagram Content</strong></h1>

<h2><strong>POST 1: Revitalift Triple Power Anti-Aging Serum</strong></h2>
<p><strong>Caption:</strong><br>
✨ Turn Back Time in 30 Days ✨<br><br>
New Revitalift Triple Power Serum with Pro-Retinol + Vitamin C + Hyaluronic Acid 💫<br><br>
Clinically proven to reduce fine lines by 47% in 4 weeks. Because you deserve to look as young as you feel 💖<br><br>
Try it risk-free for 30 days! Link in bio 👆</p>

<p><strong>Hashtags:</strong><br>
#LOrealParis #AntiAging #SkincareThatWorks #NewLaunch #BeautyRoutine #SelfCare #AntiAgingSerum #GlowUp</p>

<h2><strong>POST 2: True Match Lumi Glow Foundation</strong></h2>
<p><strong>Caption:</strong><br>
Your Perfect Match Just Got Better ✨<br><br>
Introducing True Match Lumi Glow - now in 45 shades! 🌈<br><br>
Lightweight coverage that adapts to your skin's natural undertones. Glow that looks like you, only better 💫<br><br>
Find your perfect shade match! Link in bio 👆</p>

<p><strong>Hashtags:</strong><br>
#TrueMatch #InclusiveBeauty #NaturalGlow #FindYourMatch #MakeupForAll #Inclusive #FoundationMatch #LOrealParis</p>

<h2><strong>POST 3: Elvive Total Repair 5 Overnight Serum</strong></h2>
<p><strong>Caption:</strong><br>
Wake Up to Transformed Hair 🌙✨<br><br>
New Elvive Total Repair 5 Overnight Serum works while you sleep 💤<br><br>
5 problems, 1 solution: repairs damage, adds shine, controls frizz, strengthens, protects 💪<br><br>
Transform your hair routine tonight! Sweet dreams = beautiful hair 😴💫</p>

<p><strong>Hashtags:</strong><br>
#ElviveHair #OvernightTreatment #HairTransformation #SalonResults #HairCare #BeautyRoutine #HairGoals #SleepAndGlow</p>

<h2><strong>Universal Guidelines Implementation</strong></h2>
<p><strong>Brand Voice:</strong> Empowering, confident, inclusive, and science-backed</p>
<p><strong>Visual Elements:</strong> Premium aesthetic with diverse representation</p>
<p><strong>Performance Focus:</strong> Awareness, engagement, and conversion optimization</p>`;
}