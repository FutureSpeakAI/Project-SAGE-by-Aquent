# SAGE Guided Campaign Workflow Test Cases

## Test Case 1: Nike Sustainable Running Shoe Launch - Complete Guided Workflow

### Stage 1: Campaign Discovery & Setup (SAGE Tab)
**User Input**: "I need to create a complete campaign for launching Nike's new sustainable running shoe line targeting Gen Z eco-conscious runners in North America. Budget is $2M."

**Expected SAGE Response**: 
- Recognizes campaign initiation and creates workflow
- Responds: "Brilliant! I'm setting up a complete campaign workflow for Nike's sustainable running shoe launch. Let me guide you through our proven process to create exceptional campaign materials.

**Stage 1: Campaign Discovery & Setup** ✅ (We're here now)
I've captured your initial brief: Nike sustainable running shoes, Gen Z eco-conscious runners, North America, $2M budget.

To build a strong foundation, I need a few more details:
- What's the specific product name or line?
- Any sustainability credentials we should highlight?
- Primary campaign objectives beyond awareness?
- Key competitors you're most concerned about?

Once we nail down these fundamentals, I'll guide you through deep market research using our reasoning engine."

**System Actions**:
- Creates new workflow session
- Initializes session context with provided details
- Sets current stage to "discovery"

### Stage 2: Deep Market Research (SAGE Tab)
**User Input**: "The product is called 'Nike ZeroCarbon Runner' - made from 100% recycled materials. Main objectives are brand awareness, positioning Nike as sustainability leader, and driving pre-orders. Worried about Adidas and Allbirds competition."

**Expected SAGE Response**:
"Perfect! Nike ZeroCarbon Runner - that's a strong foundation. Now let's move to **Stage 2: Deep Market Research**.

I'm activating our research modes to gather comprehensive intelligence:

🔍 **Competitor Analysis** - Analyzing Adidas and Allbirds sustainability messaging
📊 **Market Research** - Current trends in sustainable athletic footwear  
🎨 **Design Trends** - Visual direction for eco-conscious Gen Z

*[Triggers self-reasoning research loop with Perplexity]*

Based on this research, I'll provide strategic recommendations and then guide you to create your strategic brief in the Briefing tab."

**System Actions**:
- Triggers multiple research sessions automatically
- Updates session context with detailed objectives
- Tracks research completion toward stage advancement

### Stage 3: Strategic Brief Development (Briefing Tab)
**SAGE Guidance Response**: "Excellent research foundation! We've analyzed 12 competitors and identified key market opportunities. 

**Ready for Stage 3: Strategic Brief Development**

I recommend moving to the **Briefing tab** now to compile our research into an actionable strategic brief. This will give you:
- Comprehensive competitive landscape analysis
- Strategic positioning recommendations  
- Creative territory definitions
- Success metrics and KPIs

Head to the Briefing tab and ask me to 'Generate strategic brief for Nike ZeroCarbon Runner campaign' - I'll synthesize all our research into a professional campaign brief."

### Stage 4: Content Creation (Free Prompt Tab)
**SAGE Guidance Response**: "Outstanding strategic brief! Now we move to **Stage 4: Content Creation**.

Switch to the **Free Prompt tab** to generate campaign copy and messaging. With our strategic foundation in place, I can create:
- Primary headlines and taglines aligned with sustainability positioning
- Social media content for Gen Z engagement
- Email marketing sequences for pre-order campaign
- Campaign narratives that differentiate from Adidas/Allbirds

I'll reference our research insights and strategic brief to ensure brand-consistent, competitive messaging."

### Stage 5: Visual Asset Creation (Image Generation Tab)
**SAGE Guidance Response**: "Brilliant content portfolio! Time for **Stage 5: Visual Asset Creation**.

Move to the **Image Generation tab** to create campaign visuals. I'll generate:
- Hero campaign imagery showcasing sustainability story
- Social media graphics optimized for Gen Z platforms
- Product photography concepts highlighting recycled materials
- Brand-consistent visual assets across all channels

All visuals will align with our strategic brief and complement the messaging we've created."

### Stage 6: Campaign Finalization (SAGE Tab)
**SAGE Guidance Response**: "Incredible work! We've created a complete campaign package. **Final Stage: Campaign Finalization**.

Let's return to the SAGE tab for final review and optimization. I can:
- Review all campaign materials for consistency and impact
- Optimize content and visuals based on Gen Z preferences
- Create final campaign execution timeline
- Generate complete deliverable package for stakeholder review

You now have research-backed strategy, compelling content, and engaging visuals - a complete campaign ready for launch!"

## Test Case 2: B2B SaaS Rebrand - SAGE-Guided Process

### Stage 1: Discovery (SAGE Tab)
**User Input**: "We're rebranding our project management SaaS from 'TaskFlow' to 'WorkSync' for enterprise teams."

**Expected SAGE Response**: "Fantastic! A rebrand is a strategic opportunity to strengthen market position. I'm initiating our complete campaign workflow for the TaskFlow to WorkSync rebrand.

**Stage 1: Campaign Discovery** 
I've captured the basics: TaskFlow → WorkSync, B2B SaaS, enterprise teams.

For a successful rebrand strategy, I need:
- Reason for the rebrand (positioning, growth, acquisition?)
- Key differentiators WorkSync will emphasize
- Enterprise team size and industry focus
- Timeline and budget considerations
- Current brand equity we want to preserve

Next, I'll guide you through competitor research and market analysis."

### Workflow Progression Testing
**Expected SAGE Behavior Throughout**:
1. **Proactive Guidance**: SAGE suggests next steps without being asked
2. **Tab Navigation**: Clear directions on which tab to use for specific activities  
3. **Context Continuity**: All previous work referenced in each new stage
4. **Completion Detection**: Automatically recognizes when stages are complete
5. **Natural Progression**: Logical flow from research → strategy → content → visuals → finalization

### Cross-Tab Continuity Validation
**Test Scenario**: User switches tabs mid-conversation
**Expected Behavior**: 
- SAGE recognizes current workflow stage
- Provides appropriate guidance for the tab they're on
- Suggests returning to optimal tab if needed
- Maintains all campaign context across switches

### Session Recovery Testing
**Test Scenario**: User refreshes browser during campaign development
**Expected Behavior**:
- Workflow state persists
- SAGE immediately recognizes where user left off
- Continues guidance from exact stage position
- All campaign context and progress maintained

### Multi-Session Testing
**Test Scenario**: User works on campaign across multiple days
**Expected Behavior**:
- Session context persists between visits
- SAGE picks up exactly where they left off
- Progress tracking maintains accuracy
- Campaign coherence preserved over time