# SAGE Platform Architecture Summary

## Overview
SAGE (Strategic AI Generation Engine) is a comprehensive marketing content creation platform that leverages multiple AI providers to create intelligent, context-aware marketing materials. The platform features smart AI routing, multi-provider fallbacks, voice interaction capabilities, and a complete briefing-to-deliverable workflow. Its business vision is to provide a competitive advantage through accumulated learning, offering unassailable market leadership in AI-powered content generation.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (September 24, 2025)
- **RFP Text Extraction AI Fix** (September 24): Implemented AI-based text cleanup for RFP question extraction. System now uses Gemini to automatically fix malformed text from PDF extraction (character-level spacing like "W h o i n y o u r" or joined words like "Whatarethecorporate"). Only affects question extraction - Pinecone responses remain completely unmodified. Includes fallback to original text if AI is unavailable.

## Recent Changes (September 23, 2025)
- **RFP Pinecone Raw Output Fix** (September 23): Fixed interference with Pinecone responses in the RFP engine. Created a new `chatWithPineconeRaw` function that returns exact Pinecone responses without any citation processing, preserving all clickable links and formatting exactly as Pinecone provides them. The RFP processor now delivers unmodified Pinecone content including native citation formats.
- **RFP Text Extraction Spacing Fix** (September 23): Fixed issue where RFP questions displayed with excessive character-level spacing (like "w o r d s   l i k e   t h i s"). Improved both TXT and PDF text extraction with better detection patterns that identify when single characters are separated by spaces and join them while preserving normal word boundaries. The fix handles variable spacing patterns and prevents over-aggressive space removal that was causing the issue.
- **RFP Processor Optimized for Speed** (September 23): Implemented batch processing to send all RFP questions to Pinecone in a single query instead of individual queries. This dramatically reduces processing time from 5-10 minutes to under 1 minute for typical RFPs. System parses Pinecone's structured response to extract individual answers for each question while preserving all sources and citations. Uses ONLY Pinecone's actual output without any modification or AI interference.
- **Complete Pinecone-Gemini Integration Fix** (August 20): Resolved all critical formatting issues with Pinecone Assistant using Gemini 2.5 Pro. Fixed duplicate "Sources & References" sections by detecting existing sources in content. Fixed non-functional citation links by detecting when URLs aren't available (Gemini doesn't provide them) and keeping citations as plain superscript text instead of broken links. Only creates clickable citations when real URLs are available (GPT-4o). Simplified prompting to leverage Gemini's natural formatting, removing overly prescriptive consulting report structure. Added automatic cleanup of malformed Confidence Assessment tables. Successfully tested with 15+ sources per query.
- **Pinecone Model Configuration** (August 20): Configured Pinecone Assistant to use Gemini 2.5 Pro model for all RAG queries. Implemented as configurable via PINECONE_MODEL environment variable with 'gemini-2.5-pro' as default. This ensures consistent use of Google's latest language model for Pinecone-based knowledge retrieval.
- **RFP Response Assistant** (August 18): Transformed Context Upload section into comprehensive RFP/RFI processing system. Features: automatic question extraction from uploaded documents (PDF/DOCX/TXT), Pinecone knowledge base search for relevant content, Gemini-powered response generation, and DOCX/PDF download capabilities. Uses Gemini-only mode for all AI operations per compliance requirements.
- **Content Tab Event Handler Fix** (August 15): Fixed critical bug where Content tab was sending `[object Object]` instead of user prompts. Issue was caused by onClick handler passing SyntheticBaseEvent to handleGenerate function. Solution: Changed `onClick={onGenerate}` to `onClick={() => onGenerate()}` to prevent event object from being passed as argument.
- **Pinecone RAG Integration** (August 15): Successfully integrated Pinecone Assistant ("pinecone-helper") with SAGE's RAG Search toggle. The system now queries the Pinecone knowledge base when RAG Search is enabled, displaying responses with proper source citations including file names and page references.
- **Gemini-Only Mode** (August 13): Successfully implemented and verified vendor compliance mode that routes all AI requests through Google services (Gemini 2.0 for text, Imagen 3 for images). Controlled via `GEMINI_ONLY_MODE=true` environment variable.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Modern component-based architecture.
- **Tailwind CSS + shadcn/ui**: Comprehensive UI component library.
- **Tab-Based Navigation**: Five main modules (Free Prompt, Briefing, Content, Visual, Campaign) with context-based state persistence and `localStorage` integration for session continuity.
- **Real-time Voice Interface**: Web Audio API integration with voice activity detection, continuous listening, and interruption detection.
- **Image Editor**: Inpainting, background removal, style transfer tools, with red mask overlay system, GPT-image-1 API integration, and preservation of original image resolution.
- **UI/UX Decisions**: Professional design with backdrop blur effects, gradient cards, motion animations, and streamlined interfaces for both expert and first-time users.

### Backend Architecture
- **Node.js + Express**: RESTful API with ES modules and TypeScript for type-safe implementation.
- **Multi-Provider AI Integration**: Supports OpenAI, Anthropic, Gemini, and Perplexity APIs.
- **File Processing**: Extraction and processing of PDF (`pdf-parse`), DOCX (`mammoth`), and text files.
- **Smart Routing Engine**: Intelligent provider selection based on query type (e.g., Perplexity for research, OpenAI for creative content, Gemini for technical analysis) with automatic fallback mechanisms.
- **Multi-Modal Content Processing**: Handles file uploads (PDF, DOCX, TXT), reference image uploads, and integrates voice input for a comprehensive brief-to-deliverable pipeline.
- **Context-Aware Briefing System**: Supports document upload, form-based input, library management for persistent storage, and visual integration for image generation interpretation.
- **Content Generation Pipeline**: Processes user input, routes to optimal AI provider, assembles context (briefing, personas, memory), performs AI processing with fallbacks, and delivers formatted content.
- **Voice Interaction Flow**: Activates intelligent mode with continuous listening, detects speech, handles interruptions, transcribes speech, and generates AI-powered responses.
- **Learning System**: Implements a cross-client learning architecture for internal tool deployment, including a Knowledge Graph Engine and Pattern Recognition Engine to detect successful campaign patterns, generate predictive analytics, and provide real-time recommendations.

### Database Architecture
- **PostgreSQL**: Primary data storage via Drizzle ORM.
- **Neon Database**: Cloud-hosted PostgreSQL instance.
- **Schema**: Supports conversations, content library, briefings, and user sessions, with a unified briefings endpoint combining chat and form-generated briefs.

## Product Roadmap

### RFP/RFI Response Engine (September 2025)
**MVP Phase (Immediate)**
- New "RFP Response" tab in main navigation
- Upload interface for RFP documents (PDF/DOCX/TXT)
- Automatic question/requirement extraction
- AI-powered response generation using Pinecone RAG + Gemini
- DOCX/PDF export of complete responses
- Simple chat assistant for RFP guidance

**Future Enhancements (Planned)**
- RFP Response Library with categorization
- Multi-source RAG (past responses, case studies, compliance docs)
- Collaborative response features
- Win/loss tracking and analytics
- Template management system
- Workflow orchestration (intake → analysis → generation → review → submission)
- Integration with Content and Visual tabs for supporting materials

## External Dependencies

### AI Providers
- **OpenAI**: GPT-4o, GPT-4o Mini, GPT-4 Turbo (creative content).
- **Anthropic**: Claude Sonnet 4, Claude 3.7 Sonnet (analysis, primary research).
- **Gemini**: 1.5 Pro, 1.5 Flash (technical processing).
- **Perplexity**: Sonar models (real-time web research, secondary).

### Third-Party Services
- **Neon Database**: PostgreSQL hosting.
- **Pinecone**: Vector database with Assistant API for RAG (Retrieval-Augmented Generation) capabilities.
- **File Processing Libraries**: `pdf-parse`, `mammoth`.
- **Speech Services**: Web Speech API for transcription, ElevenLabs for text-to-speech.
- **Audio Processing**: Web Audio API for voice detection.