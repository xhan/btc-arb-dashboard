const { normalizeArbPathNotes } = require('../arb/arb-path-notes-utils');

async function loadArbPathNotes({ configPath, readJsonFile }) {
  try {
    return normalizeArbPathNotes(await readJsonFile(configPath));
  } catch (error) {
    if (error instanceof SyntaxError || error.code === 'ENOENT') return {};
    throw error;
  }
}

function registerArbPathNotesRoutes(options) {
  const app = options.app;
  const configPath = options.configPath;
  const readJsonFile = options.readJsonFile;
  const safeWriteJsonFile = options.safeWriteJsonFile;
  const logger = options.logger || console;

  app.get('/api/arb-path-notes', async (req, res) => {
    try {
      res.json(await loadArbPathNotes({ configPath, readJsonFile }));
    } catch (error) {
      logger.error('Arb Path Notes Read Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/arb-path-notes', async (req, res) => {
    try {
      const notes = normalizeArbPathNotes(req.body);
      await safeWriteJsonFile(configPath, notes);
      res.json({ notes });
    } catch (error) {
      logger.error('Arb Path Notes Write Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  loadArbPathNotes,
  registerArbPathNotesRoutes
};
