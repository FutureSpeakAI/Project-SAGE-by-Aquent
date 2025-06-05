# SAGE Campaign Workflow Test Cases

## Test Case 1: Athletic Apparel Product Launch Campaign

### Initial Setup (SAGE Tab)
**User Action**: Marketer starts new conversation in SAGE tab
**Input**: "I need to create a complete campaign for launching Nike's new sustainable running shoe line targeting Gen Z eco-conscious runners in North America. Budget is $2M."

**Expected System Response**:
- SAGE creates new session context with:
  - Project: "Nike Sustainable Running Shoe Launch"
  - Brand: "Nike"
  - Industry: "Athletic Apparel"
  - Target Audience: "Gen Z eco-conscious runners"
  - Budget: "$2M"
  - Geography: "North America"

**Context Persistence Test**: Session data should be stored and accessible across all tabs

### Research Phase (SAGE Tab)
**User Action**: Activates "Competitor Analysis" research mode
**Input**: "Research Nike's competitors in the sustainable athletic footwear space, focusing on their messaging strategies and market positioning."

**Expected System Response**:
- Triggers self-reasoning loop with Perplexity research
- Gathers data on Adidas, Allbirds, Veja, and other sustainable shoe brands
- Analyzes messaging strategies, price points, and target demographics
- Updates session context with research data

### Content Generation Phase (Free Prompt Tab)
**User Action**: Switches to Free Prompt tab
**Input**: "Create three different headline options for our sustainable running shoe launch, incorporating insights from the competitor research."

**Expected System Response**:
- System automatically loads Nike project context
- References competitor research data in prompt context
- Generates headlines that differentiate from competitor messaging
- Updates session with generated content

### Visual Asset Creation (Image Generation Tab)
**User Action**: Switches to Image Generation tab
**Input**: "Create a hero image for the campaign showing the sustainable running shoe in an urban environment that appeals to Gen Z"

**Expected System Response**:
- System loads Nike project context
- Generates image prompt incorporating brand guidelines and target audience
- Creates visual asset and links it to campaign context

### Briefing Documentation (Briefing Tab)
**User Action**: Switches to Briefing tab
**Input**: "Generate a comprehensive creative brief based on all our research and content created so far."

**Expected System Response**:
- Compiles all session data into structured brief
- Includes research insights, content examples, and visual direction
- Provides timeline and deliverable recommendations

## Test Case 2: B2B SaaS Platform Rebrand Campaign

### Initial Setup
**User Action**: New conversation in SAGE tab
**Input**: "We're rebranding our project management SaaS platform from 'TaskFlow' to 'WorkSync' targeting enterprise teams. Need complete campaign strategy."

### Complete Workflow Testing
1. **Research Phase**: Market analysis of competing project management tools
2. **Content Phase**: Generate rebrand announcement copy, email sequences, landing page content
3. **Visual Phase**: Create new logo concepts, brand identity assets, social media graphics
4. **Briefing Phase**: Compile comprehensive rebrand strategy document

## Context Persistence Validation Points

### Cross-Tab Navigation Tests
1. **Context Preservation**: Switch between tabs and verify project data remains intact
2. **Data Accumulation**: Each tab should add to session context without overwriting
3. **Context Enhancement**: Later tabs should reference earlier work seamlessly

### Session Management Tests
1. **New Session**: Starting new conversation should clear previous context
2. **Session Export**: Generate downloadable campaign summary
3. **Session Recovery**: Refresh browser and verify context restoration

## Expected Context Integration
- Research Integration: Content generation references specific research findings
- Visual Consistency: Image generation incorporates brand and audience context
- Brief Compilation: Briefing tab synthesizes all previous work
- Prompt Context: Every AI interaction includes relevant campaign context