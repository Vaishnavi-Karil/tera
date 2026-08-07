const { Op } = require('sequelize');
const getModels = (req) => req.models || require('../models');
const User = require('../models/user');

/**
 * Calculates next run date based on simple cron expressions
 */
function calculateNextRun(cronExpression, fromDate = new Date()) {
  const now = new Date(fromDate);
  if (cronExpression.startsWith('*/')) {
    const mins = parseInt(cronExpression.split(' ')[0].replace('*/', ''), 10) || 5;
    return new Date(now.getTime() + mins * 60000);
  }
  if (cronExpression.startsWith('0 ')) {
    const parts = cronExpression.split(' ');
    const hourStr = parts[1];
    if (hourStr === '*') {
      // Hourly
      const next = new Date(now);
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + 1);
      return next;
    } else {
      // Daily at specific hour, e.g. "0 9 * * *"
      const targetHour = parseInt(hourStr, 10);
      const next = new Date(now);
      next.setHours(targetHour, 0, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }
  }
  // Default fallback: 1 hour from now
  return new Date(now.getTime() + 3600000);
}

/**
 * Seeds default scheduled tasks for a user
 */
async function ensureDefaultScheduledTasks(models) {
  const { ScheduledTask } = models;
  const defaults = [
    {
      title: 'Daily LinkedIn posts',
      cronExpression: '0 9 * * *',
      prompt: "Generate and publish today's daily LinkedIn post based on my latest updates and interests.",
      status: 'ACTIVE'
    },
    {
      title: 'Email summaries',
      cronExpression: '0 8 * * *',
      prompt: 'Check my Gmail for unread emails and provide a short summary.',
      status: 'ACTIVE'
    },
    {
      title: 'Job notifications',
      cronExpression: '0 * * * *',
      prompt: 'Check if there are any new interview emails in my Gmail and notify me.',
      status: 'ACTIVE'
    }
  ];

  for (const t of defaults) {
    await ScheduledTask.findOrCreate({
      where: { title: t.title },
      defaults: {
        cronExpression: t.cronExpression,
        prompt: t.prompt,
        status: t.status,
        nextRun: calculateNextRun(t.cronExpression)
      }
    });
  }
}

/**
 * Checks and executes active background tasks across all tenant databases
 */
async function runAllTenantScheduledTasks() {
  const { getTenantConnection } = require('./tenantManager');
  const { runAgentLoop } = require('../controllers/chatController');

  try {
    const users = await User.findAll();
    console.log(`[TaskScheduler] Running scheduler check for ${users.length} tenants...`);

    for (const user of users) {
      const tenant = getTenantConnection(user.email);
      const { models, sequelize } = tenant;

      // Ensure default tasks exist for this tenant
      await ensureDefaultScheduledTasks(models);

      const dueTasks = await models.ScheduledTask.findAll({
        where: {
          status: 'ACTIVE',
          [Op.or]: [
            { nextRun: null },
            { nextRun: { [Op.lte]: new Date() } }
          ]
        }
      });

      for (const task of dueTasks) {
        console.log(`[TaskScheduler] Running due task: "${task.title}" for tenant: ${user.email}`);
        await task.update({ status: 'RUNNING' });

        const startTime = Date.now();
        let status = 'SUCCESS';
        let error = null;
        let responseText = '';

        try {
          // Find or create Background session
          let session = await models.Session.findOne({ where: { title: 'Background Automations' } });
          if (!session) {
            session = await models.Session.create({ title: 'Background Automations', summary: 'Daily background briefs' });
          }

          // Save user prompt in session
          await models.Message.create({
            sessionId: session.id,
            sender: 'user',
            content: task.prompt || `Run automation: ${task.title}`
          });

          // Get history (last 5 messages)
          const rawHistory = await models.Message.findAll({
            where: { sessionId: session.id },
            limit: 5,
            order: [['createdAt', 'DESC']]
          });
          const history = rawHistory.reverse();

          // Construct mock req context
          const mockReq = { models, sequelize, userId: user.email };

          // Run agent loop
          responseText = await runAgentLoop(
            session.id,
            task.prompt || `Run automation: ${task.title}`,
            history,
            { name: 'Tera', personality: 'Warm & Wise' },
            { name: user.name, interests: user.interests },
            mockReq
          );

          // Save AI response in session
          await models.Message.create({
            sessionId: session.id,
            sender: 'assistant',
            content: responseText
          });

        } catch (err) {
          console.error(`[TaskScheduler] Task "${task.title}" execution failed:`, err);
          status = 'FAILED';
          error = err.message;
        }

        const durationMs = Date.now() - startTime;

        // Log task execution
        await models.ToolExecutionLog.create({
          toolName: `scheduled_task:${task.title.toLowerCase().replace(/\s+/g, '_')}`,
          arguments: { prompt: task.prompt, cronExpression: task.cronExpression },
          result: status === 'SUCCESS' ? { response: responseText } : null,
          status,
          error,
          durationMs
        });

        // Update next run
        const nextRun = calculateNextRun(task.cronExpression);
        await task.update({
          status: 'ACTIVE',
          lastRun: new Date(),
          nextRun
        });

        console.log(`[TaskScheduler] Task "${task.title}" completed. Next run: ${nextRun}`);
      }
    }
  } catch (err) {
    console.error('[TaskScheduler] Background task runner failed:', err);
  }
}

module.exports = {
  calculateNextRun,
  ensureDefaultScheduledTasks,
  runAllTenantScheduledTasks
};
