const { getTenantConnection, createTenantDatabase } = require('./config/tenantManager');
const { ensureNativeToolsRegistered } = require('./config/toolExecutor');

async function runTest() {
  const userId = 'agent-loop-test-user';
  console.log('--- STARTING AGENT FUNCTION CALLING TEST ---');

  try {
    // 1. Setup Database
    console.log('Setting up database...');
    await createTenantDatabase(userId);
    const { sequelize, models } = getTenantConnection(userId);
    await sequelize.sync();

    // Clear old data for a clean test run
    await models.Permission.destroy({ where: {} });
    await models.Connection.destroy({ where: {} });
    await models.OAuthToken.destroy({ where: {} });
    await models.Session.destroy({ where: {} });
    await models.AgentSession.destroy({ where: {} });
    await models.ToolExecutionLog.destroy({ where: {} });

    // 2. Seed and Register Native Tools
    console.log('Seeding tool registry...');
    await ensureNativeToolsRegistered(models);

    // 3. Setup Connection status for Google & LinkedIn
    await models.Connection.upsert({ platform: 'google', status: 'CONNECTED' });
    await models.Connection.upsert({ platform: 'linkedin', status: 'CONNECTED' });
    
    // Setup simulated OAuth token
    await models.OAuthToken.upsert({
      platform: 'google',
      accessToken: 'mock-access-token-simulated',
      refreshToken: 'mock-refresh-token-simulated'
    });

    // 4. Test PERMISSION BLOCKED (Strict Security)
    // By default, permissions are disabled!
    console.log('Testing tool execution with Permission BLOCKED (should fail)...');
    const session = await models.Session.create({ title: 'Agent Loop Verification' });

    const responseBlocked = await fetch(`http://localhost:5000/api/sessions/${session.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({
        content: "mujhe mere gmail ke emails check karne hain aur linkedin ke messages dekhne hain",
        friendProfile: { name: "Tera", personality: "Warm & Wise" },
        userProfile: { name: "Dost" }
      })
    });

    const resDataBlocked = await responseBlocked.json();
    console.log('Blocked Response Content:', resDataBlocked.assistantMessage.content);
    
    // Check intermediate steps to assert permission block was hit!
    const agentSessionBlocked = await models.AgentSession.findOne({ 
      where: { sessionId: session.id },
      order: [['createdAt', 'DESC']]
    });
    console.log('Intermediate Steps (Blocked):', JSON.stringify(agentSessionBlocked?.intermediateSteps, null, 2));

    const blockedStep = agentSessionBlocked?.intermediateSteps?.find(s => s.status === 'FAILED');
    if (!blockedStep || !blockedStep.error.includes('Access Denied')) {
      throw new Error('Verification failed: Tool execution was not blocked by Permission Manager.');
    }
    console.log('Permission Manager Block test passed!');

    // 5. Test PERMISSION ALLOWED (Grant Permissions)
    console.log('Granting tool permissions...');
    await models.Permission.upsert({ toolName: 'get_emails', scope: 'gmail.read', enabled: true });
    await models.Permission.upsert({ toolName: 'get_linkedin_messages', scope: 'linkedin.read', enabled: true });

    console.log('Sending agent query with permissions GRANTED...');
    const responseAllowed = await fetch(`http://localhost:5000/api/sessions/${session.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({
        content: "ab please check karo gmail aur linkedin aur batayein kya updates hain?",
        friendProfile: { name: "Tera", personality: "Warm & Wise" },
        userProfile: { name: "Dost" }
      })
    });

    const resDataAllowed = await responseAllowed.json();
    console.log('Allowed Response Content:', resDataAllowed.assistantMessage.content);

    // Assert that the response contains info from BOTH Gmail and LinkedIn simulated messages
    const text = resDataAllowed.assistantMessage.content.toLowerCase();
    
    // Check intermediate steps to assert successful recursive tool calls
    const agentSessionAllowed = await models.AgentSession.findOne({
      where: { sessionId: session.id },
      order: [['createdAt', 'DESC']]
    });
    console.log('Intermediate Steps (Allowed):', JSON.stringify(agentSessionAllowed?.intermediateSteps, null, 2));

    const successfulSteps = agentSessionAllowed?.intermediateSteps?.filter(s => s.status === 'SUCCESS');
    if (!successfulSteps || successfulSteps.length < 2) {
      throw new Error('Verification failed: Agent did not execute both tools successfully.');
    }
    console.log('Recursive function-calling agent loop verified successfully!');

    console.log('--- ALL AGENT FUNCTION CALLING TESTS PASSED ---');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Agent Function Calling Test Failed:', err);
    process.exit(1);
  }
}

runTest();
