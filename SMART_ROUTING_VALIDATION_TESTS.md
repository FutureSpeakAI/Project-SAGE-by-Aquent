# Smart AI Routing - Comprehensive Validation Tests

## Test Scenarios for Multi-Model Routing

### 1. Research & Analysis Queries (Should Route to Anthropic)
```
Test Query: "Conduct a comprehensive competitive analysis of Tesla vs traditional automakers, examining market share trends, technological advantages, and strategic positioning over the past 5 years"
Expected: Anthropic + Reasoning Engine
Validation: Deep research context, multi-step analysis required
```

### 2. Creative Content Generation (Should Route to OpenAI)
```
Test Query: "Create a compelling brand story for a sustainable fashion startup targeting Gen Z consumers, including emotional hooks and social media campaign concepts"
Expected: OpenAI (GPT-4o)
Validation: Creative content, narrative building, marketing copy
```

### 3. Technical Data Analysis (Should Route to Gemini)
```
Test Query: "Analyze website performance metrics, calculate conversion rate optimization opportunities, and provide technical implementation recommendations for e-commerce platforms"
Expected: Gemini (1.5 Pro)
Validation: Technical analysis, data processing, algorithmic recommendations
```

### 4. Complex Multi-Step Workflow (Should Use Reasoning)
```
Test Query: "Develop a complete go-to-market strategy for a B2B SaaS product including market research, competitive positioning, pricing strategy, and 12-month execution roadmap"
Expected: Anthropic + Deep Reasoning Loop
Validation: Complex strategy, multiple interconnected components
```

### 5. Image Generation Context (Should Route to OpenAI/Gemini)
```
Test Query: "Design concepts for luxury hotel branding including visual identity, color palette recommendations, and architectural photography style guidelines"
Expected: OpenAI (visual creativity focus)
Validation: Visual design elements, creative direction
```

## Provider Health Validation Tests

### Test 1: Primary Provider Unavailable
- Simulate Anthropic offline
- Send research query
- Validate fallback to Gemini
- Verify rationale includes failover reason

### Test 2: All Providers Available
- Ensure all health checks pass
- Send diverse query types
- Validate routing follows expected patterns
- Check response quality consistency

### Test 3: Performance-Based Routing
- Monitor response times across providers
- Validate faster providers get preference for speed-priority workflows
- Ensure quality providers get preference for quality-priority workflows

## Cross-Tab Persistence Tests

### Test 1: Configuration Sync
1. Set manual provider override in Free Prompt tab
2. Switch to Briefing tab
3. Validate same configuration is active
4. Change settings in Briefing
5. Return to Free Prompt
6. Verify changes persisted

### Test 2: Global State Consistency
1. Enable Smart AI Routing in one tab
2. Set specific model preferences
3. Navigate through all tabs
4. Ensure routing decisions are consistent
5. Validate localStorage persistence

## Workflow Context Integration Tests

### Discovery Stage Queries
```
Query: "What are the emerging trends in sustainable packaging for food delivery services?"
Expected: Anthropic (research focus) with discovery-stage optimization
Context: { stage: 'discovery', priority: 'quality' }
```

### Content Creation Stage
```
Query: "Write compelling product descriptions for eco-friendly food containers"
Expected: OpenAI (content creation focus)
Context: { stage: 'content', priority: 'speed' }
```

### Strategic Brief Stage
```
Query: "Synthesize market research into strategic recommendations for sustainable packaging rollout"
Expected: Anthropic (strategy focus) with reasoning
Context: { stage: 'strategic_brief', priority: 'quality' }
```

## Error Handling & Fallback Tests

### Test 1: Provider API Errors
- Simulate 503 errors from primary provider
- Validate automatic fallback chain execution
- Ensure user receives response without interruption

### Test 2: Model Unavailability
- Request specific model that's temporarily unavailable
- Validate fallback to alternative model within same provider
- Check cross-provider fallback if needed

### Test 3: Network Connectivity Issues
- Simulate network timeouts
- Validate retry logic and fallback mechanisms
- Ensure graceful degradation

## Response Quality Validation

### Consistency Checks
- Same query across different providers
- Compare response quality and relevance
- Validate routing rationale accuracy

### Context Preservation
- Multi-turn conversations
- Ensure context carries through provider switches
- Validate research data integration

### Performance Metrics
- Response time tracking
- Quality scoring validation
- Provider health impact on routing decisions

## Advanced Scenario Testing

### Multi-Modal Requests
```
Query: "Analyze this market research document and create both a strategic summary and visual presentation concepts"
Expected: Document analysis → Anthropic, Visual concepts → OpenAI
Validation: Multi-step routing with different providers for different tasks
```

### Real-Time Adaptation
```
Scenario: Provider performance degrades during session
Expected: Dynamic re-routing to better performing alternatives
Validation: Health monitoring triggers routing changes
```

### User Override Scenarios
```
Test: User manually selects provider that's showing poor performance
Expected: Respect user choice but provide performance warning
Validation: Manual override takes precedence with appropriate feedback
```

## Integration Points Validation

### Research Engine Integration
- Verify research data flows correctly through routing
- Validate reasoning engine activation based on routing decisions
- Check research context preservation across provider switches

### Campaign Workflow Integration
- Test routing within guided workflow stages
- Validate stage-appropriate provider selection
- Ensure workflow context influences routing decisions

### Session Management
- Test routing decisions across session boundaries
- Validate configuration persistence
- Check provider health state maintenance

## Expected Outcomes

1. **100% routing accuracy** for query classification
2. **Sub-200ms routing decisions** for optimal performance
3. **99.9% uptime** through intelligent failover
4. **Cross-tab consistency** in all configuration states
5. **Seamless user experience** with transparent provider switching
6. **Quality maintenance** regardless of provider availability
7. **Context preservation** throughout complex workflows