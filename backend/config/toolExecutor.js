const mcpClient = require('./mcpClient');

// Native tool schema metadata
const NATIVE_TOOLS_SCHEMAS = [
  {
    name: 'get_emails',
    description: 'Retrieve latest emails from connected Gmail account.',
    inputSchema: {
      type: 'object',
      properties: {
        maxResults: { type: 'integer', description: 'Number of emails to fetch (default: 3)' }
      }
    }
  },
  {
    name: 'search_emails',
    description: 'Search Gmail inbox for emails matching a specific query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or query (e.g. "interview", "from:hr")' },
        maxResults: { type: 'integer', description: 'Number of emails to fetch (default: 3)' }
      },
      required: ['query']
    }
  },
  {
    name: 'send_email',
    description: 'Send an email to a recipient using connected Gmail account.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Email address of the recipient' },
        subject: { type: 'string', description: 'Subject of the email' },
        body: { type: 'string', description: 'Body text content of the email' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'get_linkedin_messages',
    description: 'Retrieve recruiter messages, views, and updates from connected LinkedIn account.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_youtube_updates',
    description: 'Fetch subscription alerts and video uploads from connected YouTube account.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'manage_calendar',
    description: 'Add a new calendar event or retrieve calendar schedule.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create'], description: 'Action to perform' },
        title: { type: 'string', description: 'Title of the event (for create)' },
        startTime: { type: 'string', description: 'Start time ISO string (for create)' },
        endTime: { type: 'string', description: 'End time ISO string (for create)' }
      },
      required: ['action']
    }
  },
  {
    name: 'search_drive',
    description: 'Search for files in Google Drive by name.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term/filename' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_file_content',
    description: 'Download and retrieve the text/metadata content of a file from Google Drive.',
    inputSchema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'The unique ID of the file in Google Drive' }
      },
      required: ['fileId']
    }
  },
  {
    name: 'get_github_activity',
    description: 'Retrieve repositories, pull requests, or commits from connected GitHub account.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list_repos', 'list_prs', 'list_commits'], description: 'Action to perform' },
        owner: { type: 'string', description: 'Owner of the repository (required for list_prs/list_commits)' },
        repo: { type: 'string', description: 'Repository name (required for list_prs/list_commits)' }
      },
      required: ['action']
    }
  }
];

// Native JavaScript Tool handlers
const nativeHandlers = {
  get_emails: async (args, req) => {
    const { OAuthToken, Connection } = req.models;
    const conn = await Connection.findOne({ where: { platform: 'google' } });
    if (!conn || conn.status !== 'CONNECTED') {
      return { error: 'Gmail account is not connected.' };
    }
    const token = await OAuthToken.findOne({ where: { platform: 'google' } });
    const accessToken = token ? token.accessToken : null;

    if (accessToken === 'mock-access-token-simulated' || !accessToken) {
      return {
        source: 'Simulated Gmail',
        emails: [
          { subject: "Project Update Review", from: "rohan@tara.ai", date: "Today", snippet: "Hi Vaishnavi, let's review the AI Assistant codebase changes at 3 PM today. Please pull the latest main branch." },
          { subject: "Shortlisted Candidate Interview", from: "hr@naukri.com", date: "Yesterday", snippet: "Dear Vaishnavi, congratulations! Your profile has been shortlisted for the Software Engineer role. The interview is scheduled for tomorrow at 11 AM." },
          { subject: "YouTube Premium Receipt", from: "billing@youtube.com", date: "3 days ago", snippet: "Thank you for your monthly subscription payment of Rs. 129. Your Premium benefits are active." }
        ]
      };
    }

    try {
      const maxResults = args.maxResults || 3;
      const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!listRes.ok) throw new Error(`Gmail API status: ${listRes.status}`);
      const listData = await listRes.json();
      const emails = [];
      if (listData.messages) {
        for (const msg of listData.messages) {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            const headers = detail.payload?.headers || [];
            emails.push({
              subject: headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject',
              from: headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown',
              date: headers.find(h => h.name.toLowerCase() === 'date')?.value || 'Unknown',
              snippet: detail.snippet || ''
            });
          }
        }
      }
      return { source: 'Real Gmail API', emails };
    } catch (err) {
      return { error: `Failed to fetch emails: ${err.message}` };
    }
  },

  search_emails: async (args, req) => {
    const { OAuthToken, Connection } = req.models;
    const conn = await Connection.findOne({ where: { platform: 'google' } });
    if (!conn || conn.status !== 'CONNECTED') {
      return { error: 'Gmail account is not connected.' };
    }
    const token = await OAuthToken.findOne({ where: { platform: 'google' } });
    const accessToken = token ? token.accessToken : null;
    const query = args.query.toLowerCase();

    if (accessToken === 'mock-access-token-simulated' || !accessToken) {
      const mockInbox = [
        { subject: "Project Update Review", from: "rohan@tara.ai", date: "Today", snippet: "Hi Vaishnavi, let's review the AI Assistant codebase changes at 3 PM today. Please pull the latest main branch." },
        { subject: "Shortlisted Candidate Interview", from: "hr@naukri.com", date: "Yesterday", snippet: "Dear Vaishnavi, congratulations! Your profile has been shortlisted for the Software Engineer role. The interview is scheduled for tomorrow at 11 AM." },
        { subject: "YouTube Premium Receipt", from: "billing@youtube.com", date: "3 days ago", snippet: "Thank you for your monthly subscription payment of Rs. 129. Your Premium benefits are active." }
      ];
      const results = mockInbox.filter(e => 
        e.subject.toLowerCase().includes(query) || 
        e.from.toLowerCase().includes(query) || 
        e.snippet.toLowerCase().includes(query)
      );
      return { source: 'Simulated Gmail Search', emails: results };
    }

    try {
      const maxResults = args.maxResults || 3;
      const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(args.query)}&maxResults=${maxResults}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!listRes.ok) throw new Error(`Gmail API status: ${listRes.status}`);
      const listData = await listRes.json();
      const emails = [];
      if (listData.messages) {
        for (const msg of listData.messages) {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            const headers = detail.payload?.headers || [];
            emails.push({
              subject: headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject',
              from: headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown',
              date: headers.find(h => h.name.toLowerCase() === 'date')?.value || 'Unknown',
              snippet: detail.snippet || ''
            });
          }
        }
      }
      return { source: 'Real Gmail Search API', emails };
    } catch (err) {
      return { error: `Failed to search emails: ${err.message}` };
    }
  },

  send_email: async (args, req) => {
    const { OAuthToken, Connection } = req.models;
    const conn = await Connection.findOne({ where: { platform: 'google' } });
    if (!conn || conn.status !== 'CONNECTED') {
      return { error: 'Gmail account is not connected.' };
    }
    const token = await OAuthToken.findOne({ where: { platform: 'google' } });
    const accessToken = token ? token.accessToken : null;

    if (accessToken === 'mock-access-token-simulated' || !accessToken) {
      return {
        source: 'Simulated Gmail Send',
        success: true,
        sentEmail: { to: args.to, subject: args.subject, body: args.body, timestamp: new Date() }
      };
    }

    try {
      const emailStr = [
        `To: ${args.to}`,
        `Subject: ${args.subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        '',
        args.body
      ].join('\r\n');
      const encodedRaw = Buffer.from(emailStr).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedRaw })
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        throw new Error(`Gmail API send failed: ${errText}`);
      }

      const resData = await sendRes.json();
      return { source: 'Real Gmail Send API', success: true, messageId: resData.id };
    } catch (err) {
      return { error: `Failed to send email: ${err.message}` };
    }
  },

  get_linkedin_messages: async (args, req) => {
    const { Connection } = req.models;
    const conn = await Connection.findOne({ where: { platform: 'linkedin' } });
    if (!conn || conn.status !== 'CONNECTED') {
      return { error: 'LinkedIn account is not connected.' };
    }
    return {
      source: 'Simulated LinkedIn',
      messages: [
        { from: "Amit Kumar (Tech Recruiter)", content: "Hi Vaishnavi, I saw your profile on LinkedIn. We have an opening for a Full Stack Developer. Are you open to new opportunities?" }
      ],
      notifications: [
        { text: "Deepak Sharma and 4 others viewed your profile today." }
      ]
    };
  },

  get_youtube_updates: async (args, req) => {
    const { Connection } = req.models;
    const conn = await Connection.findOne({ where: { platform: 'youtube' } });
    if (!conn || conn.status !== 'CONNECTED') {
      return { error: 'YouTube account is not connected.' };
    }
    return {
      source: 'Simulated YouTube',
      subscriptions: [
        { channel: "CodeWithHarry", title: "React JS Full Course in Hindi (2026 Edition)" }
      ],
      recommendations: [
        { title: "How I Built a Multi-Tenant SaaS with Node.js & Supabase" }
      ]
    };
  },

  manage_calendar: async (args, req) => {
    const { OAuthToken, Connection, CalendarEvent } = req.models;
    const conn = await Connection.findOne({ where: { platform: 'google' } });
    const token = await OAuthToken.findOne({ where: { platform: 'google' } });
    const accessToken = token ? token.accessToken : null;

    // Use local DB calendar if google account is not connected or mock is active
    if (!conn || conn.status !== 'CONNECTED' || accessToken === 'mock-access-token-simulated' || !accessToken) {
      if (args.action === 'list') {
        const events = await CalendarEvent.findAll({ limit: 5, order: [['startTime', 'DESC']] });
        return { source: 'Database Calendar (Simulated)', events };
      } else if (args.action === 'create') {
        const { title, startTime, endTime } = args;
        if (!title || !startTime || !endTime) {
          return { error: 'Missing title, startTime, or endTime for create action.' };
        }
        const event = await CalendarEvent.create({ title, startTime: new Date(startTime), endTime: new Date(endTime) });
        return { source: 'Database Calendar (Simulated)', createdEvent: event };
      }
      return { error: `Unsupported calendar action: ${args.action}` };
    }

    // Real Google Calendar API Call
    try {
      if (args.action === 'list') {
        const listRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=10&orderBy=startTime&singleEvents=true`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!listRes.ok) throw new Error(`Calendar API list status: ${listRes.status}`);
        const listData = await listRes.json();
        const events = (listData.items || []).map(item => ({
          title: item.summary || 'No Title',
          startTime: item.start?.dateTime || item.start?.date,
          endTime: item.end?.dateTime || item.end?.date,
          description: item.description || ''
        }));
        return { source: 'Real Google Calendar API', events };
      } else if (args.action === 'create') {
        const { title, startTime, endTime } = args;
        if (!title || !startTime || !endTime) {
          return { error: 'Missing title, startTime, or endTime.' };
        }
        const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: title,
            description: 'Created by Tera AI Personal Assistant',
            start: { dateTime: new Date(startTime).toISOString() },
            end: { dateTime: new Date(endTime).toISOString() }
          })
        });
        if (!createRes.ok) {
          const errText = await createRes.text();
          throw new Error(`Calendar create failed: ${errText}`);
        }
        const createdEvent = await createRes.json();
        return { source: 'Real Google Calendar API', createdEvent };
      }
      return { error: `Unsupported calendar action: ${args.action}` };
    } catch (err) {
      return { error: `Google Calendar API execution failed: ${err.message}` };
    }
  },

  search_drive: async (args, req) => {
    const { OAuthToken, Connection } = req.models;
    const conn = await Connection.findOne({ where: { platform: 'google' } });
    const token = await OAuthToken.findOne({ where: { platform: 'google' } });
    const accessToken = token ? token.accessToken : null;
    const query = args.query.toLowerCase();

    if (!conn || conn.status !== 'CONNECTED' || accessToken === 'mock-access-token-simulated' || !accessToken) {
      const mockFiles = [
        { id: 'mock-file-id-resume', name: 'Vaishnavi_Resume_FullStack.pdf', type: 'PDF', modified: '2026-05-10', webViewLink: 'https://drive.google.com/mock/resume' },
        { id: 'mock-file-id-design', name: 'System_Design_Architecture_Tera.docx', type: 'Document', modified: '2026-06-01', webViewLink: 'https://drive.google.com/mock/design' },
        { id: 'mock-file-id-oauth', name: 'OAuth_Credentials_Store.xlsx', type: 'Spreadsheet', modified: '2026-06-12', webViewLink: 'https://drive.google.com/mock/oauth' }
      ];
      const results = mockFiles.filter(f => f.name.toLowerCase().includes(query));
      return { source: 'Simulated Google Drive', results };
    }

    try {
      const driveQuery = `name contains '${args.query}' and trashed = false`;
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(driveQuery)}&fields=files(id,name,mimeType,modifiedTime,webViewLink)`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!searchRes.ok) throw new Error(`Drive API search status: ${searchRes.status}`);
      const data = await searchRes.json();
      return { source: 'Real Google Drive API', results: data.files || [] };
    } catch (err) {
      return { error: `Google Drive API search failed: ${err.message}` };
    }
  },

  get_file_content: async (args, req) => {
    const { OAuthToken, Connection } = req.models;
    const conn = await Connection.findOne({ where: { platform: 'google' } });
    const token = await OAuthToken.findOne({ where: { platform: 'google' } });
    const accessToken = token ? token.accessToken : null;

    if (!conn || conn.status !== 'CONNECTED' || accessToken === 'mock-access-token-simulated' || !accessToken) {
      if (args.fileId === 'mock-file-id-resume') {
        return {
          source: 'Simulated File Content',
          fileId: args.fileId,
          name: 'Vaishnavi_Resume_FullStack.pdf',
          content: 'Vaishnavi Karil. Full Stack AI Engineer. Experience in Node.js, Express, React, PostgreSQL, and LLM integrations. Deep familiarity with MCP (Model Context Protocol) and agentic loops.'
        };
      }
      return {
        source: 'Simulated File Content',
        fileId: args.fileId,
        name: 'Unknown File',
        content: 'Simulated preview of file details. (Google Drive real download requires authentic credentials)'
      };
    }

    try {
      // Fetch file metadata first
      const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${args.fileId}?fields=name,mimeType`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!metaRes.ok) throw new Error(`Drive file meta status: ${metaRes.status}`);
      const fileMeta = await metaRes.json();

      let content = '';
      if (fileMeta.mimeType === 'application/vnd.google-apps.document') {
        // Google Docs must be exported as plain text
        const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${args.fileId}/export?mimeType=text/plain`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (exportRes.ok) content = await exportRes.text();
      } else {
        // Binary/text files downloaded directly
        const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${args.fileId}?alt=media`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (downloadRes.ok) content = await downloadRes.text();
      }

      return {
        source: 'Real Google Drive API',
        fileId: args.fileId,
        name: fileMeta.name,
        mimeType: fileMeta.mimeType,
        content: content.substring(0, 5000) // Cap to prevent token limit exhaustion
      };
    } catch (err) {
      return { error: `Failed to retrieve Google Drive file content: ${err.message}` };
    }
  },

  get_github_activity: async (args, req) => {
    const { OAuthToken, Connection } = req.models;
    const conn = await Connection.findOne({ where: { platform: 'github' } });
    const token = await OAuthToken.findOne({ where: { platform: 'github' } });
    const accessToken = token ? token.accessToken : null;

    if (!conn || conn.status !== 'CONNECTED' || accessToken === 'mock-access-token-simulated' || !accessToken) {
      // Return simulated GitHub data
      if (args.action === 'list_repos') {
        return {
          source: 'Simulated GitHub API',
          repositories: [
            { name: 'tera-ai-assistant', url: 'https://github.com/vaishnavi/tera-ai-assistant', stars: 12, language: 'JavaScript' },
            { name: 'mcp-postgres-server', url: 'https://github.com/vaishnavi/mcp-postgres-server', stars: 8, language: 'TypeScript' }
          ]
        };
      } else if (args.action === 'list_prs') {
        return {
          source: 'Simulated GitHub API',
          pullRequests: [
            { id: 412, title: 'feat: Add pgvector and semantic search', repo: `${args.owner}/${args.repo}`, status: 'Open', user: 'vaishnavi' }
          ]
        };
      } else if (args.action === 'list_commits') {
        return {
          source: 'Simulated GitHub API',
          commits: [
            { sha: '8f92a10c', message: 'Merge pull request #412: pgvector RAG memory system', author: 'Vaishnavi Karil', date: 'Today' }
          ]
        };
      }
      return { error: `Unsupported GitHub action: ${args.action}` };
    }

    try {
      const headers = {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Tera-AI-Assistant'
      };

      if (args.action === 'list_repos') {
        const repoRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', { headers });
        if (!repoRes.ok) throw new Error(`GitHub repos status: ${repoRes.status}`);
        const repos = await repoRes.json();
        return {
          source: 'Real GitHub API',
          repositories: repos.map(r => ({ name: r.name, url: r.html_url, stars: r.stargazers_count, language: r.language }))
        };
      } else if (args.action === 'list_prs') {
        if (!args.owner || !args.repo) throw new Error('Missing owner or repo argument.');
        const prsRes = await fetch(`https://api.github.com/repos/${args.owner}/${args.repo}/pulls?state=open&per_page=5`, { headers });
        if (!prsRes.ok) throw new Error(`GitHub PRs status: ${prsRes.status}`);
        const prs = await prsRes.json();
        return {
          source: 'Real GitHub API',
          pullRequests: prs.map(p => ({ id: p.number, title: p.title, repo: `${args.owner}/${args.repo}`, status: p.state, user: p.user?.login }))
        };
      } else if (args.action === 'list_commits') {
        if (!args.owner || !args.repo) throw new Error('Missing owner or repo argument.');
        const commitRes = await fetch(`https://api.github.com/repos/${args.owner}/${args.repo}/commits?per_page=5`, { headers });
        if (!commitRes.ok) throw new Error(`GitHub commits status: ${commitRes.status}`);
        const commits = await commitRes.json();
        return {
          source: 'Real GitHub API',
          commits: commits.map(c => ({ sha: c.sha.substring(0, 8), message: c.commit?.message, author: c.commit?.author?.name, date: c.commit?.author?.date }))
        };
      }
      return { error: `Unsupported GitHub action: ${args.action}` };
    } catch (err) {
      return { error: `GitHub API request failed: ${err.message}` };
    }
  }
};

/**
 * Syncs and seeds the list of native tools into the database tool registry
 */
async function ensureNativeToolsRegistered(models) {
  const { Tool } = models;
  for (const schema of NATIVE_TOOLS_SCHEMAS) {
    await Tool.upsert({
      name: schema.name,
      serverType: 'native',
      description: schema.description,
      inputSchema: schema.inputSchema,
      enabled: true
    });
  }
}

/**
 * Resolves a tool, checks configuration, and executes it (native handler or MCP client call)
 */
async function executeToolByName(toolName, args, req) {
  const { Tool, MCPServer, ToolExecutionLog } = req.models;
  const startTime = Date.now();
  
  const tool = await Tool.findOne({ where: { name: toolName } });
  if (!tool) {
    throw new Error(`Tool "${toolName}" is not registered in Tool Registry.`);
  }

  if (!tool.enabled) {
    throw new Error(`Tool "${toolName}" is currently disabled in dynamic registry.`);
  }

  // Permission Guard
  const { checkToolPermission } = require('./permissionManager');
  const isAllowed = await checkToolPermission(toolName, req);
  if (!isAllowed) {
    throw new Error(`Access Denied: Tool "${toolName}" is not authorized. Access must be granted first.`);
  }

  let result;
  let status = 'SUCCESS';
  let errorMessage = null;

  try {
    if (tool.serverType === 'native') {
      const handler = nativeHandlers[toolName];
      if (!handler) {
        throw new Error(`Native handler for "${toolName}" is not implemented.`);
      }
      result = await handler(args, req);
      if (result && result.error) {
        status = 'FAILED';
        errorMessage = result.error;
      }
    } else if (tool.serverType === 'mcp') {
      const server = await MCPServer.findByPk(tool.serverId);
      if (!server) {
        throw new Error(`MCP Server not found for tool "${toolName}".`);
      }
      result = await mcpClient.executeTool(server, toolName, args);
    } else {
      throw new Error(`Unsupported server type: ${tool.serverType}`);
    }
  } catch (err) {
    status = 'FAILED';
    errorMessage = err.message;
    result = { error: err.message };
  }

  const durationMs = Date.now() - startTime;
  await ToolExecutionLog.create({
    toolName,
    arguments: args,
    result: status === 'SUCCESS' ? result : null,
    status,
    error: errorMessage,
    durationMs
  });

  return result;
}

module.exports = {
  executeToolByName,
  ensureNativeToolsRegistered,
  NATIVE_TOOLS_SCHEMAS
};
