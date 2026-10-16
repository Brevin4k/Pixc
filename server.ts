import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.resolve(__dirname, 'data/clientes_pix.json');

app.use(express.json());

const ensureDb = () => {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '[]', 'utf-8');
  }
};

const readDb = (): any[] => {
  ensureDb();
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
};

const writeDb = (data: any[]) => {
  ensureDb();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/pix', (_req, res) => {
  const list = readDb();
  res.json(list);
});

app.get('/api/pix/download', (_req, res) => {
  ensureDb();
  res.download(dbPath, 'clientes_pix.json');
});

app.post('/api/pix', (req, res) => {
  const { nome, chavePix, tipoChave } = req.body;
  if (!nome || !chavePix) {
    return res.status(400).json({ error: 'Nome e chave Pix são obrigatórios.' });
  }
  const list = readDb();
  const newEntry = {
    id: 'pix_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    nome: String(nome).trim(),
    chavePix: String(chavePix).trim(),
    tipoChave: tipoChave ? String(tipoChave).trim() : 'Outro',
    criadoEm: new Date().toISOString()
  };
  list.unshift(newEntry);
  writeDb(list);
  res.json({ success: true, item: newEntry });
});

app.delete('/api/pix/:id', (req, res) => {
  const { id } = req.params;
  const list = readDb();
  const filtered = list.filter((item: any) => item.id !== id);
  writeDb(filtered);
  res.json({ success: true });
});

// Serve frontend dist if available
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
