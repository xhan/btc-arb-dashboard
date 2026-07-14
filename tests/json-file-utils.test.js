const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createQueuedJsonFileWriter,
  formatConfigFileContent,
  parseConfigFileContent,
  readJsonFile,
  readJsonFileSync,
  resolveProjectFilePath,
  stripBom
} = require('../src/server/json-file-utils');

assert.strictEqual(stripBom('\uFEFF{"ok":true}'), '{"ok":true}');
assert.strictEqual(
  resolveProjectFilePath('config.json', 'CONFIG_PATH', {
    rootDir: '/project',
    env: {}
  }),
  path.join('/project', 'config.json')
);
assert.strictEqual(
  resolveProjectFilePath('config.json', 'CONFIG_PATH', {
    rootDir: '/project',
    env: { CONFIG_PATH: 'tmp/custom-config.json' }
  }),
  path.resolve('tmp/custom-config.json')
);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'json-file-utils-'));
const jsonPath = path.join(tempDir, 'bom.json');
const jsPath = path.join(tempDir, 'config.js');
fs.writeFileSync(jsonPath, '\uFEFF{"value":42}', 'utf-8');
fs.writeFileSync(jsPath, [
  '// comments are allowed',
  'module.exports = {',
  '  value: 7,',
  '  nested: { ok: true }',
  '};',
  ''
].join('\n'), 'utf-8');

assert.deepStrictEqual(readJsonFileSync(jsonPath), { value: 42 });
assert.deepStrictEqual(readJsonFileSync(jsPath), { value: 7, nested: { ok: true } });
assert.ok(formatConfigFileContent('/tmp/config.js', { value: 8 }, {
  existingContent: '// keep this note\n\nmodule.exports = {};'
}).startsWith('// keep this note\n\nmodule.exports = {'));

async function runAsyncReadTest() {
  assert.deepStrictEqual(await readJsonFile(jsonPath), { value: 42 });
  assert.deepStrictEqual(await readJsonFile(jsPath), { value: 7, nested: { ok: true } });
}

async function runQueuedWriterTest() {
  const operations = [];
  const errors = [];
  const writer = createQueuedJsonFileWriter({
    writeFile: async (filePath, content, encoding) => {
      const payload = JSON.parse(content);
      operations.push(['write', filePath, payload.id, encoding]);
      if (payload.id === 1) {
        throw new Error('first failed');
      }
    },
    rename: async (tempPath, targetPath) => {
      operations.push(['rename', tempPath, targetPath]);
    },
    logger: {
      error: (...args) => errors.push(args)
    }
  });

  const results = await Promise.allSettled([
    writer.writeJsonFile('/tmp/config.json', { id: 1 }),
    writer.writeJsonFile('/tmp/config.json', { id: 2 })
  ]);

  assert.deepStrictEqual(operations, [
    ['write', '/tmp/config.json.tmp', 1, 'utf-8'],
    ['write', '/tmp/config.json.tmp', 2, 'utf-8'],
    ['rename', '/tmp/config.json.tmp', '/tmp/config.json']
  ]);
  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0][0], '❌ 写入配置失败:');
  assert.strictEqual(errors[0][1].message, 'first failed');
  assert.strictEqual(results[0].status, 'rejected');
  assert.strictEqual(results[1].status, 'fulfilled');
}

async function runQueuedJavaScriptWriterTest() {
  const operations = [];
  const writer = createQueuedJsonFileWriter({
    writeFile: async (filePath, content, encoding) => {
      operations.push(['write', filePath, parseConfigFileContent('/tmp/config.js', content), encoding, content]);
    },
    rename: async (tempPath, targetPath) => {
      operations.push(['rename', tempPath, targetPath]);
    },
    logger: { error: () => {} }
  });

  await writer.writeJsonFile('/tmp/config.js', { id: 3 });

  assert.deepStrictEqual(operations.slice(0, 2).map((item) => item.slice(0, 4)), [
    ['write', '/tmp/config.js.tmp', { id: 3 }, 'utf-8'],
    ['rename', '/tmp/config.js.tmp', '/tmp/config.js']
  ]);
  assert.ok(operations[0][4].includes('module.exports = {'));
  assert.ok(operations[0][4].includes('JavaScript comments'));
}

Promise.resolve()
  .then(runAsyncReadTest)
  .then(runQueuedWriterTest)
  .then(runQueuedJavaScriptWriterTest)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
