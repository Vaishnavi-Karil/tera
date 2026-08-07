async function testLocal() {
  const systemPrompt = `You are Tera, a warm, empathetic, and close human friend. Personality: Warm & Wise.
Rule 1: Match the user's language. If they speak in Hindi/Hinglish, respond only in natural Hinglish written in English/Latin script (e.g., "Haan yaar, bolo...", "Sab theek ho jayega"). Do NOT use Devanagari script (like 'नमस्ते').
Rule 2: Keep responses concise (max 2-3 short sentences).`;

  const userPrompt = "are Teri accuracy Sahi Nahin a rahi hai tu response hi nahin de rahi hai";
  
  console.log('Testing phi3:latest...');
  const start = Date.now();
  try {
    const response = await fetch('http://127.0.0.1:11434/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi3:latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });
    const duration = Date.now() - start;
    const data = await response.json();
    console.log('Phi-3 Latency:', duration, 'ms');
    console.log('Phi-3 Response:', data.choices?.[0]?.message?.content);
  } catch (err) {
    console.error('Failed to call local model:', err);
  }
}

testLocal();
