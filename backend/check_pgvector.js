const { Client } = require('pg');
require('dotenv').config();

async function runCheck() {
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL.');
    
    // Check if pgvector extension is available or can be enabled
    console.log('Testing pgvector extension enablement...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('SUCCESS: pgvector extension is supported and enabled!');
  } catch (err) {
    console.error('pgvector is not supported or connection failed:', err.message);
  } finally {
    await client.end();
  }
}

runCheck();
