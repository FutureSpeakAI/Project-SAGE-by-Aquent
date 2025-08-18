# SAGE Platform Architecture Summary

## Overview
SAGE (Strategic AI Generation Engine) is a comprehensive marketing content creation platform that leverages multiple AI providers to create intelligent, context-aware marketing materials. The platform features smart AI routing, multi-provider fallbacks, voice interaction capabilities, and a complete briefing-to-deliverable workflow. Its business vision is to provide a competitive advantage through accumulated learning, offering unassailable market leadership in AI-powered content generation.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (August 18, 2025)
- **RFP Response Assistant**: Transformed Context Upload section into comprehensive RFP/RFI processing system. Features: automatic question extraction from uploaded documents (PDF/DOCX/TXT), Pinecone knowledge base search for relevant content, Gemini-powered response generation, and DOCX/PDF download capabilities. Uses Gemini-only mode for all AI operations per compliance requirements.
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