process.stdin.on('data', (data) => {
  const line = data.toString().trim();
  if (!line) return;
  try {
    const request = JSON.parse(line);
    if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'mock_stdio_tool',
              description: 'A mock stdio tool',
              inputSchema: {
                type: 'object',
                properties: {
                  input: { type: 'string' }
                }
              }
            }
          ]
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    } else if (request.method === 'tools/call') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: `Hello from mock stdio tool! Received input: ${request.params.arguments.input}`
            }
          ]
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    }
  } catch (err) {
    process.stderr.write('Error parsing JSON: ' + err.message + '\n');
  }
});
