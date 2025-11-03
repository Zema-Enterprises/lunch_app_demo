#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const commands = [
  {
    label: 'Polling vs Realtime Query Metrics',
    args: ['vitest', 'run', 'src/test/performance/notifications-query-metrics.test.tsx', '--pool', 'threads'],
  },
  {
    label: 'Realtime Integration SLA',
    args: ['vitest', 'run', 'src/test/integration/notifications-realtime.integration.test.tsx', '--pool', 'threads'],
  },
];

let hasFailure = false;

commands.forEach(({ label, args }) => {
  console.log(`\n▶︎ ${label}`);
  const start = Date.now();
  const result = spawnSync('npx', args, { stdio: 'inherit', env: process.env });
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  if (result.status !== 0) {
    hasFailure = true;
    console.error(`✖ ${label} failed after ${duration}s`);
  } else {
    console.log(`✔ ${label} completed in ${duration}s`);
  }
});

if (hasFailure) {
  process.exitCode = 1;
} else {
  console.log('\nRealtime benchmark complete. Review vitest output for latency and polling assertions.');
}
