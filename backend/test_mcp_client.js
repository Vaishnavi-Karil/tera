const path = require('path');
const mcpClient = require('./config/mcpClient');

async function runTest() {
  console.log('--- STARTING MCP CLIENT TEST ---');

  const server = {
    id: 'test-server-id-1',
    name: 'Mock Stdio Server',
    transport: 'stdio',
    command: 'node',
    args: [path.join(__dirname, 'mock_stdio_server.js')]
  };

  try {
    // 1. Discover Tools
    console.log('Testing tool discovery...');
    const tools = await mcpClient.discoverTools(server);
    console.log('Discovered Tools:', JSON.stringify(tools, null, 2));

    if (tools.length === 0 || tools[0].name !== 'mock_stdio_tool') {
      throw new Error('Verification failed: mock_stdio_tool not found in discovery list.');
    }
    console.log('Tool discovery test passed!');

    // 2. Execute Tool
    console.log('Testing tool execution...');
    const result = await mcpClient.executeTool(server, 'mock_stdio_tool', { input: 'Antigravity Test' });
    console.log('Execution Result:', JSON.stringify(result, null, 2));

    const expectedText = 'Hello from mock stdio tool! Received input: Antigravity Test';
    if (result.content?.[0]?.text !== expectedText) {
      throw new Error(`Verification failed: Expected content text "${expectedText}", but got "${result.content?.[0]?.text}"`);
    }
    console.log('Tool execution test passed!');

    console.log('--- ALL MCP CLIENT TESTS PASSED ---');
    process.exit(0);
  } catch (err) {
    console.error('MCP Client Test Failed:', err);
    process.exit(1);
  }
}

runTest();
