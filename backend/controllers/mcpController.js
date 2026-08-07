const mcpClient = require('../config/mcpClient');

// 1. List MCP Servers
exports.listServers = async (req, res) => {
  try {
    const { MCPServer } = req.models;
    const servers = await MCPServer.findAll();
    res.json(servers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve MCP servers' });
  }
};

// 2. Add/Update MCP Server
exports.createOrUpdateServer = async (req, res) => {
  try {
    const { MCPServer } = req.models;
    const { name, transport, url, command, args } = req.body;

    if (!name || !transport) {
      return res.status(400).json({ error: 'Missing name or transport type.' });
    }

    const server = await MCPServer.create({
      name,
      transport,
      url,
      command,
      args,
      status: 'INACTIVE'
    });

    res.status(201).json(server);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create MCP server config' });
  }
};

// 3. Trigger Server Tool Discovery (Capability Cache Sync)
exports.discoverServerTools = async (req, res) => {
  try {
    const { MCPServer } = req.models;
    const { id } = req.params;

    const server = await MCPServer.findByPk(id);
    if (!server) {
      return res.status(404).json({ error: 'MCP Server config not found.' });
    }

    await server.update({ status: 'CONNECTING' });

    try {
      const tools = await mcpClient.syncToolsWithRegistry(server, req.models);
      await server.update({ status: 'ACTIVE' });
      res.json({ message: 'Tool discovery complete', count: tools.length, tools });
    } catch (discoveryErr) {
      await server.update({ status: 'ERROR' });
      res.status(502).json({ error: `Discovery failed: ${discoveryErr.message}` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to run tool discovery.' });
  }
};

// 4. List All Registered Tools (Native + MCP)
exports.listTools = async (req, res) => {
  try {
    const { Tool } = req.models;
    const tools = await Tool.findAll({ order: [['serverType', 'ASC'], ['name', 'ASC']] });
    res.json(tools);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list tools' });
  }
};

// 5. Toggle Tool Status (Enable/Disable)
exports.toggleTool = async (req, res) => {
  try {
    const { Tool } = req.models;
    const { id } = req.params;
    const { enabled } = req.body;

    const tool = await Tool.findByPk(id);
    if (!tool) {
      return res.status(404).json({ error: 'Tool not found.' });
    }

    await tool.update({ enabled: !!enabled });
    res.json({ message: `Tool "${tool.name}" state updated`, tool });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update tool state' });
  }
};

// 6. List Permissions
exports.listPermissions = async (req, res) => {
  try {
    const { Permission } = req.models;
    const permissions = await Permission.findAll();
    res.json(permissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve permissions list' });
  }
};

// 7. Configure Tool Permission (Enable/Disable granular access)
exports.updatePermission = async (req, res) => {
  try {
    const { Permission } = req.models;
    const { toolName, enabled, scope } = req.body;

    if (!toolName) {
      return res.status(400).json({ error: 'Missing toolName.' });
    }

    const [perm] = await Permission.upsert({
      toolName,
      scope: scope || 'custom',
      enabled: !!enabled
    });

    res.json({ message: `Permission updated for tool: ${toolName}`, permission: perm });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update permission' });
  }
};
