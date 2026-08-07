const { getTenantConnection, createTenantDatabase } = require('./config/tenantManager');
const { saveMemoryWithEmbedding, searchSemanticMemory } = require('./config/vectorMemory');

async function runTest() {
  const userId = 'vector-test-user';
  console.log('--- STARTING VECTOR MEMORY INTEGRATION TEST ---');

  try {
    // 1. Setup Database
    console.log('Setting up tenant database...');
    await createTenantDatabase(userId);
    const { sequelize, models } = getTenantConnection(userId);
    await sequelize.sync();

    // 2. Clear old memories
    await models.Memory.destroy({ where: {} });

    // 3. Save memories with embedding
    console.log('Adding test memories...');
    await saveMemoryWithEmbedding('favorite food', 'paneer tikka masala', 'preferences', { models, sequelize });
    await saveMemoryWithEmbedding('programming language', 'JavaScript, TypeScript, and Node.js', 'work', { models, sequelize });
    await saveMemoryWithEmbedding('home town', 'Bangalore, Karnataka, India', 'personal', { models, sequelize });

    // 4. Search semantic memory
    const query = 'what do you like to eat?';
    console.log(`Searching memories for query: "${query}"...`);
    const results = await searchSemanticMemory(query, 3, { models, sequelize });

    console.log('Search Results:');
    results.forEach((r, idx) => {
      console.log(`${idx + 1}. Key: "${r.key}" | Value: "${r.value}" | Similarity: ${Math.round(r.similarity * 100)}%`);
    });

    if (results.length === 0) {
      throw new Error('Verification failed: No memories returned from semantic search.');
    }

    if (results[0].key !== 'favorite food') {
      throw new Error(`Verification failed: Expected top result key "favorite food", but got "${results[0].key}"`);
    }

    console.log('Vector Memory semantic search test passed!');
    console.log('--- ALL VECTOR MEMORY TESTS PASSED ---');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Vector Memory Test Failed:', err);
    process.exit(1);
  }
}

runTest();
