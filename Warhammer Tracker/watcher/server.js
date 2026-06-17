/**
 * WH40K Black Library — Watcher + Proxy Server
 * 
 * - Proxy: serve pedidos Algolia ao frontend (sem CORS)
 * - Watcher: verifica stock dos livros vigiados periodicamente
 * - Notificações: Email (SMTP) + Discord (webhook)
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── CONFIG (via env vars ou config.json) ───────────────────────────────────
const CONFIG_FILE = path.join(__dirname, 'config.json');

function loadConfig() {
  let file = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try { file = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch(e) {}
  }
  return {
    // Algolia
    algoliaApp: process.env.ALGOLIA_APP  || file.algoliaApp  || 'S7GRLRQQ5E',
    algoliaKey: process.env.ALGOLIA_KEY  || file.algoliaKey  || 'a3e3370abb3c3b9f27b7f1ad35a20e17',
    algoliaIdx: process.env.ALGOLIA_IDX  || file.algoliaIdx  || 'prod-lazarus-product-en-eu',

    // Proxy
    port: parseInt(process.env.PORT || file.port || 3001),

    // Watcher intervals (minutos)
    intervalWatched:  parseInt(process.env.INTERVAL_WATCHED  || file.intervalWatched  || 2),   // livros vigiados
    intervalPreorder: parseInt(process.env.INTERVAL_PREORDER || file.intervalPreorder || 10),  // pré-encomendas
    intervalAll:      parseInt(process.env.INTERVAL_ALL      || file.intervalAll      || 30),  // todos os livros

    // Email (SMTP via Gmail ou outro)
    emailEnabled:  process.env.EMAIL_ENABLED  === 'true' || file.emailEnabled  || false,
    emailHost:     process.env.EMAIL_HOST     || file.emailHost     || 'smtp.gmail.com',
    emailPort:     parseInt(process.env.EMAIL_PORT || file.emailPort || 587),
    emailUser:     process.env.EMAIL_USER     || file.emailUser     || '',
    emailPass:     process.env.EMAIL_PASS     || file.emailPass     || '',
    emailTo:       process.env.EMAIL_TO       || file.emailTo       || '',

    // Discord
    discordEnabled: process.env.DISCORD_ENABLED === 'true' || file.discordEnabled || false,
    discordWebhook: process.env.DISCORD_WEBHOOK || file.discordWebhook || '',

    // Persistência
    dataFile: process.env.DATA_FILE || file.dataFile || path.join(__dirname, 'data', 'state.json'),
  };
}

let CONFIG = loadConfig();

// ─── STATE ──────────────────────────────────────────────────────────────────
let state = {
  watched:    [],        // IDs dos livros vigiados
  lastStatus: {},        // { [id]: boolean (avail) }
  lastSeen:   {},        // { [id]: book object }
};

function loadState() {
  try {
    const dir = path.dirname(CONFIG.dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(CONFIG.dataFile)) {
      state = { ...state, ...JSON.parse(fs.readFileSync(CONFIG.dataFile, 'utf8')) };
      log(`Estado carregado: ${state.watched.length} livros vigiados`);
    }
  } catch(e) { log('Erro ao carregar estado: ' + e.message); }
}

function saveState() {
  try {
    const dir = path.dirname(CONFIG.dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG.dataFile, JSON.stringify(state, null, 2));
  } catch(e) { log('Erro ao guardar estado: ' + e.message); }
}

// ─── LOGGING ────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().replace('T',' ').substring(0,19);
  console.log(`[${ts}] ${msg}`);
}

// ─── ALGOLIA ────────────────────────────────────────────────────────────────
function algoliaQuery(facetFilters) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      hitsPerPage: 250,
      page: 0,
      facets: ['productType','language','isAvailable','isPreOrder','range','format'],
      facetFilters,
      attributesToRetrieve: [
        'name','productCode','objectID','salePrice','language',
        'productType','isAvailable','isPreOrder','imageUrl','url','range','format'
      ]
    });

    const options = {
      hostname: `${CONFIG.algoliaApp}-dsn.algolia.net`,
      path: `/1/indexes/${CONFIG.algoliaIdx}/query`,
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': CONFIG.algoliaApp,
        'X-Algolia-API-Key':        CONFIG.algoliaKey,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data, parsed: JSON.parse(data) }); }
        catch(e) { reject(new Error('JSON inválido: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

function normalizeBook(h) {
  return {
    id:       h.productCode || h.objectID,
    title:    h.name || '—',
    price:    h.salePrice != null ? `€${parseFloat(h.salePrice).toFixed(2)}` : '—',
    lang:     h.language   || 'en',
    type:     h.productType|| 'book',
    format:   h.format     || null,
    avail:    h.isAvailable === true || h.isAvailable === 'true',
    preorder: h.isPreOrder  === true || h.isPreOrder  === 'true',
    image:    h.imageUrl   || null,
    url:      h.url        || null,
    range:    h.range      || null,
  };
}

async function fetchBooks(tab) {
  const facetFilters = tab === 'preorder'
    ? [['isPreOrder:true'], ['productType:book']]
    : [['productType:book']];
  const result = await algoliaQuery(facetFilters);
  if (!result.parsed.hits) throw new Error('Sem hits');
  return result.parsed.hits.map(normalizeBook);
}

// ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

// Email via SMTP nativo (sem dependências externas)
function sendEmail(subject, htmlBody) {
  if (!CONFIG.emailEnabled || !CONFIG.emailUser || !CONFIG.emailTo) return;

  return new Promise((resolve) => {
    const boundary = 'WH40K_' + Date.now();
    const message = [
      `From: WH40K Watcher <${CONFIG.emailUser}>`,
      `To: ${CONFIG.emailTo}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      '',
      htmlBody
    ].join('\r\n');

    const b64 = Buffer.from(message).toString('base64');
    
    // Usar openssl s_client via socket TLS manual é complexo sem libs.
    // Usamos o módulo net + tls nativo do Node.
    const tls = require('tls');
    const net = require('net');

    let socket;
    const lines = [];
    let step = 0;

    const commands = [
      null, // esperar banner
      `EHLO localhost\r\n`,
      null, // esperar EHLO response + STARTTLS
      `STARTTLS\r\n`,
      null, // upgrade TLS
      `EHLO localhost\r\n`,
      null,
      `AUTH LOGIN\r\n`,
      null,
      Buffer.from(CONFIG.emailUser).toString('base64') + '\r\n',
      null,
      Buffer.from(CONFIG.emailPass).toString('base64') + '\r\n',
      null,
      `MAIL FROM:<${CONFIG.emailUser}>\r\n`,
      null,
      `RCPT TO:<${CONFIG.emailTo}>\r\n`,
      null,
      `DATA\r\n`,
      null,
      message + '\r\n.\r\n',
      null,
      `QUIT\r\n`,
    ];

    // Alternativa mais simples: curl via child_process
    const { execFile } = require('child_process');
    const curlArgs = [
      '--url', `smtps://${CONFIG.emailHost}:465`,
      '--ssl-reqd',
      '--mail-from', CONFIG.emailUser,
      '--mail-rcpt', CONFIG.emailTo,
      '--user', `${CONFIG.emailUser}:${CONFIG.emailPass}`,
      '-T', '-',
      '--silent',
    ];

    // Tenta curl primeiro, fallback para aviso no log
    execFile('curl', curlArgs, { input: message, timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        log(`[Email] Erro ao enviar (curl): ${err.message}`);
        // Tenta via sendmail se disponível
        execFile('sendmail', ['-f', CONFIG.emailUser, CONFIG.emailTo], 
          { input: message, timeout: 10000 }, (err2) => {
            if (err2) log('[Email] sendmail também falhou. Instala curl no container.');
            else log('[Email] Enviado via sendmail');
            resolve();
          });
      } else {
        log(`[Email] Enviado para ${CONFIG.emailTo}`);
        resolve();
      }
    });
  });
}

function buildEmailHtml(alerts) {
  const rows = alerts.map(b => `
    <tr style="border-bottom:1px solid #333">
      <td style="padding:12px;color:#e8dcc8;font-size:14px">
        <strong>${b.title}</strong>
        ${b.range ? `<br><span style="color:#8a7f6e;font-size:12px">${b.range}</span>` : ''}
      </td>
      <td style="padding:12px;color:#c9a84c;font-size:14px;font-weight:bold">${b.price}</td>
      <td style="padding:12px">
        ${b.url ? `<a href="${b.url.startsWith('http') ? b.url : 'https://www.warhammer.com/en-EU/' + b.url}"
          style="background:#c9a84c;color:#000;padding:6px 14px;border-radius:4px;text-decoration:none;font-size:12px;font-weight:bold">
          Comprar →</a>` : ''}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><body style="background:#111;margin:0;padding:20px;font-family:sans-serif">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;border:1px solid #c9a84c;border-radius:8px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0a0a0a,#1a0800);padding:24px;border-bottom:2px solid #c9a84c">
    <h1 style="color:#c9a84c;margin:0;font-size:22px">⚙ Biblioteca Imperial — Stock Reposto!</h1>
    <p style="color:#8a7f6e;margin:6px 0 0;font-size:13px">
      ${alerts.length} livro(s) que estavas a vigiar estão novamente disponíveis
    </p>
  </div>
  <div style="padding:8px 0">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#0d0d0d">
          <th style="padding:10px 12px;color:#8a7f6e;font-size:11px;text-align:left;text-transform:uppercase">Título</th>
          <th style="padding:10px 12px;color:#8a7f6e;font-size:11px;text-align:left;text-transform:uppercase">Preço</th>
          <th style="padding:10px 12px;color:#8a7f6e;font-size:11px;text-align:left;text-transform:uppercase">Link</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="padding:16px;background:#0d0d0d;border-top:1px solid #333">
    <p style="color:#5a5248;font-size:11px;margin:0">
      WH40K Biblioteca Imperial Watcher • <a href="http://localhost:8080" style="color:#c9a84c">Abrir app</a>
    </p>
  </div>
</div>
</body></html>`;
}

async function sendDiscord(alerts) {
  if (!CONFIG.discordEnabled || !CONFIG.discordWebhook) return;

  const webhookUrl = new URL(CONFIG.discordWebhook);

  const embeds = alerts.map(b => {
    const url = b.url ? (b.url.startsWith('http') ? b.url : 'https://www.warhammer.com/en-EU/' + b.url) : null;
    return {
      title: b.title,
      description: [
        b.range  ? `📚 **Série:** ${b.range}` : null,
        b.format ? `📖 **Formato:** ${b.format}` : null,
        `💶 **Preço:** ${b.price}`,
        url ? `🔗 **[Comprar agora](${url})**` : null,
      ].filter(Boolean).join('\n'),
      color: 0x2ecc71,
      thumbnail: b.image ? { url: b.image } : undefined,
      timestamp: new Date().toISOString(),
    };
  });

  const payload = JSON.stringify({
    username: '⚙ Biblioteca Imperial',
    avatar_url: 'https://www.warhammer.com/favicon.ico',
    content: `🚨 **${alerts.length} livro(s) voltaram a estar disponíveis!**`,
    embeds: embeds.slice(0, 10), // Discord limita a 10 embeds
  });

  return new Promise((resolve) => {
    const options = {
      hostname: webhookUrl.hostname,
      path: webhookUrl.pathname + webhookUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    };

    const req = https.request(options, res => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300) {
        log(`[Discord] Notificação enviada (${alerts.length} livros)`);
      } else {
        log(`[Discord] Erro HTTP ${res.statusCode}`);
      }
      resolve();
    });
    req.on('error', e => { log('[Discord] Erro: ' + e.message); resolve(); });
    req.setTimeout(10000, () => { req.destroy(); resolve(); });
    req.write(payload);
    req.end();
  });
}

async function notify(alerts) {
  if (!alerts.length) return;
  log(`[Notify] ${alerts.length} livro(s) com stock reposto: ${alerts.map(b=>b.title).join(', ')}`);

  const subject = `📦 WH40K — ${alerts.length} livro(s) disponíveis!`;
  const html    = buildEmailHtml(alerts);

  await Promise.all([
    sendEmail(subject, html).catch(e => log('[Email] ' + e.message)),
    sendDiscord(alerts).catch(e => log('[Discord] ' + e.message)),
  ]);
}

// ─── WATCHER LOOP ───────────────────────────────────────────────────────────
let watcherTimers = {};

async function checkWatched() {
  if (!state.watched.length) return;
  log(`[Watcher] A verificar ${state.watched.length} livro(s) vigiado(s)...`);

  try {
    const books = await fetchBooks('all');
    const alerts = [];

    for (const book of books) {
      // Guarda sempre o estado mais recente
      state.lastSeen[book.id] = book;

      if (state.watched.includes(book.id)) {
        const prev = state.lastStatus[book.id];
        const curr = book.avail && !book.preorder;

        if (prev === false && curr === true) {
          alerts.push(book);
          log(`[Watcher] ✅ STOCK REPOSTO: ${book.title}`);
        } else if (prev === undefined) {
          log(`[Watcher] 📋 Primeira vez a ver "${book.title}" — estado: ${curr ? 'disponível' : 'esgotado'}`);
        }

        state.lastStatus[book.id] = curr;
      }
    }

    saveState();
    if (alerts.length) await notify(alerts);

  } catch(e) {
    log(`[Watcher] Erro: ${e.message}`);
  }
}

async function checkPreorders() {
  log('[Watcher] A verificar pré-encomendas...');
  try {
    const books = await fetchBooks('preorder');
    // Detecta novas pré-encomendas que ainda não vimos
    const newOnes = books.filter(b => !state.lastSeen[b.id]);
    if (newOnes.length) {
      log(`[Watcher] ${newOnes.length} nova(s) pré-encomenda(s) detectada(s)`);
      // Poderias notificar aqui também se quiseres
    }
    books.forEach(b => { state.lastSeen[b.id] = b; });
    saveState();
  } catch(e) {
    log(`[Watcher] Erro preorders: ${e.message}`);
  }
}

function startWatcher() {
  // Limpa timers anteriores
  Object.values(watcherTimers).forEach(clearInterval);

  log(`[Watcher] Iniciando — watched:${CONFIG.intervalWatched}min, preorder:${CONFIG.intervalPreorder}min, all:${CONFIG.intervalAll}min`);

  // Verifica imediatamente ao iniciar
  checkWatched();
  checkPreorders();

  watcherTimers.watched   = setInterval(checkWatched,    CONFIG.intervalWatched  * 60 * 1000);
  watcherTimers.preorders = setInterval(checkPreorders,  CONFIG.intervalPreorder * 60 * 1000);
}

// ─── HTTP PROXY SERVER ──────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${CONFIG.port}`);
  const json = (code, obj) => {
    res.writeHead(code, {'Content-Type':'application/json'});
    res.end(JSON.stringify(obj));
  };

  // GET /health
  if (url.pathname === '/health') {
    return json(200, {
      ok: true,
      watched: state.watched.length,
      intervals: {
        watched:  CONFIG.intervalWatched,
        preorder: CONFIG.intervalPreorder,
        all:      CONFIG.intervalAll,
      },
      notifications: {
        email:   CONFIG.emailEnabled,
        discord: CONFIG.discordEnabled,
      },
      time: new Date().toISOString(),
    });
  }

  // GET /books?tab=all|preorder
  if (url.pathname === '/books' && req.method === 'GET') {
    try {
      const tab = url.searchParams.get('tab') || 'all';
      const result = await fetchBooks(tab);
      return json(200, { hits: result });
    } catch(e) {
      return json(500, { error: e.message });
    }
  }

  // GET /watched — lista de IDs vigiados
  if (url.pathname === '/watched' && req.method === 'GET') {
    return json(200, { watched: state.watched, lastStatus: state.lastStatus });
  }

  // POST /watched — atualiza lista de vigiados
  if (url.pathname === '/watched' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { watched } = JSON.parse(body);
        if (!Array.isArray(watched)) return json(400, { error: 'watched deve ser array' });
        state.watched = watched;
        saveState();
        log(`[API] Watched atualizado: ${watched.length} livros`);
        return json(200, { ok: true, watched: state.watched });
      } catch(e) { return json(400, { error: e.message }); }
    });
    return;
  }

  // POST /config — recarrega config (útil para mudar intervalos sem reiniciar)
  if (url.pathname === '/config' && req.method === 'POST') {
    CONFIG = loadConfig();
    startWatcher();
    return json(200, { ok: true, config: {
      intervalWatched: CONFIG.intervalWatched,
      intervalPreorder: CONFIG.intervalPreorder,
      emailEnabled: CONFIG.emailEnabled,
      discordEnabled: CONFIG.discordEnabled,
    }});
  }

  // POST /test-notify — envia notificação de teste
  if (url.pathname === '/test-notify' && req.method === 'POST') {
    const fakeBook = {
      id: 'TEST001',
      title: 'Horus Rising (Collector\'s Edition) — TESTE',
      price: '€45.00',
      range: 'Horus Heresy',
      format: 'Hardback',
      url: 'https://www.warhammer.com/en-EU/shop/black-library-novels',
      image: null,
    };
    await notify([fakeBook]);
    return json(200, { ok: true, message: 'Notificação de teste enviada' });
  }

  json(404, { error: 'Not found' });
});

// ─── BOOT ───────────────────────────────────────────────────────────────────
loadState();
startWatcher();

server.listen(CONFIG.port, () => {
  log(`[Proxy] A correr em http://localhost:${CONFIG.port}`);
  log(`[Proxy] Email: ${CONFIG.emailEnabled ? CONFIG.emailTo : 'desativado'}`);
  log(`[Proxy] Discord: ${CONFIG.discordEnabled ? 'ativado' : 'desativado'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => { saveState(); process.exit(0); });
process.on('SIGINT',  () => { saveState(); process.exit(0); });
