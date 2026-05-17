const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const vm = require('vm');

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

function isJavaScriptConfigFile(filePath) {
    return path.extname(String(filePath || '')).toLowerCase() === '.js';
}

function parseJavaScriptConfigFile(text, filePath) {
    const moduleRef = { exports: {} };
    const sandbox = {
        module: moduleRef,
        exports: moduleRef.exports,
        __filename: filePath,
        __dirname: path.dirname(filePath)
    };
    vm.runInNewContext(text, sandbox, {
        filename: filePath,
        displayErrors: true,
        timeout: 1000
    });
    if (moduleRef.exports && typeof moduleRef.exports === 'object') {
        return JSON.parse(JSON.stringify(moduleRef.exports));
    }
    return moduleRef.exports;
}

function parseConfigFileContent(filePath, data) {
    const text = stripBom(data);
    if (isJavaScriptConfigFile(filePath)) {
        return parseJavaScriptConfigFile(text, filePath);
    }
    return JSON.parse(text);
}

function extractLeadingCommentHeader(text) {
    const headerLines = [];
    let inBlockComment = false;
    for (const line of stripBom(text).split(/\r?\n/)) {
        const trimmed = line.trim();
        if (inBlockComment) {
            headerLines.push(line);
            if (trimmed.includes('*/')) inBlockComment = false;
            continue;
        }
        if (!trimmed && headerLines.length > 0) {
            headerLines.push(line);
            continue;
        }
        if (trimmed.startsWith('//')) {
            headerLines.push(line);
            continue;
        }
        if (trimmed.startsWith('/*')) {
            headerLines.push(line);
            if (!trimmed.includes('*/')) inBlockComment = true;
            continue;
        }
        break;
    }
    return headerLines.join('\n').trim() ? headerLines.join('\n').replace(/\s+$/, '') : '';
}

function getDefaultJavaScriptConfigHeader() {
    return [
        '// Dashboard runtime configuration.',
        '// You can add JavaScript comments in this file; export a plain object.'
    ].join('\n');
}

function formatJavaScriptConfigFileContent(data, options = {}) {
    const header = extractLeadingCommentHeader(options.existingContent || '') || getDefaultJavaScriptConfigHeader();
    return [
        header,
        '',
        `module.exports = ${JSON.stringify(data, null, 2)};`,
        ''
    ].join('\n');
}

function formatConfigFileContent(filePath, data, options = {}) {
    if (isJavaScriptConfigFile(filePath)) {
        return formatJavaScriptConfigFileContent(data, options);
    }
    return `${JSON.stringify(data, null, 2)}\n`;
}

async function readJsonFile(filePath, options = {}) {
    const readFile = options.readFile || fs.readFile;
    const data = await readFile(filePath, 'utf-8');
    return parseConfigFileContent(filePath, data);
}

function readJsonFileSync(filePath, options = {}) {
    const readFileSync = options.readFileSync || fsSync.readFileSync;
    const data = readFileSync(filePath, 'utf-8');
    return parseConfigFileContent(filePath, data);
}

function createQueuedJsonFileWriter(options = {}) {
    const readFile = options.readFile || fs.readFile;
    const writeFile = options.writeFile || fs.writeFile;
    const rename = options.rename || fs.rename;
    const logger = options.logger || console;
    let writeQueue = Promise.resolve();

    async function writeJsonFile(filePath, data) {
        writeQueue = writeQueue.then(async () => {
            try {
                const tempPath = `${filePath}.tmp`;
                const existingContent = isJavaScriptConfigFile(filePath)
                    ? await readFile(filePath, 'utf-8').catch(() => '')
                    : '';
                await writeFile(tempPath, formatConfigFileContent(filePath, data, { existingContent }), 'utf-8');
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
    formatConfigFileContent,
    parseConfigFileContent,
    readJsonFile,
    readJsonFileSync,
    resolveProjectFilePath,
    stripBom
};
