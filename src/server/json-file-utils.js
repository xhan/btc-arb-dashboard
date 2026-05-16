const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

function stripBom(text) {
    return String(text).replace(/^\uFEFF/, '');
}

function resolveProjectFilePath(fileName, envKey, options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const env = options.env || process.env;
    const overridePath = envKey ? String(env[envKey] || '').trim() : '';
    if (overridePath) {
        return path.resolve(overridePath);
    }
    return path.join(rootDir, fileName);
}

async function readJsonFile(filePath, options = {}) {
    const readFile = options.readFile || fs.readFile;
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(stripBom(data));
}

function readJsonFileSync(filePath, options = {}) {
    const readFileSync = options.readFileSync || fsSync.readFileSync;
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(stripBom(data));
}

function createQueuedJsonFileWriter(options = {}) {
    const writeFile = options.writeFile || fs.writeFile;
    const rename = options.rename || fs.rename;
    const logger = options.logger || console;
    let writeQueue = Promise.resolve();

    async function writeJsonFile(filePath, data) {
        writeQueue = writeQueue.then(async () => {
            try {
                const tempPath = `${filePath}.tmp`;
                await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
                await rename(tempPath, filePath);
            } catch (error) {
                logger.error('❌ 写入配置失败:', error);
            }
        });
        return writeQueue;
    }

    return {
        writeJsonFile
    };
}

module.exports = {
    createQueuedJsonFileWriter,
    readJsonFile,
    readJsonFileSync,
    resolveProjectFilePath,
    stripBom
};
