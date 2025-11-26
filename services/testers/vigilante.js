require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');

// Configuración de servicios a monitorear
const SERVICES = [
    {
        name: 'Payment Service',
        url: 'http://localhost:3001/health',
        critical: true
    },
    {
        name: 'Domain Service',
        url: 'http://localhost:4000/health',
        critical: true
    },
    {
        name: 'GitHub Pages',
        url: 'https://antigravity x.github.io/sombrerero/',
        critical: false
    }
];

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Almacenar resultados de tests
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    history: []
};

/**
 * Check de salud de un servicio
 */
async function checkService(service) {
    const startTime = Date.now();

    try {
        const response = await axios.get(service.url, {
            timeout: 5000,
            validateStatus: (status) => status < 500
        });

        const responseTime = Date.now() - startTime;
        const isHealthy = response.status === 200;

        return {
            service: service.name,
            url: service.url,
            status: response.status,
            responseTime,
            isHealthy,
            data: response.data,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;

        return {
            service: service.name,
            url: service.url,
            status: 0,
            responseTime,
            isHealthy: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Alerta al equipo (webhook, email, etc.)
 */
async function alertTeam(message, severity = 'warning') {
    const emoji = severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${colors.red}${emoji} ALERTA ${severity.toUpperCase()}: ${message}${colors.reset}`);

    // Aquí puedes agregar:
    // - Webhook a Discord/Slack
    // - Email via SendGrid/Mailgun
    // - SMS via Twilio
    // - Push notification

    // Ejemplo webhook (descomentar cuando tengas endpoint):
    /*
    if (process.env.WEBHOOK_URL) {
      try {
        await axios.post(process.env.WEBHOOK_URL, {
          text: `${emoji} ${message}`,
          severity,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error sending alert:', err.message);
      }
    }
    */
}

/**
 * Test de seguridad SSL
 */
async function testSSL(url) {
    if (!url.startsWith('https://')) {
        return { passed: false, message: 'No usa HTTPS' };
    }

    try {
        await axios.get(url, { timeout: 5000 });
        return { passed: true, message: 'SSL válido' };
    } catch (error) {
        if (error.message.includes('certificate')) {
            return { passed: false, message: 'Certificado SSL inválido' };
        }
        return { passed: false, message: error.message };
    }
}

/**
 * Ejecutar suite completa de tests
 */
async function runTestSuite() {
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}🔍 VerixRichon Vigilante - Test Suite${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
    console.log(`⏰ ${new Date().toLocaleString()}\n`);

    let allPassed = true;

    for (const service of SERVICES) {
        console.log(`${colors.blue}Testing: ${service.name}${colors.reset}`);
        console.log(`   URL: ${service.url}`);

        const result = await checkService(service);
        result.critical = service.critical;

        testResults.total++;
        testResults.history.push(result);

        // Mantener solo últimos 100 resultados
        if (testResults.history.length > 100) {
            testResults.history.shift();
        }

        if (result.isHealthy) {
            testResults.passed++;
            console.log(`   ${colors.green}✓ Healthy${colors.reset} (${result.responseTime}ms)`);

            // Test SSL para URLs públicas
            if (service.url.startsWith('https://')) {
                const sslTest = await testSSL(service.url);
                if (sslTest.passed) {
                    console.log(`   ${colors.green}✓ ${sslTest.message}${colors.reset}`);
                } else {
                    console.log(`   ${colors.yellow}⚠ ${sslTest.message}${colors.reset}`);
                }
            }
        } else {
            testResults.failed++;
            allPassed = false;
            console.log(`   ${colors.red}✗ Failed${colors.reset}`);
            console.log(`   ${colors.red}Error: ${result.error || 'Status ' + result.status}${colors.reset}`);

            // Alertar si es crítico
            if (service.critical) {
                await alertTeam(
                    `Servicio crítico caído: ${service.name} (${service.url})`,
                    'critical'
                );
            }
        }

        console.log('');
    }

    // Resumen
    console.log(`${colors.cyan}───────────────────────────────────────────────────${colors.reset}`);
    const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    const color = successRate >= 90 ? colors.green : successRate >= 70 ? colors.yellow : colors.red;
    console.log(`${color}Success Rate: ${successRate}% (${testResults.passed}/${testResults.total})${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

    return allPassed;
}

/**
 * Generar reporte HTML
 */
function generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>VerixRichon Vigilante - Status</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="60">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #0f3; margin-bottom: 10px;
    }
    .updated {
      color: #999; margin-bottom: 30px;
    }
    .services {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .service-card {
      background: #16213e;
      padding: 20px;
      border-radius: 10px;
      border-left: 4px solid #0f3;
    }
    .service-card.down {
      border-left-color: #f44;
    }
    .service-card h2 {
      margin-bottom: 10px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-up {
      background: #0f3;
      color: #000;
    }
    .status-down {
      background: #f44;
      color: #fff;
    }
    .metric {
      margin-top: 10px;
      font-size: 14px;
      color: #aaa;
    }
    .stats {
      background: #16213e;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-top: 15px;
    }
    .stat {
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      color: #0f3;
    }
    .stat-label {
      color: #999;
      font-size: 14px;
    }
    footer {
      text-align: center;
      color: #666;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛡️ VerixRichon Vigilante</h1>
    <p class="updated">Last updated: ${new Date().toLocaleString()} (Auto-refresh: 60s)</p>
    
    <div class="stats">
      <h2>Overall Statistics</h2>
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-number">${testResults.total}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat">
          <div class="stat-number">${testResults.passed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat">
          <div class="stat-number">${testResults.failed}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat">
          <div class="stat-number">${((testResults.passed / (testResults.total || 1)) * 100).toFixed(1)}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
      </div>
    </div>

    <div class="services">
      ${testResults.history.slice(-SERVICES.length).map(r => `
        <div class="service-card ${r.isHealthy ? '' : 'down'}">
          <h2>${r.service}</h2>
          <span class="status ${r.isHealthy ? 'status-up' : 'status-down'}">
            ${r.isHealthy ? '🟢 ONLINE' : '🔴 OFFLINE'}
          </span>
          <div class="metric">Response: ${r.responseTime}ms</div>
          <div class="metric">Status: ${r.status || 'Error'}</div>
          <div class="metric"><small>${r.url}</small></div>
        </div>
      `).join('')}
    </div>

    <footer>
      <p>Desarrollado con ❤️ por <strong>VerixRichon Software Factory</strong></p>
      <p><small>Automated Testing & Monitoring System</small></p>
    </footer>
  </div>
</body>
</html>
  `;

    return html;
}

/**
 * Servidor HTTP para reporte visual
 */
function startDashboardServer() {
    const http = require('http');
    const PORT = process.env.DASHBOARD_PORT || 5000;

    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(generateHTMLReport());
    });

    server.listen(PORT, () => {
        console.log(`📊 Dashboard disponible en: http://localhost:${PORT}`);
        console.log('');
    });
}

// ============================================================================
// MAIN
// ============================================================================

console.log(`${colors.green}
╔═══════════════════════════════════════════════════╗
║   VerixRichon Vigilante - Automated Tester        ║
║   "Protegiendo tu infraestructura 24/7"          ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);

// Modo de ejecución
const runOnce = process.argv.includes('--once');

if (runOnce) {
    console.log('🔄 Modo: Single run\n');
    runTestSuite().then(passed => {
        console.log(passed ? '✅ All tests passed' : '❌ Some tests failed');
        process.exit(passed ? 0 : 1);
    });
} else {
    console.log('🔄 Modo: Continuous monitoring');
    console.log('⏱️  Intervalo: Cada 1 minuto\n');

    // Ejecutar primero inmediatamente
    runTestSuite();

    // Luego cada 1 minuto
    cron.schedule('* * * * *', () => {
        runTestSuite();
    });

    // Iniciar dashboard
    startDashboardServer();

    console.log('🛡️  Vigilante activo. Presiona Ctrl+C para detener.\n');
}
