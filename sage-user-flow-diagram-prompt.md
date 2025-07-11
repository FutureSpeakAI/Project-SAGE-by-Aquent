# GPT-4o Prompt: SAGE Platform User Flow Diagram

Create a comprehensive user flow diagram for SAGE (Strategic Adaptive Generative Engine), an AI-powered marketing content creation platform. Use the same visual style and layout structure as the attached reference image but follow proper user flow methodology to map actual user journeys.

## Step 1: Define the Users and Their Goals

### Primary Users:
**Marketing Professionals**
- Demographics: Marketing managers, creative directors, agency professionals
- Tech skills: Intermediate to advanced digital marketing experience
- Goals: Create comprehensive marketing campaigns from brief to final deliverables

**External Clients** 
- Demographics: Business owners, marketing coordinators from client companies
- Tech skills: Basic to intermediate, prefer simplified interfaces
- Goals: Submit marketing briefs and collaborate on campaign development

### User Goals by Journey Type:
1. **Complete Campaign Development**: Research → Strategy → Content → Visuals → Delivery
2. **Quick Content Generation**: Brief input → Immediate content output
3. **Brief Submission & Collaboration**: Client brief creation → Internal team handoff
4. **Asset Management**: Upload → Edit → Organize → Export content and visuals

## Step 2: Identify Entry Points

### Entry Point A: Main Platform Dashboard
- **Trigger**: Marketing professional logs into SAGE platform
- **Starting point**: Home dashboard with 5-tab navigation
- **User state**: Authenticated, ready to start campaign work

### Entry Point B: Client Briefing Portal
- **Trigger**: External client receives link to /client-briefing
- **Starting point**: Premium client-facing briefing portal
- **User state**: First-time or returning client, needs to submit brief

### Entry Point C: Client Intake Portal  
- **Trigger**: Client directed to /client_intake for simplified submission
- **Starting point**: Streamlined intake form interface
- **User state**: New client, minimal technical experience expected

### Entry Point D: Deep Link Campaign Access
- **Trigger**: User returns to continue existing campaign work
- **Starting point**: Specific tab based on current campaign stage
- **User state**: Returning user with session context preserved

## Step 3: Map Out the User Journey Steps

### Journey 1: Complete Campaign Development (Marketing Professional)
**Entry Point**: Main Platform Dashboard

**Step 1**: SAGE Tab - Initial Research & Discovery
- User initiates conversation with SAGE AI
- Defines project scope, brand, audience, objectives
- **Available actions**: Voice interaction, persona selection, research mode activation
- **User provides**: Project details, brand information, target audience

**Step 2**: Campaign Tab - Workflow Planning  
- User reviews 6-stage campaign workflow
- Selects research capabilities (competitor analysis, market research, persona research)
- **Available actions**: Research planning, capability selection
- **User provides**: Research priorities, timeline preferences

**Step 3**: Research Execution (SAGE Tab)
- Deep research mode activation
- AI conducts comprehensive market/competitor analysis  
- **Available actions**: Follow-up questions, research refinement
- **User provides**: Research direction, specific focus areas

**Step 4**: Briefing Tab - Strategic Brief Creation
- Upload supporting documents (PDFs, DOCX, reference materials)
- Generate comprehensive strategic brief from research
- **Available actions**: Document upload, brief editing, library storage
- **User provides**: Brand guidelines, campaign constraints

**Step 5**: Content Tab - Content Generation
- Select brief from library for content generation
- Generate headlines, copy, social media content
- **Available actions**: Content editing, variations, export options
- **User provides**: Content preferences, channel specifications

**Step 6**: Visual Tab - Asset Creation
- SAGE interprets brief for visual requirements
- Generate campaign imagery and graphics
- **Available actions**: Image editing, style variations, format conversion
- **User provides**: Visual style preferences, format requirements

**Step 7**: Final Review & Export
- Review complete campaign package
- Export deliverables in required formats
- **Available actions**: Download, share, archive campaign
- **User receives**: Complete campaign deliverable package

### Journey 2: Quick Content Generation (Marketing Professional)
**Entry Point**: Main Platform Dashboard → Content Tab

**Step 1**: Content Tab Entry
- Direct navigation to content generation
- **Available actions**: New content creation, brief selection
- **User provides**: Content type selection

**Step 2**: Brief Selection or Creation
- Choose existing brief from library OR create new brief
- **Available actions**: Library search, quick brief form
- **User provides**: Brief details or selection

**Step 3**: Content Generation
- AI generates requested content using selected brief
- **Available actions**: Regenerate, edit, save variations
- **User provides**: Content refinement requests

**Step 4**: Content Finalization
- Edit and export final content
- **Available actions**: Rich text editing, format export
- **User receives**: Final content deliverable

### Journey 3: Client Brief Submission
**Entry Point**: Client Briefing Portal (/client-briefing)

**Step 1**: Client Portal Landing
- Hero section with value proposition
- Process visualization (3-4 step journey)
- **Available actions**: Start chat with SAGE, fill form, view process

**Step 2**: Brief Creation Method Selection
- Choose between SAGE chat conversation OR structured form
- **Available actions**: Chat interface, form interface
- **Decision point**: Conversational vs. structured input preference

**Step 3A**: SAGE Chat Brief Development
- Natural conversation with SAGE to develop brief
- **Available actions**: Voice interaction, follow-up questions
- **User provides**: Campaign details through conversation

**Step 3B**: Form-Based Brief Creation  
- Complete structured briefing form
- **Available actions**: Form completion, file uploads
- **User provides**: Structured campaign information

**Step 4**: Brief Review & Submission
- Review generated brief with editing capabilities
- **Available actions**: Edit, format, submit to marketing team
- **User provides**: Final approval and submission

## Step 4: Include Decision Points

### Decision Point 1: Content Creation Method (Content Tab)
- **Choice A**: Use existing brief from library → Brief selection interface
- **Choice B**: Create new brief → Quick brief creation form  
- **Choice C**: Generate without brief → Direct content prompting

### Decision Point 2: Research Scope (Campaign Tab)
- **Choice A**: Full research suite → All capabilities selected
- **Choice B**: Targeted research → Specific capabilities only
- **Choice C**: Skip research → Direct to brief creation

### Decision Point 3: Visual Generation Method (Visual Tab)
- **Choice A**: SAGE-guided creation → AI conversation for requirements
- **Choice B**: Direct generation → Manual prompt input
- **Choice C**: Upload & edit → Existing image modification

### Decision Point 4: Client Brief Method (Client Portal)
- **Choice A**: Conversational → SAGE chat interface
- **Choice B**: Structured → Form-based input
- **Choice C**: Hybrid → Combination of both methods

### Decision Point 5: AI Provider Selection (All Tabs)
- **Automatic routing** (default) → Smart provider selection
- **Manual override** → User selects specific AI provider
- **Fallback handling** → Alternative provider on failure

## Step 5: Determine Endpoints

### Endpoint A: Complete Campaign Package
- **Success state**: User has comprehensive campaign deliverables
- **Components**: Strategic brief, content assets, visual materials
- **Actions available**: Download, share, archive, start new campaign

### Endpoint B: Individual Asset Creation
- **Success state**: User has specific content or visual asset
- **Components**: Single deliverable (copy, image, brief)
- **Actions available**: Export, save to library, create variations

### Endpoint C: Client Brief Handoff
- **Success state**: Client brief successfully submitted to marketing team
- **Components**: Professional brief document with all requirements
- **Actions available**: Track progress, provide additional input

### Endpoint D: Library Storage
- **Success state**: Assets saved for future use and organization
- **Components**: Searchable, categorized content and visual libraries
- **Actions available**: Search, filter, reuse in new campaigns

## Visual Flow Diagram Requirements

Create the diagram showing:
- All entry points clearly marked
- Decision diamonds at choice points
- Process rectangles for each step
- Endpoint indicators for successful completion
- Flow arrows showing user journey progression
- System integration points (APIs, databases)
- Cross-tab navigation paths
- Error handling and fallback routes

Use the same architectural style as the reference image with proper user flow notation including start/end points, process steps, decision diamonds, and directional flow arrows.