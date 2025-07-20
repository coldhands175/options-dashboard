#!/bin/bash

# Test Claude API with curl for more detailed error info
echo "Testing Claude API with curl..."

API_KEY="sk-ant-api03-vF5bEEFYEVyowLlVzB9n6YdJbT82kLdEp2WjdXZjMvlPMlIW9VVh1uCFH7IW67qNVmdXcyONV_qWe8iE9c9FcnisJXF_PKpYQg-hjT6TQAA"

echo "API Key length: ${#API_KEY}"
echo ""

curl -v https://api.anthropic.com/v1/messages \
  --header "x-api-key: $API_KEY" \
  --header "anthropic-version: 2023-06-01" \
  --header "content-type: application/json" \
  --data '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 100,
    "messages": [
      {"role": "user", "content": "Hello, just testing API connection"}
    ]
  }'
