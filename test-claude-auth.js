// Simple Claude API authentication test
// Usage: node test-claude-auth.js

async function testClaudeAuth() {
  // Check for API key
  const claudeApiKey = process.env.ANTHROPIC_API_KEY;
  if (!claudeApiKey) {
    console.error('❌ ANTHROPIC_API_KEY environment variable not set');
    console.error('Set it with: export ANTHROPIC_API_KEY="your_key_here"');
    console.error('Get API key from: https://console.anthropic.com/');
    process.exit(1);
  }

  console.log('🔑 API Key found (length:', claudeApiKey.length, 'chars)');
  console.log('🔍 Testing Claude API connection...');

  const requestBody = {
    model: "claude-3-5-sonnet-20241022", // Using the model you tested
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: "Hello! Please respond with a simple JSON object containing just {\"status\": \"success\", \"message\": \"API working\"}"
      }
    ]
  };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      
      if (response.status === 401) {
        console.error('\n💡 Troubleshooting tips:');
        console.error('1. Check your API key is correct');
        console.error('2. Make sure you have sufficient credits');
        console.error('3. Verify your key hasn\'t expired');
        console.error('4. Check if you need to add billing info');
      }
      return;
    }

    const data = await response.json();
    
    if (data.content?.[0]?.text) {
      console.log('✅ Claude API is working!');
      console.log('📄 Response:', data.content[0].text);
      
      if (data.usage) {
        console.log('📊 Token usage:');
        console.log(`   Input: ${data.usage.input_tokens} tokens`);
        console.log(`   Output: ${data.usage.output_tokens} tokens`);
      }
      
      console.log('\n🎉 You\'re ready to test PDF processing!');
      console.log('Next: node test-claude.js path/to/your/document.pdf');
      
    } else {
      console.error('❌ Unexpected response format:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testClaudeAuth();
