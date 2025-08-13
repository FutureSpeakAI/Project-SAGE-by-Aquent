# JIRA Documentation Prompt for SAGE Platform

## Instructions for Claude

You are a Senior Technical Project Manager tasked with creating comprehensive JIRA cards documenting the development of the SAGE (Strategic Adaptive Generative Engine) platform. Create detailed JIRA cards in standard format with the following structure for each card:

```
[CARD-XXX] Title
Type: [Epic/Story/Task/Sub-task]
Component: [Frontend/Backend/Database/Integration/Infrastructure]
Priority: [Critical/High/Medium/Low]
Story Points: [1-13]
Sprint: [Sprint number]

Description:
[Detailed description of what was built]

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

Technical Implementation:
[Specific technical details, libraries used, approach taken]

Dependencies:
- [List any card dependencies]

Testing Requirements:
- [Unit tests needed]
- [Integration tests needed]
- [User acceptance criteria]
```

## System Overview to Document

The SAGE platform is a comprehensive AI-powered marketing content creation system built with the following architecture:

### Core Technology Stack
- **Frontend**: React 18 with TypeScript, Vite build system, Tailwind CSS, shadcn/ui component library
- **Backend**: Node.js with Express.js, TypeScript, ES modules
- **Database**: PostgreSQL with Drizzle ORM, Neon cloud hosting
- **AI Providers**: OpenAI (GPT-4o, DALL-E), Anthropic (Claude), Google Gemini, Perplexity
- **File Processing**: pdf-parse, mammoth, multer
- **Voice**: Web Speech API, Web Audio API
- **Real-time**: WebSockets for streaming responses

## EPICS TO DOCUMENT

### EPIC 1: Core Platform Architecture
Document the foundational setup including:
- Initial project scaffolding with Vite and TypeScript
- Express.js server setup with TypeScript and ES modules
- PostgreSQL database configuration with Drizzle ORM
- Environment variable management for API keys
- Build and deployment pipeline configuration
- CORS and security middleware setup

### EPIC 2: Frontend Framework
Document the React application structure:
- Tab-based navigation system with 5 main modules
- Global state management using React Context
- LocalStorage persistence layer
- Responsive design with Tailwind CSS
- shadcn/ui component integration
- Custom hooks for data fetching and state management
- Route configuration with wouter

### EPIC 3: Multi-Provider AI Integration
Document the AI provider integration layer:
- OpenAI API integration (GPT-4o, GPT-4o-mini, GPT-4-turbo)
- Anthropic Claude integration (Sonnet 3.5, Claude 3.7)
- Google Gemini integration (1.5 Pro, 1.5 Flash)
- Perplexity integration for web research
- Smart routing engine for provider selection
- Fallback mechanisms and retry logic
- Response streaming implementation
- Token counting and rate limiting

### EPIC 4: Smart AI Routing System
Document the intelligent routing logic:
- Query type detection (research, creative, technical, analysis)
- Provider health monitoring system
- Automatic fallback routing on failures
- Cost optimization logic
- Response quality scoring
- Context-aware provider selection
- Load balancing across providers

### EPIC 5: Learning System Architecture
Document the cross-client learning engine:
- Knowledge Graph Engine implementation
- Pattern Recognition Engine
- Learning System Manager
- Session context tracking
- Cross-client campaign data aggregation
- Predictive analytics system
- Recommendation engine
- Privacy-preserving learning architecture
- Database schema for learning data

### EPIC 6: Voice Interaction System
Document the voice interface:
- Web Speech API integration
- Voice activity detection using Web Audio API
- Continuous listening mode implementation
- Interruption detection and handling
- Speech-to-text transcription
- Text-to-speech response playback
- Audio queue management
- Microphone permission handling

### EPIC 7: Document Processing Pipeline
Document file upload and processing:
- PDF parsing with pdf-parse library
- DOCX extraction with mammoth
- Text file processing
- Multer file upload middleware
- File validation and sanitization
- Content extraction algorithms
- Metadata extraction
- File storage management

### EPIC 8: Briefing System
Document the briefing creation workflow:
- SAGE chat interface for conversational briefing
- Form-based briefing creation
- Briefing library management
- Brief analysis and complexity detection
- Cross-tab briefing persistence
- Client intake portal
- Brief-to-content pipeline
- Rich text editing for briefs

### EPIC 9: Content Generation Module
Document content creation features:
- System and user prompt management
- Prompt library CRUD operations
- Persona library management
- Rich text output editor with ReactQuill
- Content formatting and cleanup
- Export functionality (PDF, DOCX, HTML, TXT)
- Content library storage
- AI context menu for text enhancement

### EPIC 10: Visual Creation System
Document image generation and editing:
- DALL-E 3 integration for image generation
- Image prompt extraction from briefs
- Image library management
- Image editor with drawing tools
- Format conversion (PNG, JPG, WebP, SVG)
- Resolution scaling
- Image project management
- Reference image integration with GPT-4 Vision

### EPIC 11: Campaign Management
Document campaign coordination features:
- Campaign CRUD operations
- Asset linking (content and visuals)
- Cross-campaign asset sharing
- Campaign timeline management
- Budget tracking
- Team member assignment
- Deliverables tracking
- Campaign status workflow

### EPIC 12: Database Schema Design
Document the PostgreSQL schema:
- Users table with authentication
- Saved prompts and personas tables
- Generated content table
- Chat sessions and conversations
- Briefing conversations
- Campaign data model
- Learning events and patterns
- File uploads metadata

### EPIC 13: Session Management
Document session and context handling:
- Session context manager
- Cross-tab state synchronization
- LocalStorage persistence
- Session recovery on refresh
- Context size optimization
- Memory management for large campaigns
- Session history tracking

### EPIC 14: API Architecture
Document the RESTful API design:
- Route structure and organization
- Request validation middleware
- Error handling and logging
- Response formatting
- API versioning strategy
- Authentication and authorization
- Rate limiting implementation
- API documentation

### EPIC 15: Testing Infrastructure
Document the testing approach:
- Unit test setup with Vitest
- Integration testing strategy
- E2E testing configuration
- API endpoint testing
- Component testing with React Testing Library
- Mock data generation
- Test coverage requirements

### EPIC 16: Performance Optimization
Document optimization implementations:
- React Query caching strategy
- Image lazy loading
- Code splitting with dynamic imports
- Bundle size optimization
- Database query optimization
- API response caching
- WebSocket connection pooling

### EPIC 17: Security Implementation
Document security measures:
- API key encryption and storage
- Input sanitization
- SQL injection prevention with Drizzle ORM
- XSS protection
- CORS configuration
- File upload security
- Rate limiting per user/IP
- Session security

### EPIC 18: Deployment and DevOps
Document deployment configuration:
- Replit deployment setup
- Environment variable management
- Database migration strategy
- Build optimization
- Health check endpoints
- Monitoring and logging
- Backup and recovery procedures

### EPIC 19: UI/UX Components
Document custom UI implementations:
- Tab navigation system
- Rich text editor integration
- Drag-and-drop file upload
- Image gallery with filtering
- Campaign dashboard
- Progress indicators
- Toast notifications
- Modal and dialog systems

### EPIC 20: Analytics and Monitoring
Document tracking and monitoring:
- User interaction tracking
- AI provider usage metrics
- Performance monitoring
- Error tracking and reporting
- Campaign success metrics
- Learning system effectiveness
- API usage analytics

## Key Technical Decisions to Document

1. **Why PostgreSQL with Drizzle ORM**: Type-safe database queries, migration management, performance
2. **Why Multi-Provider AI**: Redundancy, cost optimization, specialized capabilities
3. **Why React with TypeScript**: Type safety, component reusability, developer experience
4. **Why Tab-Based Architecture**: Clear module separation, intuitive navigation
5. **Why Web Speech/Audio API**: Native browser support, no external dependencies
6. **Why Context + LocalStorage**: Simple state management, persistence across sessions
7. **Why Vite**: Fast development builds, optimal production bundles
8. **Why Smart Routing**: Optimal provider selection, cost management, quality assurance

## Implementation Details to Include

For each JIRA card, include:
- Specific npm packages installed and their versions
- Database schema changes required
- API endpoints created or modified
- React components built
- State management implementation
- Error handling approach
- Performance considerations
- Security measures implemented
- Testing approach
- Documentation requirements

## Sprint Planning Suggestion

Organize the cards into sprints based on dependencies:
- **Sprint 1-2**: Core architecture, database, basic frontend
- **Sprint 3-4**: AI provider integrations, routing system
- **Sprint 5-6**: Briefing system, content generation
- **Sprint 7-8**: Visual creation, image editing
- **Sprint 9-10**: Campaign management, asset linking
- **Sprint 11-12**: Voice interface, document processing
- **Sprint 13-14**: Learning system, pattern recognition
- **Sprint 15-16**: Performance optimization, testing
- **Sprint 17-18**: Security hardening, deployment setup
- **Sprint 19-20**: Polish, bug fixes, documentation

## Output Format

Generate JIRA cards in groups by epic, with clear dependencies mapped. Each card should be production-ready for import into JIRA. Include realistic story point estimates based on complexity and effort required.

Remember to document not just what was built, but HOW it was built from an engineering perspective, including architectural decisions, design patterns used, and technical challenges overcome.