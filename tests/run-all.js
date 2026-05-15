const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testsDir = __dirname;
const projectRoot = path.join(testsDir, '..');
const testFiles = fs.readdirSync(testsDir)
  .filter((file) => file.endsWith('.test.js'))
  .sort();

for (const file of testFiles) {
  console.log(`[test] ${file}`);
  const result = spawnSync(process.execPath, [path.join(testsDir, file)], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit'
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
