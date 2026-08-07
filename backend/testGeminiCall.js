require('dotenv').config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  const systemPrompt = "You are Tera, a warm, empathetic friend.";
  const userPrompt = "are Teri accuracy Sahi Nahin a rahi hai tu response hi nahin de rahi hai";
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: userPrompt }] }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
        })
      }
    );
    const data = await response.json();
    console.log('Gemini API Response Status:', response.status);
    console.log('Gemini API Response Body:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

test();
