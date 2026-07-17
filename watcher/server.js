/**
 * WH40K Black Library — Servidor único
 * - Serve o frontend (index.html) em /
 * - Proxy para Algolia em /books
 * - Watcher de stock com notificações email + Discord
 * - API para gerir livros vigiados e config
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── CONFIG ─────────────────────────────────────────────
const CONFIG_FILE   = path.join(__dirname, 'config.json');
const FRONTEND_FILE = path.join(__dirname, 'index.html');
const DEFAULT_DATA_FILE = path.join(__dirname, 'data', 'state.json');

function resolveDataFile(value) {
  if (!value) return DEFAULT_DATA_FILE;
  return path.isAbsolute(value) ? value : path.join(__dirname, value);
}

function loadConfig() {
  let file = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try { file = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch(e) {}
  }
  return {
    algoliaApp: process.env.ALGOLIA_APP || file.algoliaApp || 'M5ZIQZNQ2H',
    algoliaKey: process.env.ALGOLIA_KEY  || file.algoliaKey  || '92c6a8254f9d34362df8e6d96475e5d8',
    algoliaIdx: process.env.ALGOLIA_IDX  || file.algoliaIdx  || 'prod-lazarus-product-en-eu',
    port:       parseInt(process.env.PORT || file.port || 8080),

    intervalWatched:  parseInt(process.env.INTERVAL_WATCHED  || file.intervalWatched  || 2),
    intervalPreorder: parseInt(process.env.INTERVAL_PREORDER || file.intervalPreorder || 10),

    emailEnabled: process.env.EMAIL_ENABLED === 'true' || file.emailEnabled || false,
    emailHost:    process.env.EMAIL_HOST    || file.emailHost    || 'smtp.gmail.com',
    emailPort:    parseInt(process.env.EMAIL_PORT || file.emailPort || 465),
    emailUser:    process.env.EMAIL_USER    || file.emailUser    || '',
    emailPass:    process.env.EMAIL_PASS    || file.emailPass    || '',
    emailTo:      process.env.EMAIL_TO      || file.emailTo      || '',

    discordEnabled: process.env.DISCORD_ENABLED === 'true' || file.discordEnabled || true,
    discordWebhook: process.env.DISCORD_WEBHOOK || file.discordWebhook || 'https://discord.com/api/webhooks/1517298345910075593/IZotSE5ip9yGUDYGZDXgPhzAFDFoSddrTDwPHUCunyx0bMhDw56AssDoQ0z7KbBcfQMP',

    dataFile: resolveDataFile(process.env.DATA_FILE || file.dataFile),
  };
}

let CONFIG = loadConfig();
console.log('ALGOLIA APP:', CONFIG.algoliaApp);
console.log('ALGOLIA KEY:', CONFIG.algoliaKey);
console.log('ALGOLIA IDX:', CONFIG.algoliaIdx);
console.log('Config:', { discordEnabled: CONFIG.discordEnabled, discordWebhook: CONFIG.discordWebhook, emailEnabled: CONFIG.emailEnabled, emailTo: CONFIG.emailTo, dataFile: CONFIG.dataFile });

// ─── STATE ──────────────────────────────────────────────
let state = { watched: [], lastStatus: {}, lastSeen: {}, history: {} };
let latestCatalog = { all: [], preorder: [] };

function loadState() {
  try {
    const dir = path.dirname(CONFIG.dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(CONFIG.dataFile)) {
      state = { ...state, ...JSON.parse(fs.readFileSync(CONFIG.dataFile, 'utf8')) };
      log(`Estado carregado — ${state.watched.length} livros vigiados`);
    }
  } catch(e) { log('Erro ao carregar estado: ' + e.message); }
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(CONFIG.dataFile), { recursive: true });
    fs.writeFileSync(CONFIG.dataFile, JSON.stringify(state, null, 2));
  } catch(e) { log('Erro ao guardar estado: ' + e.message); }
}

function recordHistory(book) {
  if (!book?.id) return;
  const history = state.history[book.id] || [];
  const latest = history[history.length - 1];
  const snapshot = {
    ts: new Date().toISOString(),
    availabilityState: book.availabilityState || 'unknown',
    available: Boolean(book.avail),
    preorder: Boolean(book.preorder),
  };
  const changed = !latest || latest.availabilityState !== snapshot.availabilityState || latest.available !== snapshot.available || latest.preorder !== snapshot.preorder;
  if (changed) {
    state.history[book.id] = [...history, snapshot].slice(-14);
  }
}

// ─── LOGGING ────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${ts}] ${msg}`);
}

// ─── ALGOLIA ────────────────────────────────────────────
const BOOK_ATTRIBUTES = [
  'name', 'title', 'productCode', 'objectID', 'salePrice', 'price', 'language',
  'productType', 'isAvailable', 'isPreOrder', 'isInStock', 'inStock', 'stockLevel',
  'stockQuantity', 'quantityAvailable', 'inventory', 'isOrderable', 'orderable',
  'purchasable', 'canAddToCart', 'addToCartDisabled', 'availability', 'availabilityStatus',
  'productStatus', 'stockStatus', 'onlineStockStatus', 'imageUrl', 'image_url',
  'image', 'images', 'media', 'url', 'slug', 'productUrl', 'canonicalUrl', 'path',
  'range', 'format', 'bookFormat', 'productFormat'
];

function algoliaQuery(facetFilters, page = 0, hitsPerPage = 250) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      hitsPerPage,
      page,
      facets: ['productType', 'language', 'isAvailable', 'isPreOrder', 'range', 'format'],
      facetFilters,
      attributesToRetrieve: BOOK_ATTRIBUTES
    });

    const options = {
      hostname: `${CONFIG.algoliaApp}-dsn.algolia.net`,
      path: `/1/indexes/${CONFIG.algoliaIdx}/query`,
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': CONFIG.algoliaApp,
        'X-Algolia-API-Key':        CONFIG.algoliaKey,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Algolia HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON inválido')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

function pickFirst(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '');
}

function truthy(v) {
  if (v === true) return true;
  if (v === false || v == null) return false;
  return ['true', 'yes', 'available', 'in stock', 'instock', 'on sale', 'preorder', 'pre-order']
    .includes(String(v).trim().toLowerCase());
}

function falsey(v) {
  if (v === false) return true;
  if (v === true || v == null) return false;
  return ['false', 'no', 'sold out', 'soldout', 'out of stock', 'outofstock', 'unavailable', 'disabled']
    .includes(String(v).trim().toLowerCase());
}

function isSoldOut(h) {
  const status = pickFirst(h.availability, h.availabilityStatus, h.productStatus, h.stockStatus, h.onlineStockStatus, h.stock_status);
  const qty = pickFirst(h.stockLevel, h.stockQuantity, h.quantityAvailable, h.inventory);
  if (status != null && falsey(status)) return true;
  if (qty !== undefined && qty !== null && qty !== '' && Number(qty) <= 0) return true;
  if (falsey(h.isInStock) || falsey(h.inStock) || falsey(h.isOrderable) || falsey(h.orderable) || falsey(h.purchasable) || falsey(h.canAddToCart)) return true;
  if (truthy(h.addToCartDisabled)) return true;
  return false;
}

function isBuyable(h) {
  return truthy(h.canAddToCart) || truthy(h.purchasable) || truthy(h.isOrderable) || truthy(h.orderable) || truthy(h.isInStock) || truthy(h.inStock) || truthy(h.isAvailable);
}

function normalizeAvailabilityState(h) {
  const raw = pickFirst(h.availability, h.availabilityStatus, h.productStatus, h.stockStatus, h.onlineStockStatus, h.stock_status);
  const rawTextValue = rawText(raw).trim().toLowerCase();
  const qty = pickFirst(h.stockLevel, h.stockQuantity, h.quantityAvailable, h.inventory);
  const numericQty = qty != null && qty !== '' ? Number(qty) : null;
  const isPreOrder = truthy(h.isPreOrder) || /pre[- ]?order/i.test(rawTextValue) || truthy(h.preorder);
  const explicitlyTemporarilyOut = /(temporarily out of stock|temporarily unavailable|notify me|stock for this item may return|restock|due back|temporarily unavailable)/i.test(rawTextValue);
  const explicitlySoldOut = /(sold out online|sold out|out of stock and is due to be removed from the webstore|not available|out of stock|currently unavailable)/i.test(rawTextValue) && !explicitlyTemporarilyOut;
  const explicitlyAvailable = /(in stock|available|back in stock|now available)/i.test(rawTextValue);
  const buyable = isBuyable(h) || truthy(h.isAvailable) || truthy(h.avail);
  const stockFalse = falsey(h.isInStock) || falsey(h.inStock) || falsey(h.isOrderable) || falsey(h.orderable) || falsey(h.purchasable) || falsey(h.canAddToCart) || falsey(h.isAvailable) || falsey(h.avail) || truthy(h.addToCartDisabled);

  if (explicitlyTemporarilyOut && !explicitlySoldOut && !stockFalse) {
    return { key: 'temporarily-out-of-stock', label: 'Temporarily out of stock', color: '#f39c12', soldOut: true, available: false, message: 'Temporarily out of stock' };
  }

  if (explicitlySoldOut || stockFalse || (numericQty !== null && numericQty <= 0)) {
    return { key: 'sold-out-online', label: 'Sold out online', color: '#e74c3c', soldOut: true, available: false, message: 'Sold out online' };
  }

  if (isPreOrder) {
    return { key: 'preorder', label: 'Pre-order', color: '#3498db', soldOut: false, available: false, message: 'Pre-order' };
  }

  if (explicitlyAvailable || buyable) {
    return { key: 'available', label: 'Available', color: '#2ecc71', soldOut: false, available: true, message: 'Available' };
  }

  return { key: 'unknown', label: 'Unknown', color: '#8a7f6e', soldOut: false, available: false, message: 'Unknown' };
}

function getTransitionMessage(prevState, currState) {
  const prevKey = prevState?.key || prevState;
  const currKey = currState?.key || currState;
  const map = {
    'preorder:available': 'Pre-order → Available',
    'available:sold-out-online': 'In stock → Sold out online',
    'available:temporarily-out-of-stock': 'In stock → Temporarily out of stock',
    'sold-out-online:available': 'Sold out online → Back in stock',
    'temporarily-out-of-stock:available': 'Temporarily out of stock → Back in stock',
    'preorder:sold-out-online': 'Pre-order → Sold out online',
    'preorder:temporarily-out-of-stock': 'Pre-order → Temporarily out of stock',
    'sold-out-online:temporarily-out-of-stock': 'Sold out online → Temporarily out of stock',
    'temporarily-out-of-stock:sold-out-online': 'Temporarily out of stock → Sold out online',
  };
  return map[`${prevKey}:${currKey}`] || `${prevState?.label || prevKey || 'Unknown'} → ${currState?.label || currKey || 'Unknown'}`;
}

function normalizeImage(h) {
  const candidate = pickFirst(
    h.imageUrl,
    h.image_url,
    typeof h.image === 'string' ? h.image : null,
    h.image?.url,
    h.images?.[0]?.url,
    h.images?.[0],
    h.media?.[0]?.url,
    h.media?.[0]?.src
  );
  if (!candidate) return null;
  if (String(candidate).startsWith('//')) return 'https:' + candidate;
  if (String(candidate).startsWith('/')) return 'https://www.warhammer.com' + candidate;
  return String(candidate);
}

function formatPrice(value) {
  if (value == null) return '—';
  const numeric = parseFloat(String(value).replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) ? `€${numeric.toFixed(2)}` : String(value);
}

function rawText(value) {
  if (Array.isArray(value)) return rawText(value[0]);
  if (value && typeof value === 'object') return rawText(value.name || value.label || value.value || value.title);
  return value == null ? '' : String(value).trim();
}

function cleanKey(value) {
  return rawText(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&amp;/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeFormat(value, ...hints) {
  const key = cleanKey([value, ...hints].filter(Boolean).join(' '));
  if (!key) return '';
  if (key.includes('special edition') || key.includes('limited edition') || key.includes('collectors edition') || key.includes('collector s edition')) return 'special-edition';
  if (key.includes('hardback') || key.includes('hardcover')) return 'hardback';
  if (key.includes('paperback') || key.includes('softback')) return 'paperback';
  if (key.includes('ebook') || key.includes('e book') || key.includes('digital')) return 'ebook';
  if (key.includes('audio')) return 'audiobook';
  if (key.includes('box') || key.includes('set')) return 'boxed-set';
  return key.replace(/\s+/g, '-');
}

function normalizeLanguage(value, title = '', url = '') {
  const explicit = cleanKey(value);
  const text = cleanKey([title, url].filter(Boolean).join(' '));
  const source = explicit && !['english', 'eng', 'en'].includes(explicit) ? explicit : `${text} ${explicit}`;
  if (/\b(deutsch|german|deu|ger|de)\b/.test(source) || /-deu?tsch|-ger|-de-/.test(source)) return 'de';
  if (/\b(francais|french|fra|fre|fr)\b/.test(source) || /-francais|-fra|-fre|-fr-/.test(source)) return 'fr';
  if (/\b(espanol|spanish|spa|esp|es)\b/.test(source) || /-spa|-esp|-es-/.test(source)) return 'es';
  if (/\b(italian|italiano|ita|it)\b/.test(source) || /-ita|-it-/.test(source)) return 'it';
  if (/\b(polish|polski|polaco|pol|pl)\b/.test(source) || /-pol|-pl-/.test(source)) return 'pl';
  if (/\b(portuguese|portugues|por|pt)\b/.test(source) || /-por|-pt-/.test(source)) return 'pt';
  if (/\b(english|anglais|ingles|eng|en)\b/.test(source) || /-eng|-en-/.test(source)) return 'en';
  return explicit.length === 2 ? explicit : '';
}

function normalizeUrl(path) {
  if (!path) return null;
  const value = String(path);
  if (value.startsWith('http')) return value.replace(/(warhammer\.com\/en-[a-z]{2}\/)(?!shop\/)/i, '$1shop/');
  const clean = value.replace(/^\/+/, '');
  if (clean.includes('/shop/')) return `https://www.warhammer.com/${clean}`;
  if (clean.startsWith('en-')) return `https://www.warhammer.com/${clean.replace(/^(en-[a-z]{2})\//i, '$1/shop/')}`;
  return `https://www.warhammer.com/en-EU/shop/${clean}`;
}

function normalizeBook(h) {
  const availabilityState = normalizeAvailabilityState(h);
  const preorder = availabilityState.key === 'preorder';
  const available = availabilityState.available;
  const price = pickFirst(h.salePrice, h.price);
  const title = h.name || h.title || '—';
  const url = pickFirst(h.url, h.slug, h.productUrl, h.canonicalUrl, h.path);
  const format = normalizeFormat(pickFirst(h.format, h.bookFormat, h.productFormat), title, url);
  return {
    id:                  h.productCode || h.objectID,
    title,
    price:               formatPrice(price),
    lang:                normalizeLanguage(h.language, title, url),
    type:                h.productType || 'book',
    format,
    avail:               available,
    preorder,
    image:               normalizeImage(h),
    url:                 normalizeUrl(url),
    range:               h.range || null,
    availabilityState:   availabilityState.key,
    availabilityLabel:   availabilityState.label,
    availabilityColor:   availabilityState.color,
    availabilityMessage: availabilityState.message,
  };
}

async function fetchBooks(tab) {
  const facetFilters = tab === 'preorder'
    ? [['isPreOrder:true'], ['productType:book']]
    : [['productType:book']];
  const allHits = [];
  let page = 0;
  let nbPages = 1;

  do {
    const data = await algoliaQuery(facetFilters, page);
    const hits = data.hits || data.results?.[0]?.hits || [];
    allHits.push(...hits);
    nbPages = Math.min(data.nbPages || data.results?.[0]?.nbPages || 1, 20);
    page += 1;
  } while (page < nbPages);

  const seen = new Set();
  const books = allHits.map(normalizeBook).filter(b => {
    if (!b.id || seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });

  if (!books.length) throw new Error('Sem hits');
  return books;
}

// ─── NOTIFICAÇÕES ───────────────────────────────────────
function buildEmailHtml(alerts) {
  const rows = alerts.map(b => {
    const url = b.url ? (b.url.startsWith('http') ? b.url : `https://www.warhammer.com/en-EU/${b.url}`) : null;
    return `<tr style="border-bottom:1px solid #2a2a2a">
      <td style="padding:12px;color:#e8dcc8;font-size:14px">
        <strong>${b.title}</strong>
        ${b.range ? `<br><span style="color:#8a7f6e;font-size:12px">${b.range}</span>` : ''}
        ${b.format ? `<br><span style="color:#6b6358;font-size:11px">${b.format}</span>` : ''}
        <br><span style="color:${b.availabilityColor || '#c9a84c'};font-size:11px;font-weight:600">${b.transitionMessage || 'Availability changed'}</span>
      </td>
      <td style="padding:12px;color:#c9a84c;font-weight:bold">${b.price}</td>
      <td style="padding:12px">
        ${url ? `<a href="${url}" style="background:#c9a84c;color:#000;padding:6px 14px;border-radius:4px;text-decoration:none;font-size:12px;font-weight:bold">Comprar →</a>` : '—'}
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><body style="background:#111;margin:0;padding:20px;font-family:sans-serif">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;border:1px solid #c9a84c;border-radius:8px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0a0a0a,#1a0800);padding:24px;border-bottom:2px solid #c9a84c">
    <h1 style="color:#c9a84c;margin:0;font-size:22px">⚙ Biblioteca Imperial</h1>
    <p style="color:#8a7f6e;margin:6px 0 0;font-size:13px">
      ${alerts.length} livro(s) que estavas a vigiar mudaram de estado.
    </p>
  </div>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#0d0d0d">
      <th style="padding:10px 12px;color:#8a7f6e;font-size:11px;text-align:left;text-transform:uppercase">Título</th>
      <th style="padding:10px 12px;color:#8a7f6e;font-size:11px;text-align:left;text-transform:uppercase">Preço</th>
      <th style="padding:10px 12px;color:#8a7f6e;font-size:11px;text-align:left;text-transform:uppercase">Link</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="padding:16px;background:#0d0d0d;border-top:1px solid #222">
    <p style="color:#5a5248;font-size:11px;margin:0">WH40K Biblioteca Imperial Watcher</p>
  </div>
</div></body></html>`;
}

function sendEmail(subject, htmlBody) {
  if (!CONFIG.emailEnabled || !CONFIG.emailUser || !CONFIG.emailTo) return Promise.resolve();

  const message = [
    `From: WH40K Watcher <${CONFIG.emailUser}>`,
    `To: ${CONFIG.emailTo}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    '', htmlBody
  ].join('\r\n');

  return new Promise(resolve => {
    const { execFile } = require('child_process');
    execFile('curl', [
      '--url', `smtps://${CONFIG.emailHost}:${CONFIG.emailPort}`,
      '--ssl-reqd',
      '--mail-from', CONFIG.emailUser,
      '--mail-rcpt', CONFIG.emailTo,
      '--user', `${CONFIG.emailUser}:${CONFIG.emailPass}`,
      '-T', '-', '--silent',
    ], { input: message, timeout: 15000 }, (err) => {
      if (err) log('[Email] Erro: ' + err.message);
      else     log(`[Email] Enviado para ${CONFIG.emailTo}`);
      resolve();
    });
  });
}

function sendDiscord(alerts) {
  if (!CONFIG.discordEnabled || !CONFIG.discordWebhook) {
    log('[Discord] Notificação ignorada (configuração incompleta)');
    return Promise.resolve();
  }

  const embeds = alerts.slice(0, 10).map(b => {
    const url = b.url ? (b.url.startsWith('http') ? b.url : `https://www.warhammer.com/en-EU/shop/${b.url}`) : null;
    const colorHex = b.availabilityColor || '#2ecc71';
    const colorNumerical = parseInt(colorHex.replace('#', ''), 16);
    return {
      title: b.title,
      description: [
        b.range  ? `📚 **Série:** ${b.range}`   : null,
        b.format ? `📖 **Formato:** ${b.format}` : null,
        `🔄 **Transição:** ${b.transitionMessage || 'Availability changed'}`,
        `💶 **Preço:** ${b.price}`,
        url ? `🔗 **[Comprar agora](${url})**` : null,
        b.image ? `![image](${b.image})` : null
      ].filter(Boolean).join('\n'),
      color: Number.isNaN(colorNumerical) ? 0x2ecc71 : colorNumerical,
      timestamp: new Date().toISOString(),
    };
  });

  const payload = JSON.stringify({
    username:   '⚙ Biblioteca Imperial',
    content:    `🚨 **${alerts.length} livro(s) mudaram de estado:**\n${alerts.map(b => `- ${b.title}: ${b.transitionMessage || 'Availability changed'}`).join('\n')}`,
    embeds,
  });

  return new Promise(resolve => {
    const wh = new URL(CONFIG.discordWebhook);
    const options = {
      hostname: wh.hostname,
      path:     wh.pathname + wh.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = https.request(options, res => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300)
        log(`[Discord] Notificação enviada`);
      else
        log(`[Discord] Erro HTTP ${res.statusCode}`);
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
  log(`[Notify] Transições: ${alerts.map(b => `${b.title} (${b.transitionMessage})`).join(', ')}`);
  const subject = `📦 WH40K — ${alerts.length} livro(s) mudaram de estado`;
  await Promise.all([
    sendEmail(subject, buildEmailHtml(alerts)).catch(e => log('[Email] ' + e.message)),
    sendDiscord(alerts).catch(e => log('[Discord] ' + e.message)),
  ]);
}

// ─── WATCHER ────────────────────────────────────────────
let watcherTimers = {};

function scheduleWatcherLoop(key, fn, intervalMs, retryMs = 30000) {
  if (watcherTimers[key]) clearTimeout(watcherTimers[key]);
  const run = async () => {
    try {
      await fn();
      watcherTimers[key] = setTimeout(run, intervalMs);
    } catch (err) {
      log(`[Watcher/${key}] Erro: ${err.message}`);
      watcherTimers[key] = setTimeout(run, retryMs);
    }
  };
  watcherTimers[key] = setTimeout(run, intervalMs);
}

async function checkWatched() {
  if (!state.watched.length) return;
  log(`[Watcher] A verificar ${state.watched.length} livro(s)...`);
  try {
    const books = await fetchBooks('all');
    latestCatalog.all = books;
    const alerts = [];
    for (const book of books) {
      state.lastSeen[book.id] = book;
      if (state.watched.includes(book.id)) {
        recordHistory(book);
        const prevStatus = state.lastStatus[book.id];
        const currStatus = {
          key: book.availabilityState || 'unknown',
          label: book.availabilityLabel || 'Unknown',
          color: book.availabilityColor || '#8a7f6e',
          soldOut: Boolean(book.availabilityState && book.availabilityState !== 'available' && book.availabilityState !== 'preorder'),
          available: Boolean(book.avail),
        };
        const prevKey = prevStatus?.key || prevStatus;
        const currKey = currStatus.key;
        const shouldNotify = prevKey && prevKey !== currKey && prevKey !== undefined && currKey !== undefined;
        if (shouldNotify) {
          alerts.push({ ...book, transitionMessage: getTransitionMessage(prevStatus, currStatus) });
        }
        state.lastStatus[book.id] = currStatus;
      }
    }
    saveState();
    if (alerts.length) await notify(alerts);
  } catch(e) { log('[Watcher] Erro: ' + e.message); throw e; }
}

async function checkPreorders() {
  try {
    const books = await fetchBooks('preorder');
    latestCatalog.preorder = books;
    books.forEach(b => { state.lastSeen[b.id] = b; });
    saveState();
  } catch(e) { log('[Watcher/Preorder] Erro: ' + e.message); throw e; }
}

function startWatcher() {
  Object.values(watcherTimers).forEach(clearTimeout);
  log(`[Watcher] Intervalos — vigiados: ${CONFIG.intervalWatched}min, pré-encomendas: ${CONFIG.intervalPreorder}min`);
  scheduleWatcherLoop('watched', checkWatched, CONFIG.intervalWatched * 60 * 1000);
  scheduleWatcherLoop('preorders', checkPreorders, CONFIG.intervalPreorder * 60 * 1000);
  checkWatched().catch(() => {});
  checkPreorders().catch(() => {});
}

// ─── HTTP SERVER ────────────────────────────────────────
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${CONFIG.port}`);

  // ── Frontend ──
  if (url.pathname === '/' || url.pathname === '/index.html') {
    try {
      const html = fs.readFileSync(FRONTEND_FILE);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch(e) {
      res.writeHead(404); res.end('index.html não encontrado em ' + FRONTEND_FILE);
    }
    return;
  }

  // ── API ──
  if (url.pathname === '/health') {
    return json(res, 200, {
      ok: true,
      watched: state.watched.length,
      intervals: { watched: CONFIG.intervalWatched, preorder: CONFIG.intervalPreorder },
      notifications: { email: CONFIG.emailEnabled, discord: CONFIG.discordEnabled },
      time: new Date().toISOString(),
    });
  }

  if (url.pathname === '/books' && req.method === 'GET') {
    try {
      const tab = url.searchParams.get('tab') || 'all';
      const cached = tab === 'preorder' ? latestCatalog.preorder : latestCatalog.all;
      const hits = cached.length ? cached : await fetchBooks(tab);
      if (tab === 'preorder') latestCatalog.preorder = hits; else latestCatalog.all = hits;
      return json(res, 200, { hits });
    } catch(e) { return json(res, 500, { error: e.message }); }
  }

  if (url.pathname === '/watched') {
    if (req.method === 'GET') {
      return json(res, 200, { watched: state.watched, lastStatus: state.lastStatus, lastSeen: state.lastSeen });
    }
    if (req.method === 'POST') {
      try {
        const body = await readBody(req);
        if (!Array.isArray(body.watched)) return json(res, 400, { error: 'watched deve ser array' });
        state.watched = body.watched;
        saveState();
        log(`[API] Watched atualizado: ${state.watched.length} livros`);
        return json(res, 200, { ok: true });
      } catch(e) { return json(res, 400, { error: e.message }); }
    }
  }

  if (url.pathname === '/config' && req.method === 'POST') {
    CONFIG = loadConfig();
    startWatcher();
    return json(res, 200, { ok: true });
  }

  if (url.pathname.startsWith('/history/') && req.method === 'GET') {
    const id = decodeURIComponent(url.pathname.slice('/history/'.length));
    const entries = (state.history[id] || []).filter(entry => Date.now() - new Date(entry.ts).getTime() <= 7 * 24 * 60 * 60 * 1000);
    return json(res, 200, { id, history: entries });
  }

  if (url.pathname === '/test-notify' && req.method === 'POST') {
    await notify([{
      id: 'TEST', title: "Horus Rising (Collector's Edition) — TESTE",
      price: '€45.00', range: 'Horus Heresy', format: 'Hardback',
      url: 'https://www.warhammer.com/en-EU/shop/black-library-novels',
    }]);
    return json(res, 200, { ok: true });
  }

  json(res, 404, { error: 'Not found' });
});

// ─── BOOT ───────────────────────────────────────────────
if (require.main === module) {
  loadState();
  startWatcher();
  server.listen(CONFIG.port, () => {
    log(`[Server] A correr em http://localhost:${CONFIG.port}`);
    log(`[Server] Frontend: ${FRONTEND_FILE}`);
    log(`[Server] Email: ${CONFIG.emailEnabled ? CONFIG.emailTo : 'desativado'}`);
    log(`[Server] Discord: ${CONFIG.discordEnabled ? 'ativado' : 'desativado'}`);
  });

  process.on('SIGTERM', () => { saveState(); process.exit(0); });
  process.on('SIGINT',  () => { saveState(); process.exit(0); });
}

module.exports = {
  normalizeAvailabilityState,
  getTransitionMessage,
};
