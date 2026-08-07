const getModels = (req) => req.models || require('../models');

/**
 * Calls Gemini Embeddings API to generate a 3072-dimension vector
 */
async function embedText(text, apiKey) {
  if (!apiKey) {
    console.warn('[VectorMemory] Missing Gemini API Key. Skipping embedding generation.');
    return null;
  }
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-2',
          content: {
            parts: [{ text }]
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[VectorMemory] Embed API returned status ${response.status}:`, errText);
      return null;
    }

    const data = await response.json();
    const values = data.embedding?.values;
    if (values && values.length === 3072) {
      return values;
    } else {
      console.warn(`[VectorMemory] Embedding values format unexpected or wrong dimension (expected 3072, got ${values?.length}).`);
      return null;
    }
  } catch (err) {
    console.error('[VectorMemory] Embedding generation failed:', err.message);
    return null;
  }
}

/**
 * Creates a memory and saves its vector representation in pgvector
 */
async function saveMemoryWithEmbedding(key, value, category = 'general', req) {
  const { Memory } = getModels(req);
  try {
    // 1. Create the database record
    const memory = await Memory.create({ key, value, category });

    // 2. Generate embedding for "${key}: ${value}"
    const embedding = await embedText(`${key}: ${value}`, process.env.GEMINI_API_KEY);
    if (embedding) {
      const vectorStr = `[${embedding.join(',')}]`;
      await req.sequelize.query(
        `UPDATE "Memories" SET "embedding" = :vectorStr::vector WHERE "id" = :id`,
        {
          replacements: { vectorStr, id: memory.id }
        }
      );
      console.log(`[VectorMemory] Created semantic memory "${key}" with vector.`);
    } else {
      console.log(`[VectorMemory] Created plain memory "${key}" (embedding failed/skipped).`);
    }

    return memory;
  } catch (err) {
    console.error('[VectorMemory] Failed to save memory with embedding:', err.message);
    // Fallback to simple create
    return await Memory.create({ key, value, category });
  }
}

/**
 * Performs pgvector cosine similarity search on memories
 */
async function searchSemanticMemory(queryText, limit = 5, req) {
  try {
    const embedding = await embedText(queryText, process.env.GEMINI_API_KEY);
    if (!embedding) {
      console.log('[VectorMemory] No query vector generated. Skipping semantic search.');
      return [];
    }

    const vectorStr = `[${embedding.join(',')}]`;
    const results = await req.sequelize.query(
      `SELECT "id", "key", "value", "category", 1 - ("embedding" <=> :vectorStr::vector) AS "similarity" 
       FROM "Memories" 
       WHERE "embedding" IS NOT NULL 
       ORDER BY "embedding" <=> :vectorStr::vector 
       LIMIT :limit`,
      {
        replacements: { vectorStr, limit: parseInt(limit, 10) },
        type: req.sequelize.QueryTypes.SELECT
      }
    );

    return results;
  } catch (err) {
    console.error('[VectorMemory] Semantic search failed:', err.message);
    return [];
  }
}

module.exports = {
  embedText,
  saveMemoryWithEmbedding,
  searchSemanticMemory
};
