require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: false }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // máximo 200 requests por IP
    message: 'Demasiadas solicitudes, intenta más tarde.'
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory domain storage (en producción usar DB)
const domains = new Map();

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'VerixRichon Domain Service',
        domains: domains.size,
        uptime: process.uptime()
    });
});

// Crear nuevo dominio personalizado
app.post('/api/domains/create', (req, res) => {
    try {
        const { name, target, ssl = true, metadata = {} } = req.body;

        if (!name || !target) {
            return res.status(400).json({ error: 'Nombre y target son requeridos' });
        }

        // Validar que el target sea una URL válida
        try {
            new URL(target);
        } catch {
            return res.status(400).json({ error: 'Target inválido (debe ser URL completa)' });
        }

        const id = uuidv4();
        const domain = {
            id,
            name: name.toLowerCase(),
            target,
            ssl,
            metadata,
            created: new Date().toISOString(),
            hits: 0,
            active: true
        };

        domains.set(id, domain);

        res.json({
            success: true,
            domain: {
                id: domain.id,
                url: `${req.protocol}://${req.get('host')}/r/${domain.name}`,
                target: domain.target
            }
        });
    } catch (error) {
        console.error('Error creating domain:', error);
        res.status(500).json({ error: 'Error al crear dominio' });
    }
});

// Listar todos los dominios
app.get('/api/domains/list', (req, res) => {
    const domainList = Array.from(domains.values()).map(d => ({
        id: d.id,
        name: d.name,
        target: d.target,
        hits: d.hits,
        active: d.active,
        created: d.created
    }));

    res.json({
        domains: domainList,
        total: domainList.length
    });
});

// Obtener info de un dominio
app.get('/api/domains/:id', (req, res) => {
    const domain = domains.get(req.params.id);

    if (!domain) {
        return res.status(404).json({ error: 'Dominio no encontrado' });
    }

    res.json(domain);
});

// Actualizar redirect de dominio
app.put('/api/domains/:id/redirect', (req, res) => {
    const domain = domains.get(req.params.id);

    if (!domain) {
        return res.status(404).json({ error: 'Dominio no encontrado' });
    }

    const { target } = req.body;

    if (!target) {
        return res.status(400).json({ error: 'Target es requerido' });
    }

    try {
        new URL(target);
    } catch {
        return res.status(400).json({ error: 'Target inválido' });
    }

    domain.target = target;
    domain.updated = new Date().toISOString();

    res.json({
        success: true,
        domain: {
            id: domain.id,
            target: domain.target
        }
    });
});

// Eliminar dominio
app.delete('/api/domains/:id', (req, res) => {
    const domain = domains.get(req.params.id);

    if (!domain) {
        return res.status(404).json({ error: 'Dominio no encontrado' });
    }

    domains.delete(req.params.id);

    res.json({
        success: true,
        message: 'Dominio eliminado'
    });
});

// Redirect handler (URL corta)
app.get('/r/:name', (req, res) => {
    const name = req.params.name.toLowerCase();

    // Buscar por nombre
    const domain = Array.from(domains.values()).find(d => d.name === name && d.active);

    if (!domain) {
        return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>404 - Dominio no encontrado</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>🔍 Dominio "${name}" no encontrado</h1>
        <p>Este enlace no existe o ha sido eliminado.</p>
        <p><small>VerixRichon Domain Service</small></p>
      </body>
      </html>
    `);
    }

    // Incrementar contador de hits
    domain.hits++;

    // Redirect
    res.redirect(domain.target);
});

// Dashboard simple
app.get('/', (req, res) => {
    const domainList = Array.from(domains.values());
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>VerixRichon Domain Service</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          padding: 30px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          color: #667eea;
          margin-bottom: 10px;
        }
        .subtitle {
          color: #666;
          margin-bottom: 30px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 10px;
          color: white;
        }
        .stat-card h3 {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 5px;
        }
        .stat-card .number {
          font-size: 32px;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        th {
          background: #f8f9fa;
          font-weight: 600;
          color: #667eea;
        }
        .domain-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }
        .domain-link:hover {
          text-decoration: underline;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .badge-active {
          background: #d4edda;
          color: #155724;
        }
        footer {
          margin-top: 30px;
          text-align: center;
          color: #999;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🌐 VerixRichon Domain Service</h1>
        <p class="subtitle">Sistema de gestión de dominios personalizados</p>
        
        <div class="stats">
          <div class="stat-card">
            <h3>Total Dominios</h3>
            <div class="number">${domains.size}</div>
          </div>
          <div class="stat-card">
            <h3>Total Redirects</h3>
            <div class="number">${domainList.reduce((sum, d) => sum + d.hits, 0)}</div>
          </div>
          <div class="stat-card">
            <h3>Uptime</h3>
            <div class="number">${Math.floor(process.uptime() / 60)}m</div>
          </div>
        </div>

        ${domainList.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Target</th>
                <th>Hits</th>
                <th>Estado</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              ${domainList.map(d => `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td><small>${d.target}</small></td>
                  <td>${d.hits}</td>
                  <td><span class="badge badge-active">Activo</span></td>
                  <td><a href="/r/${d.name}" class="domain-link" target="_blank">/r/${d.name}</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <p style="text-align: center; color: #999; padding: 40px;">No hay dominios registrados todavía</p>
        `}

        <footer>
          <p>Desarrollado con ❤️ por <strong>VerixRichon Software Factory</strong></p>
          <p><small>API: <code>/api/domains/*</code> | Health: <code>/health</code></small></p>
        </footer>
      </div>
    </body>
    </html>
  `;

    res.send(html);
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`\n🌐 VerixRichon Domain Service escuchando en puerto ${PORT}`);
    console.log(`🔒 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`❤️  VerixRichon Software Factory\n`);
});
