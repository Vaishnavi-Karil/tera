const { getTenantConnection, createTenantDatabase } = require('./config/tenantManager');
const { ensureNativeToolsRegistered } = require('./config/toolExecutor');

async function runScenarios() {
  const userId = 'agent-loop-test-user';
  console.log('--- STARTING AGENT CHAT SCENARIOS TEST ---');

  try {
    // 1. Setup Database
    console.log('Setting up database...');
    await createTenantDatabase(userId);
    const { sequelize, models } = getTenantConnection(userId);
    await sequelize.sync();

    // Reset data
    await models.Permission.destroy({ where: {} });
    await models.Connection.destroy({ where: {} });
    await models.OAuthToken.destroy({ where: {} });
    await models.Session.destroy({ where: {} });
    await models.AgentSession.destroy({ where: {} });
    await models.ToolExecutionLog.destroy({ where: {} });

    // 2. Register native tools
    await ensureNativeToolsRegistered(models);

    // 3. Setup Connections
    await models.Connection.upsert({ platform: 'google', status: 'CONNECTED' });
    await models.Connection.upsert({ platform: 'linkedin', status: 'CONNECTED' });
    await models.Connection.upsert({ platform: 'youtube', status: 'CONNECTED' });
    
    // Seed OAuth tokens
    await models.OAuthToken.upsert({ platform: 'google', accessToken: 'mock-access-token-simulated' });
    await models.OAuthToken.upsert({ platform: 'linkedin', accessToken: 'mock-access-token-simulated' });
    await models.OAuthToken.upsert({ platform: 'youtube', accessToken: 'mock-access-token-simulated' });

    // 4. Grant Permissions
    await models.Permission.upsert({ toolName: 'get_emails', scope: 'gmail.read', enabled: true });
    await models.Permission.upsert({ toolName: 'get_linkedin_messages', scope: 'linkedin.read', enabled: true });
    await models.Permission.upsert({ toolName: 'get_youtube_updates', scope: 'youtube.read', enabled: true });
    await models.Permission.upsert({ toolName: 'manage_calendar', scope: 'calendar.write', enabled: true });

    // Create session
    const session = await models.Session.create({ title: 'Chat Scenario Test' });

    const queries = [
      "Show my emails.",
      "Any LinkedIn messages?",
      "What's new on YouTube?",
      "Prepare me for tomorrow's interview."
    ];

    for (const query of queries) {
      console.log(`\nSending User Query: "${query}"`);
      
      const response = await fetch(`http://localhost:5000/api/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          content: query,
          friendProfile: { name: "Tera", personality: "Warm & Wise" },
          userProfile: { name: "Dost" }
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log(`Assistant Response: "${data.assistantMessage.content}"`);

      // Retrieve intermediate steps
      const agentSession = await models.AgentSession.findOne({
        where: { sessionId: session.id },
        order: [['createdAt', 'DESC']]
      });

      console.log('Intermediate Steps:');
      if (agentSession && agentSession.intermediateSteps) {
        agentSession.intermediateSteps.forEach(s => {
          console.log(`  - Tool: ${s.tool} | Status: ${s.status} | Result: ${JSON.stringify(s.result)}`);
        });
      } else {
        console.log('  - None');
      }
    }

    console.log('\n--- ALL CHAT SCENARIOS TEST COMPLETED SUCCESSFULLY ---');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Chat Scenarios Test Failed:', err);
    process.exit(1);
  }
}

runScenarios();
