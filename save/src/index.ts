import express from 'express';
import { json } from 'body-parser';
import { initialiseRepl, saveFileChanges, FileChange } from './utils';

const app = express();
app.use(json());

app.get('/initialise', async (req, res) => {
  const { replId, language } = req.query as { replId: string; language: string };

  if (!replId || !language) {
    return res.status(400).json({ error: 'Missing replId or language' });
  }
  try {
    const files = await initialiseRepl(replId, language);
  res.status(200).json({
    message: 'Initialised REPL successfully',
    files
  });
  } catch (err) {
    console.error('[INITIALISE] Error:', err);
    res.status(500).json({ error: 'Failed to initialise REPL' });
  }
});

app.post('/change', async (req, res) => {
  console.log('[SAVE] Received file changes:', req.body);
  const { replId, files } = req.body as { replId: string; files: FileChange[] };

  if (!replId || !Array.isArray(files)) {
    return res.status(400).json({ error: 'Missing replId or files' });
  }

  try {
    await saveFileChanges(replId, files);
    res.status(200).json({ message: 'Changes saved successfully' });
  } catch (err) {
    console.error('[SAVE] Error:', err);
    res.status(500).json({ error: 'Failed to save changes' });
  }
});

app.listen(4000, () => {
  console.log('Save service is running on port 4000');
});
