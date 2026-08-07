const { calculateNextRun } = require('./config/taskScheduler');

function testCron() {
  console.log('--- STARTING CRON CALCULATION TESTS ---');
  
  // Test 1: Daily at 9 AM (base is 8 AM)
  const baseDate = new Date(2026, 5, 15, 8, 0, 0); // June 15, 2026, 08:00:00 local
  const next9AM = calculateNextRun('0 9 * * *', baseDate);
  console.log('Daily 9 AM Next Run (Local):', next9AM.toString());
  if (next9AM.getHours() !== 9 || next9AM.getDate() !== 15) {
    throw new Error(`Test 1 Failed: Daily 9 AM next run should be June 15 at 9 AM, got hour=${next9AM.getHours()}, date=${next9AM.getDate()}`);
  }

  // Test 2: Daily at 9 AM when base time is 10 AM (runs tomorrow)
  const baseDate10 = new Date(2026, 5, 15, 10, 0, 0); // June 15, 2026, 10:00:00 local
  const next9AMTomorrow = calculateNextRun('0 9 * * *', baseDate10);
  console.log('Daily 9 AM Tomorrow Next Run (Local):', next9AMTomorrow.toString());
  if (next9AMTomorrow.getHours() !== 9 || next9AMTomorrow.getDate() !== 16) {
    throw new Error(`Test 2 Failed: Daily 9 AM next run from 10 AM should be June 16 at 9 AM, got hour=${next9AMTomorrow.getHours()}, date=${next9AMTomorrow.getDate()}`);
  }

  // Test 3: Every 5 minutes
  const next5Min = calculateNextRun('*/5 * * * *', baseDate);
  console.log('Every 5 Minutes Next Run (Local):', next5Min.toString());
  const diffMins = Math.round((next5Min - baseDate) / 60000);
  if (diffMins !== 5) {
    throw new Error(`Test 3 Failed: Every 5 minutes next run should be 5 minutes from base, got diff=${diffMins}`);
  }

  // Test 4: Hourly
  const nextHour = calculateNextRun('0 * * * *', baseDate);
  console.log('Hourly Next Run (Local):', nextHour.toString());
  if (nextHour.getHours() !== 9 || nextHour.getDate() !== 15 || nextHour.getMinutes() !== 0) {
    throw new Error(`Test 4 Failed: Hourly next run should be June 15 at 9:00 AM, got hour=${nextHour.getHours()}, min=${nextHour.getMinutes()}`);
  }

  console.log('--- ALL CRON TESTS PASSED ---');
  process.exit(0);
}

testCron();
