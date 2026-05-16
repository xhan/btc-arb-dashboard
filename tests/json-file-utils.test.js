const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createQueuedJsonFileWriter,
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
fs.writeFileSync(jsonPath, '\uFEFF{"value":42}', 'utf-8');

assert.deepStrictEqual(readJsonFileSync(jsonPath), { value: 42 });

async function runAsyncReadTest() {
  assert.deepStrictEqual(await readJsonFile(jsonPath), { value: 42 });
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

  await Promise.all([
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
}

Promise.resolve()
  .then(runAsyncReadTest)
  .then(runQueuedWriterTest)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
