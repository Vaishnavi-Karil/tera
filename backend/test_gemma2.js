const fetch = require('node-fetch');

async function testGemma() {
  const systemPrompt = `You are Tera, a warm human friend. Personality: Warm & Wise.
Match user's language (Natural Hinglish/English). Max 2-3 short sentences.
Address user as Vaishnavi.

You have access to the following tools:
1. get_emails: Retrieve user's emails. InputSchema: {}
2. get_linkedin_messages: Retrieve LinkedIn messages. InputSchema: {}
3. get_youtube_updates: Retrieve YouTube updates. InputSchema: {}

If you need to use a tool to answer the user, you MUST respond with a single tool call in this exact format:
[Request Tool Call: tool_name with args {}]

For example, if you need to fetch emails:
[Request Tool Call: get_emails with args {}]

Do not include any other text if you call a tool.`;

  const userPrompt = "Check my emails and see if there are any new updates";
  
  console.log('Testing gemma2:2b...');
  const start = Date.now();
  try {
    const response = await fetch('http://127.0.0.1:11434/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma2:2b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    });
    const duration = Date.now() - start;
    const data = await response.json();
    console.log('Gemma Latency:', duration, 'ms');
    console.log('Gemma Response:', data.choices?.[0]?.message?.content);
  } catch (err) {
    console.error('Failed to call gemma2:2b:', err);
  }
}

testGemma();
