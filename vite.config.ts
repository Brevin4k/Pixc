import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function jsonDatabasePlugin(): Plugin {
  const dbPath = path.resolve(__dirname, 'data/clientes_pix.json');

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

  return {
    name: 'json-pix-database-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/pix')) {
          return next();
        }

        // GET /api/pix/download
        if (req.url.startsWith('/api/pix/download') && req.method === 'GET') {
          ensureDb();
          const content = fs.readFileSync(dbPath, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename="clientes_pix.json"');
          res.end(content);
          return;
        }

        // GET /api/pix
        if (req.url === '/api/pix' && req.method === 'GET') {
          const list = readDb();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(list));
          return;
        }

        // POST /api/pix
        if (req.url === '/api/pix' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { nome, chavePix, tipoChave } = payload;
              if (!nome || !chavePix) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Nome e chave Pix são obrigatórios.' }));
                return;
              }

              const list = readDb();
              const newEntry = {
                id: 'pix_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                nome: String(nome).trim(),
                chavePix: String(chavePix).trim(),
                tipoChave: tipoChave ? String(tipoChave).trim() : 'Outro',
                criadoEm: new Date().toISOString()
              };

              // Put new one at top
              list.unshift(newEntry);
              writeDb(list);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, item: newEntry }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Erro ao salvar no banco JSON: ' + err.message }));
            }
          });
          return;
        }

        // DELETE /api/pix/:id
        if (req.url.startsWith('/api/pix/') && req.method === 'DELETE') {
          const id = req.url.replace('/api/pix/', '').trim();
          const list = readDb();
          const filtered = list.filter(item => item.id !== id);
          writeDb(filtered);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), jsonDatabasePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
