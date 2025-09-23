#!/bin/bash

# Create test RFP file
cat << EOF > test-rfp.txt
REQUEST FOR PROPOSAL
Digital Marketing Services

Company: Sample Corp
Date: $(date)

1. Company Overview
Can you provide an overview of your company's experience in digital marketing?

2. Service Capabilities
What specific digital marketing services do you offer?

3. Team Structure
How is your team structured, and who would be the key contacts for our account?

4. Case Studies
Can you provide 2-3 relevant case studies from similar projects?

5. Technology Stack
What marketing technologies and platforms do you typically use?

6. Pricing Model
What is your pricing structure for ongoing marketing services?
EOF

echo "=== Testing RFP Upload via curl ==="
echo "Uploading test-rfp.txt..."

# Test the upload endpoint
curl -X POST http://localhost:5000/api/rfp/process \
  -F "file=@test-rfp.txt" \
  -H "Accept: application/json" \
  -o response.json \
  -w "\n\nHTTP Status: %{http_code}\n"

echo "Response saved to response.json"

# Check if successful
if [ -f response.json ]; then
  echo "Response content:"
  cat response.json | head -c 1000
  echo
fi

# Cleanup
rm -f test-rfp.txt response.json

echo "Test complete!"