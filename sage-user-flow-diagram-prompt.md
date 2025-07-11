# SAGE User Flow Analysis & GPT-4o Diagram Prompt

## User Flow Analysis (Internal Planning)

### Step 1: Define Users and Goals

**Marketing Professionals (Primary Users)**
- Demographics: Marketing managers, creative directors, agency professionals
- Tech skills: Intermediate to advanced
- Goals: Complete campaign development, quick content generation, asset management

**External Clients (Secondary Users)**  
- Demographics: Business owners, marketing coordinators
- Tech skills: Basic to intermediate
- Goals: Submit marketing briefs, collaborate on campaign development

### Step 2: Entry Points Identified

1. **Main Platform** (/) - Marketing professionals, authenticated access
2. **Client Briefing Portal** (/client-briefing) - External clients, premium experience
3. **Client Intake Portal** (/client_intake) - External clients, simplified experience
4. **Direct Tab Access** - Returning users with session context

### Step 3: Core User Journeys Mapped

**Journey A: Complete Campaign Development**
Entry → SAGE Tab (research) → Campaign Tab (planning) → Research execution → Briefing Tab (strategic brief) → Content Tab (copy creation) → Visual Tab (asset creation) → Export/delivery

**Journey B: Quick Content Generation**
Entry → Content Tab → Brief selection/creation → Content generation → Export

**Journey C: Client Brief Submission**
Entry → Client portal → Method selection (chat vs form) → Brief development → Review/submission

**Journey D: Visual Asset Creation**
Entry → Visual Tab → Method selection (SAGE chat/direct/upload) → Generation/editing → Export

### Step 4: Key Decision Points

- Content creation method (brief-based vs direct)
- Research scope (full vs targeted vs skip)
- Visual generation approach (guided vs manual vs upload)
- Client brief method (conversational vs structured)
- AI provider selection (automatic vs manual)

### Step 5: Success Endpoints

- Complete campaign package delivery
- Individual asset creation and export
- Client brief handoff to marketing team
- Library storage for future use

---

# GPT-4o Prompt: Create SAGE User Flow Diagram

Create a comprehensive user flow diagram for SAGE (Strategic Adaptive Generative Engine), an AI-powered marketing content creation platform. Use the same visual style and architecture as the attached reference image.

## Platform Overview
SAGE is a 5-tab marketing platform with smart AI routing, voice interaction, and complete briefing-to-deliverable workflows. It serves both internal marketing teams and external clients through different interfaces.

## User Flow Structure to Visualize

### Entry Points (Top Level)
Show 4 main entry paths:
1. **Main Platform Dashboard** (Marketing professionals) → 5-tab interface
2. **Client Briefing Portal** (/client-briefing) → Premium client experience  
3. **Client Intake Portal** (/client_intake) → Simplified client interface
4. **Direct Tab Access** → Session-based continuation

### Core Platform Tabs (Second Level)
Display the 5 main functional areas:

**SAGE Tab** - Primary AI conversation interface
- Voice interaction capabilities
- Smart AI provider routing (OpenAI → Anthropic → Gemini → Perplexity)
- Research mode activation
- Context and persona management

**Campaign Tab** - Guided workflow orchestration
- 6-stage campaign progression
- Research capability selection
- Progress tracking and stage management
- Cross-tab integration guidance

**Briefing Tab** - Document processing and brief management
- Multi-format file upload (PDF, DOCX, TXT)
- Briefing library storage and search
- Form-based brief creation
- Reference image integration

**Content Tab** - Content generation and management
- Brief-to-content conversion
- Content library with search/filter
- Rich text editing and export
- Multiple format outputs

**Visual Tab** - AI image generation and editing
- SAGE-guided visual creation
- Upload and edit workflows
- Image editor tools (inpainting, background removal)
- Visual asset library

### Backend Infrastructure (Third Level)
Show the technical foundation:

**AI Provider Layer**
- OpenAI APIs (GPT-4o, GPT-4o Mini, GPT-Image-1)
- Anthropic APIs (Claude Sonnet models)
- Gemini APIs (1.5 Pro, 1.5 Flash)
- Smart routing and fallback logic

**Processing Layer**
- File processing engines (PDF, DOCX extraction)
- Image processing pipeline
- Voice processing (Web Audio API)
- Content generation pipeline

**Data Layer**
- PostgreSQL database (Neon-hosted)
- Session management
- File storage
- Library management

### Key User Flows to Highlight

**Flow 1: Complete Campaign Development**
Entry → SAGE research → Campaign planning → Briefing creation → Content generation → Visual assets → Final delivery

**Flow 2: Quick Content Generation**  
Entry → Content tab → Brief selection → Generation → Export

**Flow 3: Client Brief Submission**
Client entry → Method selection → Brief development → Submission to team

**Flow 4: Visual Asset Creation**
Entry → Visual tab → Creation method → Generation/editing → Export

### Decision Points to Show
- Research scope selection (full/targeted/skip)
- Content method (brief-based/direct)  
- Visual approach (guided/manual/upload)
- Client input method (chat/form)
- AI provider routing (automatic/manual)

### Visual Requirements
- Use the same architectural diagram style as the reference image
- Include clear entry points, process flows, and endpoints
- Show decision diamonds at choice points
- Use connecting arrows to show user journey progression
- Display system integration points and data flows
- Include cross-tab navigation paths
- Use consistent color coding for different module types
- Label all components with their primary functions

Create this as a professional user flow diagram that clearly shows how users navigate through SAGE's ecosystem, make decisions, and achieve their goals across all interfaces and workflows.