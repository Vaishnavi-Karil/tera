require('dotenv').config();

async function testEmbedding(modelName) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        content: { parts: [{ text: 'Hello World' }] }
      })
    });
    const text = await response.text();
    console.log(`[TEST] Model: ${modelName} | Status: ${response.status}`);
    if (response.ok) {
      const data = JSON.parse(text);
      console.log(`SUCCESS: values length = ${data.embedding?.values?.length}`);
      return true;
    } else {
      console.log(`FAILED: ${text}`);
      return false;
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    return false;
  }
}

async function run() {
  await testEmbedding('models/gemini-embedding-001');
  await testEmbedding('models/gemini-embedding-2');
}

run();
