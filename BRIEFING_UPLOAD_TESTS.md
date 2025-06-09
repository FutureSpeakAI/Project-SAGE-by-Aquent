# Comprehensive Briefing Upload Test Cases

## Test Case 1: TXT File Upload and Processing
**Objective**: Verify TXT files are properly extracted and saved to library
**Steps**:
1. Upload test-brief.txt through DocumentUploadDialog
2. Verify file content extraction (not simulation)
3. Confirm briefing saved to library with correct metadata
4. Test agent processing of uploaded content

## Test Case 2: PDF File Upload and Processing  
**Objective**: Verify PDF files are properly extracted using pdf-parse
**Steps**:
1. Create sample PDF with marketing brief content
2. Upload through DocumentUploadDialog
3. Verify authentic PDF text extraction (no simulation)
4. Confirm library storage and agent processing

## Test Case 3: DOCX File Upload and Processing
**Objective**: Verify DOCX files are properly extracted using mammoth
**Steps**:
1. Create sample DOCX with creative brief content
2. Upload through DocumentUploadDialog
3. Verify authentic DOCX text extraction (no simulation)
4. Confirm library storage and agent processing

## Test Case 4: Model Routing Verification
**Objective**: Ensure Claude models route to Anthropic API, not OpenAI
**Steps**:
1. Set model to claude-sonnet-4-20250514
2. Generate content from uploaded briefing
3. Verify request goes to Anthropic API, not OpenAI
4. Confirm successful content generation

## Test Case 5: Multi-Provider Model Support
**Objective**: Test all four AI providers work with briefing content
**Steps**:
1. Upload sample briefing
2. Test content generation with each provider:
   - OpenAI (gpt-4o)
   - Anthropic (claude-sonnet-4-20250514)
   - Gemini (gemini-1.5-pro-002)
   - Perplexity (llama-3.1-sonar-small-128k-online)
3. Verify each generates appropriate content

## Test Case 6: Error Handling and Edge Cases
**Objective**: Test system resilience with various failure scenarios
**Steps**:
1. Upload unsupported file types (.jpg, .xlsx)
2. Upload corrupted files
3. Upload empty files
4. Test file size limits
5. Verify appropriate error messages

## Test Case 7: Briefing Library Integration
**Objective**: Verify complete upload-to-library-to-agent workflow
**Steps**:
1. Upload multiple briefing files
2. Verify all appear in BriefingLibrary component
3. Select briefing from library
4. Verify correct prompt formatting in Content tab
5. Generate content and verify output quality

## Test Case 8: Cache Invalidation and UI Updates
**Objective**: Ensure UI updates immediately after uploads
**Steps**:
1. Open BriefingLibrary (should be empty)
2. Upload new briefing file
3. Verify library refreshes automatically
4. Confirm new briefing appears without manual refresh

## Expected Results
- All file types extract actual content (no simulation text)
- Claude models route to Anthropic API correctly
- All uploaded files appear in briefing library
- Agent processes briefings and generates appropriate content
- Error handling works for edge cases
- UI updates immediately after uploads