const { getTenantConnection, createTenantDatabase } = require('./config/tenantManager');
const { ensureDefaultScheduledTasks, runAllTenantScheduledTasks } = require('./config/taskScheduler');
const User = require('./models/user');

async function testScheduler() {
  const userId = 'agent-loop-test-user@test.com'; // using a valid email format for validation
  console.log('--- STARTING SCHEDULER AUDIT TEST ---');

  try {
    // 1. Create central user record
    console.log('Registering test user in central database...');
    const sanitizedEmail = userId.toLowerCase().replace(/[^a-z0-9@.]/g, '_');
    const dbName = `user_db_${sanitizedEmail.replace(/[^a-z0-9]/g, '_')}`;
    
    await User.findOrCreate({
      where: { email: userId },
      defaults: {
        name: 'Agent Test User',
        dbName
      }
    });

    // 2. Provision database
    console.log('Provisioning database...');
    await createTenantDatabase(userId);

    const tenant = getTenantConnection(userId);
    const { models, sequelize } = tenant;
    await sequelize.sync();

    // 3. Ensure tasks are seeded
    console.log('Seeding default scheduled tasks...');
    await ensureDefaultScheduledTasks(models);

    // 4. Make all tasks due by setting nextRun to 1 hour ago
    console.log('Setting scheduled tasks nextRun to the past...');
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    await models.ScheduledTask.update(
      { nextRun: oneHourAgo, status: 'ACTIVE' },
      { where: {} }
    );

    // Verify task status
    const tasks = await models.ScheduledTask.findAll();
    console.log(`Tasks updated: ${tasks.length}`);
    tasks.forEach(t => {
      console.log(`  - Task: "${t.title}" | Status: ${t.status} | NextRun: ${t.nextRun}`);
    });

    // 5. Trigger tenant scheduler check
    console.log('\nTriggering runAllTenantScheduledTasks...');
    await runAllTenantScheduledTasks();

    // 6. Verify results
    console.log('\nVerifying execution results...');
    
    // Check ToolExecutionLogs for scheduled task executions
    const logs = await models.ToolExecutionLog.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    console.log('Recent ToolExecutionLogs:');
    let foundSchedulerLog = false;
    logs.forEach(l => {
      if (l.toolName.startsWith('scheduled_task:')) {
        console.log(`  - Log: ${l.toolName} | Status: ${l.status} | Duration: ${l.durationMs}ms | Result: ${JSON.stringify(l.result)}`);
        foundSchedulerLog = true;
      }
    });

    if (foundSchedulerLog) {
      console.log('\n[PASS] TaskScheduler successfully executed due tasks and logged the results.');
    } else {
      throw new Error('Verification failed: No execution log found for scheduled tasks.');
    }

    // Cleanup central user record to keep DB clean
    await User.destroy({ where: { email: userId } });
    console.log('Cleaned up central test user record.');

    console.log('--- SCHEDULER AUDIT TEST COMPLETE ---');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Scheduler Audit Test Failed:', err);
    process.exit(1);
  }
}

testScheduler();
