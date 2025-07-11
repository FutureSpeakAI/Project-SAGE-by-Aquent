# GPT-4o Prompt: SAGE Platform User Flow Diagram

Create a comprehensive user flow diagram for SAGE (Strategic Adaptive Generative Engine), an AI-powered marketing content creation platform. Use the same visual style and layout structure as the attached reference image but adapt it specifically for SAGE's architecture.

## Platform Overview
SAGE is a comprehensive marketing platform with 5 main tabs and 2 client-facing interfaces. It features intelligent AI routing, multi-provider fallbacks, voice interaction, and complete briefing-to-deliverable workflows.

## Top-Level User Entry Points (Main Header Row)

**Primary Interface (Main Platform)**
- User Authentication & Session Management
- Cross-Tab State Persistence 
- Global Voice Interface Controls
- Smart AI Provider Routing

**Client Entry Points (Separate Interfaces)**
- Client Briefing Portal (/client-briefing)
- Client Intake Portal (/client_intake)

## Five Core Modules (Second Row - Tab Navigation)

### 1. SAGE Tab (Free Prompt)
**Purpose**: Primary AI conversation interface with intelligent routing
**Sub-systems**:
- Prompt Router (OpenAI → Anthropic → Gemini → Perplexity)
- Context Controls & Memory Management
- Persona Selection & Application
- Research Engine with Deep Research Mode
- Voice Interface with Interruption Detection

### 2. Campaign Tab
**Purpose**: Guided campaign workflow orchestration
**Sub-systems**:
- 6-Stage Campaign Workflow Engine
- Research Planning & Capability Selection
- Progress Tracking & Stage Management
- Cross-Tab Integration Guidance
- Campaign Asset Linking

### 3. Briefing Tab
**Purpose**: Document processing and briefing management
**Sub-systems**:
- Multi-Format File Upload (PDF, DOCX, TXT)
- Smart Content Extraction & Processing
- Briefing Library Management
- Form-Based Briefing Creation
- Reference Image Integration

### 4. Content Tab
**Purpose**: Content generation and library management
**Sub-systems**:
- Brief-to-Content Conversion Pipeline
- Content Library with Search & Filter
- Rich Text Editor with Export Options
- Content Variations & Optimization
- Provider-Specific Content Routing

### 5. Visual Tab
**Purpose**: AI-powered image generation and editing
**Sub-systems**:
- SAGE Chat Integration for Visual Briefs
- Image Generation with Provider Routing
- Upload & Edit Workflow
- Image Editor (Inpainting, Background Removal, Style Transfer)
- Visual Asset Library Management

## Backend Infrastructure (Third Row - Server Components)

### AI Provider Integration Layer
- **OpenAI API**: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-Image-1
- **Anthropic API**: Claude Sonnet 4, Claude 3.7 Sonnet
- **Gemini API**: 1.5 Pro, 1.5 Flash
- **Perplexity API**: Sonar models for research

### Data Processing Layer
- **File Processing Engine**: pdf-parse, mammoth, text extraction
- **Image Processing Pipeline**: Sharp, format conversion, optimization
- **Voice Processing**: Web Audio API, Speech Recognition integration
- **Content Pipeline**: Brief extraction, prompt generation, output formatting

### Storage & Database Layer
- **PostgreSQL Database**: Neon-hosted with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **File Storage**: Reference image and document storage
- **Cache Management**: Provider health monitoring and fallback state

## Key Workflow Connections (Show with Arrows)

### Campaign Workflow Progression
SAGE Tab → Campaign Tab → Briefing Tab → Content Tab → Visual Tab → Final Deliverables

### Briefing-to-Content Pipeline
Document Upload (Briefing) → Content Extraction → Brief Library → Content Generation (Content Tab)

### Visual Brief Integration
SAGE Chat (Visual) → Brief Interpretation → Image Generation → Editor Tools → Asset Library

### Cross-Tab State Persistence
All tabs ↔ Global Context Management ↔ localStorage Persistence

### Voice Interface Integration
Voice Controls → All Tabs → SAGE Chat Integration → Provider Routing

## Client Workflow Integration
Client Portals → Brief Creation → Internal Platform Integration → Campaign Development

## Visual Style Requirements
- Use the same architectural diagram style as the reference image
- Include system component boxes with rounded corners
- Show clear hierarchical relationships with connecting lines
- Use different colors to distinguish between modules
- Include data flow arrows between components
- Show API endpoints and database connections
- Label each component with its primary function
- Include provider logos or identifiers where relevant

## Technical Details to Include
- Show the smart routing logic with decision points
- Indicate fallback mechanisms between providers
- Display file format support for each upload system
- Show cross-tab data persistence mechanisms
- Indicate real-time features (voice, live updates)
- Display session and context management flows

Create this as a professional, technical architecture diagram that clearly shows how users navigate through SAGE's ecosystem and how data flows between all components. The diagram should be comprehensive enough for technical stakeholders while remaining visually clear and organized.