const { spawn } = require('child_process');

const activeProcesses = {};
const sseEndpoints = {};

// Clean up stdio processes on process exit
process.on('exit', () => {
  Object.values(activeProcesses).forEach(p => p.child.kill());
});

/**
 * Gets or spawns a stdio process for a specific MCP server.
 */
function getOrCreateStdioProcess(serverId, command, args = []) {
  if (activeProcesses[serverId]) {
    if (activeProcesses[serverId].child.exitCode === null) {
      return activeProcesses[serverId];
    }
    // Clean up dead process
    activeProcesses[serverId].child.kill();
    delete activeProcesses[serverId];
  }

  console.log(`[MCP Client] Spawning stdio process for ${serverId}: ${command} ${args.join(' ')}`);
  const child = spawn(command, args, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
  
  const pendingRequests = {};
  let buffer = '';

  child.stdout.on('data', (data) => {
    buffer += data.toString();
    let lineEnd;
    while ((lineEnd = buffer.indexOf('\n')) !== -1) {
      const line = buffer.substring(0, lineEnd).trim();
      buffer = buffer.substring(lineEnd + 1);
      if (!line) continue;

      try {
        const response = JSON.parse(line);
        if (response.id && pendingRequests[response.id]) {
          const { resolve, reject } = pendingRequests[response.id];
          delete pendingRequests[response.id];
          if (response.error) {
            reject(new Error(response.error.message || 'JSON-RPC Error'));
          } else {
            resolve(response.result);
          }
        }
      } catch (err) {
        console.error('[MCP Client] Failed to parse stdout JSON line:', line, err);
      }
    }
  });

  child.stderr.on('data', (data) => {
    console.error(`[MCP Client Error - Stdio ${serverId}]:`, data.toString());
  });

  child.on('error', (err) => {
    console.error(`[MCP Client Error - Stdio Spawn ${serverId}]:`, err);
  });

  child.on('close', (code) => {
    console.log(`[MCP Client Stdio ${serverId}] closed with code:`, code);
    Object.values(pendingRequests).forEach(({ reject }) => {
      reject(new Error('Stdio process terminated unexpectedly.'));
    });
    delete activeProcesses[serverId];
  });

  activeProcesses[serverId] = { child, pendingRequests, nextRequestId: 1 };
  return activeProcesses[serverId];
}

/**
 * Sends a JSON-RPC request over Stdio.
 */
function sendStdioRequest(serverId, command, args, method, params = {}) {
  return new Promise((resolve, reject) => {
    try {
      const processInfo = getOrCreateStdioProcess(serverId, command, args);
      const id = processInfo.nextRequestId++;
      processInfo.pendingRequests[id] = { resolve, reject };

      const request = {
        jsonrpc: '2.0',
        method,
        params,
        id
      };

      processInfo.child.stdin.write(JSON.stringify(request) + '\n');
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Initiates SSE handshake to find client-to-server POST endpoint.
 */
async function getSsePostEndpoint(serverId, url) {
  if (sseEndpoints[serverId]) {
    return sseEndpoints[serverId];
  }

  console.log(`[MCP Client] Performing SSE handshake at: ${url}`);
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'text/event-stream' }
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed with status: ${response.status}`);
      }

      // Safe timeout fallback
      const timeoutId = setTimeout(() => {
        if (response.body && response.body.destroy) response.body.destroy();
        console.log(`[MCP Client] SSE Handshake timed out. Falling back to base: ${url}`);
        resolve(url);
      }, 5000);

      const stream = response.body;
      let buffer = '';

      const onData = (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        let currentEvent = null;
        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('event:')) {
            currentEvent = cleanLine.substring(6).trim();
          } else if (cleanLine.startsWith('data:') && currentEvent === 'endpoint') {
            const endpoint = cleanLine.substring(5).trim();
            const absoluteUrl = new URL(endpoint, url).toString();
            console.log(`[MCP Client] SSE client-to-server post endpoint found: ${absoluteUrl}`);
            clearTimeout(timeoutId);
            if (stream.removeListener) stream.removeListener('data', onData);
            if (stream.destroy) stream.destroy();
            sseEndpoints[serverId] = absoluteUrl;
            resolve(absoluteUrl);
            return;
          }
        }
      };

      if (stream.on) {
        stream.on('data', onData);
        stream.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
      } else {
        // Fallback for Web Stream reader (in case fetch uses it)
        clearTimeout(timeoutId);
        resolve(url);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Sends a JSON-RPC request over SSE.
 */
async function sendSseRequest(serverId, url, method, params = {}) {
  const postUrl = await getSsePostEndpoint(serverId, url);
  
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id: Date.now()
  };

  const response = await fetch(postUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`SSE HTTP POST failed with status: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'JSON-RPC Error');
  }
  return data.result;
}

/**
 * Discovers tools from an MCP server.
 */
async function discoverTools(server) {
  try {
    let result;
    if (server.transport === 'stdio') {
      result = await sendStdioRequest(server.id, server.command, server.args || [], 'tools/list');
    } else {
      result = await sendSseRequest(server.id, server.url, 'tools/list');
    }
    return result.tools || [];
  } catch (err) {
    console.error(`[MCP Client] Discovery failed on server ${server.name}:`, err.message);
    throw err;
  }
}

/**
 * Executes a tool on an MCP server.
 */
async function executeTool(server, toolName, args) {
  try {
    let result;
    const params = { name: toolName, arguments: args };
    if (server.transport === 'stdio') {
      result = await sendStdioRequest(server.id, server.command, server.args || [], 'tools/call', params);
    } else {
      result = await sendSseRequest(server.id, server.url, 'tools/call', params);
    }
    return result;
  } catch (err) {
    console.error(`[MCP Client] Execution failed on server ${server.name} for tool ${toolName}:`, err.message);
    throw err;
  }
}

/**
 * Syncs/caches discovered tools into the dynamic Tool registry.
 */
async function syncToolsWithRegistry(server, models) {
  const tools = await discoverTools(server);
  const { Tool } = models;

  // Transactionally remove old cached tools for this server and insert new ones
  await Tool.destroy({ where: { serverId: server.id, serverType: 'mcp' } });
  
  for (const t of tools) {
    await Tool.create({
      name: t.name,
      serverType: 'mcp',
      serverId: server.id,
      description: t.description,
      inputSchema: t.inputSchema,
      enabled: true
    });
  }

  console.log(`[MCP Client] Cached ${tools.length} tools for server: ${server.name}`);
  return tools;
}

module.exports = {
  discoverTools,
  executeTool,
  syncToolsWithRegistry
};
