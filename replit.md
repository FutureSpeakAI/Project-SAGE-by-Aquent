# SAGE Platform Architecture Summary

## Overview

SAGE (Strategic AI Generation Engine) is a comprehensive marketing content creation platform that leverages multiple AI providers to create intelligent, context-aware marketing materials. The platform features smart AI routing, multi-provider fallbacks, voice interaction capabilities, and a complete briefing-to-deliverable workflow.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Modern component-based architecture
- **Tailwind CSS + shadcn/ui**: Comprehensive UI component library
- **Tab-Based Navigation**: Five main modules (Free Prompt, Briefing, Content, Visual, Campaign)
- **Context Management**: React Context for cross-tab state persistence
- **Real-time Voice Interface**: Web Audio API integration with voice activity detection

### Backend Architecture
- **Node.js + Express**: RESTful API with ES modules
- **TypeScript**: Type-safe server implementation
- **Multi-Provider AI Integration**: OpenAI, Anthropic, Gemini, and Perplexity APIs
- **File Processing**: PDF (pdf-parse), DOCX (mammoth), and text file extraction
- **Smart Routing Engine**: Intelligent provider selection based on query type

### Database Architecture
- **PostgreSQL**: Primary data storage with Drizzle ORM
- **Neon Database**: Cloud-hosted PostgreSQL instance
- **Schema**: Conversations, content library, briefings, and user sessions

## Key Components

### 1. Smart AI Routing System
- **Intelligent Provider Selection**: Routes queries to optimal AI provider
- **Research Queries**: Perplexity (web-enabled) → Anthropic → Gemini
- **Creative Content**: OpenAI → Anthropic → Gemini
- **Technical Analysis**: Gemini → Anthropic → OpenAI
- **Fallback Mechanisms**: Automatic provider switching on failures

### 2. Multi-Modal Content Processing
- **File Upload System**: PDF, DOCX, TXT file extraction and processing
- **Image Processing**: Reference image upload and integration
- **Voice Interface**: Continuous listening with interruption detection
- **Content Generation**: Brief-to-deliverable conversion pipeline

### 3. Context-Aware Briefing System
- **Document Upload**: Real file processing (not simulation)
- **Form-Based Creation**: Structured briefing input
- **Library Management**: Persistent storage and retrieval
- **Visual Integration**: Brief interpretation for image generation

### 4. Cross-Tab Persistence
- **Global State Management**: Context-based state preservation
- **localStorage Integration**: Automatic state persistence
- **Session Continuity**: Maintains context across navigation

## Data Flow

### Content Generation Pipeline
1. **Input Processing**: User query or briefing upload
2. **Smart Routing**: AI provider selection based on content type
3. **Context Assembly**: Briefing, personas, and memory integration
4. **AI Processing**: Multi-provider generation with fallbacks
5. **Output Delivery**: Formatted content with metadata

### Voice Interaction Flow
1. **Voice Activation**: Intelligent mode with continuous listening
2. **Speech Detection**: Real-time voice activity monitoring
3. **Interruption Handling**: Immediate audio stop on user speech
4. **Transcription**: Multi-alternative speech recognition
5. **Response Generation**: AI-powered conversation continuation

## External Dependencies

### AI Providers
- **OpenAI**: GPT-4o, GPT-4o Mini, GPT-4 Turbo for creative content
- **Anthropic**: Claude Sonnet 4, Claude 3.7 Sonnet for analysis
- **Gemini**: 1.5 Pro, 1.5 Flash for technical processing
- **Perplexity**: Sonar models for real-time web research

### Third-Party Services
- **Neon Database**: PostgreSQL hosting
- **File Processing**: pdf-parse, mammoth libraries
- **Speech Services**: Web Speech API for transcription
- **Audio Processing**: Web Audio API for voice detection

## Deployment Strategy

### Development Environment
- **Replit Integration**: Native development environment
- **Hot Reload**: Vite-powered development server
- **Database**: Replit-hosted PostgreSQL instance

### Production Deployment
- **Autoscale Target**: Replit deployment infrastructure
- **Build Process**: Vite frontend + esbuild server bundling
- **Environment Variables**: API keys and database configuration
- **Port Configuration**: External port 80 mapped to internal 5000

### Health Monitoring
- **Provider Health Checks**: Real-time API availability monitoring
- **Fallback Routing**: Automatic provider switching on failures
- **Error Tracking**: Comprehensive logging and error handling

## Recent Changes

- **June 25, 2025**: Created premium client-facing briefing portal at /client-briefing
  - Transformed from simple form to comprehensive marketing experience portal
  - Hero section with animated elements and compelling value propositions
  - Interactive process visualization showing 3-step journey with SAGE
  - Statistics showcase (99% accuracy, 5min generation, 300% ROI improvement)
  - Enhanced SAGE chat interface with gradient messaging and smart placeholders
  - Comprehensive form matching main Briefing tab structure with all professional fields
  - Premium design with backdrop blur effects, gradient cards, and motion animations
  - Prominent "Client Brief Intake" button in header for easy client sharing
  - Updated messaging to position SAGE as Aquent's Strategic Adaptive Generative Engine
  - Removed trust indicators section per user preference

- **June 25, 2025**: Added dedicated client intake route at /client_intake
  - Created new ClientIntake component with identical premium design
  - Client intake form now accessible at the requested URL structure
  - Maintains all functionality: SAGE chat, comprehensive form, and brief generation
  - Added route to App.tsx for proper navigation handling
  - Removed statistics showcase section (99% accuracy, 5min generation, 300% ROI, 1000+ campaigns) per user preference
  - Added expandable chat window feature (maximize/minimize button) for better conversation flow
  - Fixed voice interaction issues with improved microphone reactivation after SAGE speech playback
  - Enhanced voice recognition state management for continuous conversations

- **June 25, 2025**: Fixed briefing system integration between SAGE chat and Content tab
  - Created unified briefings endpoint that combines chat briefs and form briefs
  - SAGE-created briefs now appear in Content tab briefing library
  - Updated BriefingLibrary component to use unified data source
  - Resolved issue where chat briefs were stored separately from content library
  - All briefings now accessible across both Briefing and Content tabs

- **June 25, 2025**: Fixed before/after image comparison display in Image Editor
  - Removed container overflow constraints that were cutting off full images
  - Made comparison view full-width for better side-by-side viewing
  - Added synchronized zoom controls that work on both original and edited images
  - Increased container heights and improved scrolling for full image visibility
  - Fixed image truncation issues preventing complete before/after comparison

- **June 25, 2025**: Fixed image quality preservation in Image Editor
  - Removed automatic image resizing that was causing pixelation
  - Images now display at original resolution for maximum quality
  - Updated canvas rendering to disable smoothing and preserve sharp pixels
  - Added CSS image-rendering: crisp-edges for optimal display quality
  - Fixed low-resolution appearance that was degrading editing experience

- **June 25, 2025**: Added "Edit Image" button to generated image interface
  - New Edit button appears alongside Delete, Download, Variations, and Convert buttons
  - Users can now directly edit generated images without additional navigation
  - Opens the Image Editor with inpainting, background removal, and style transfer tools
  - Updated button grid from 4 to 5 columns to accommodate the new Edit action
  - Uses orange color scheme (text-orange-500) to distinguish from other actions

- **June 25, 2025**: Image upload functionality added to Visual tab
  - Added new "Upload & Edit" tab alongside existing Generate and SAGE modes
  - Users can now upload images directly for AI-powered editing without campaigns
  - Integrated with existing Image Editor and AI Processing tools
  - Supports drag-and-drop upload with validation for PNG, JPG, WEBP, GIF formats
  - Connected to inpainting, background removal, style transfer features
  - Streamlined UI by removing duplicate download buttons
  - Enhanced state persistence to handle uploaded image data
  - FIXED: "Edit This Image" workflow now properly uses edited results as new base image
  - IMPROVED: Upload now automatically opens Image Editor for seamless editing workflow
  - FIXED: Cleaned up excessive debugging logs for better performance

- **June 25, 2025**: Research system optimization with Anthropic as primary provider
  - Migrated from Perplexity to Anthropic as primary research provider for reliability
  - Implemented OpenAI as secondary fallback for research continuity
  - Enhanced research prompting for comprehensive brand analysis and competitive intelligence
  - Removed dependency on external real-time search APIs while maintaining research quality
  - Validated Anthropic provides excellent strategic marketing research capabilities
  - System now delivers consistent, high-quality research without API authentication issues
  - Confirmed dynamic campaign support works across all brand/product variables
  
- **June 25, 2025**: Voice interface updates and SAGE personality changes
  - Simplified voice interface to single "Voice" button (removed speaker and brain icons)
  - Updated SAGE to professional marketer personality with Boston-accented voice
  - Fixed missing /api/chat endpoint that was causing "Error getting response from agent"
  - Added text-to-speech endpoint with ElevenLabs voice selection (Voice ID: b5RPB35vTODb3BEmR3Fc)
  - Ensured prompt router integration (not bypassing routing logic)
  - Updated voice configuration throughout all components for consistency
  - Added automatic microphone reactivation after SAGE finishes speaking
  - Increased emotional inflection (style: 1.0) for more natural delivery
  - Adjusted voice settings for empathetic tone (stability: 0.4, similarity: 0.85)
  - Enhanced speaking rate (1.2x playback) for more engaging delivery
  - IMPORTANT: SAGE responds in professional marketing language (no dialect/slang), but voice pronunciation has Boston accent

- **June 24, 2025**: Image editing system fully operational and confirmed working
  - Red mask overlay system working with 30% transparency
  - GPT-image-1 API integration complete with full scene inpainting
  - All Select component crashes resolved by removing placeholder props
  - Proper mask processing with greyscale conversion and thresholding
  - CRITICAL FIX: Mask inversion (.negate()) required for gpt-image-1 to work correctly
  - Confirmed: gpt-image-1 returns complete scenes with only masked areas edited
  - Successful inpainting demonstrated with medical office scene transformation
  - UI enhancement: Right panel (tabs) hidden when displaying before/after results
  - Fixed canvas quality: Preserves original image resolution, no downscaling
  - Better error handling for OpenAI content policy violations
  - Improved Visual tab mobile responsiveness with proper button layout and spacing
  - Fixed SVG download functionality to properly handle vector format conversion from raster images
  - Updated all download interfaces throughout the app to use consistent SVG handling
  - Replaced basic download buttons with comprehensive ImageDownloadMenu across all components

## Changelog

- June 24, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.