// Build: src/orig.html (CDN + Babel nel browser) -> app offline in un unico file HTML
//   - index.html, manifest.webmanifest, sw.js, .nojekyll nella root del repo (pubblicati da GitHub Pages)
//   - dist/cassa_smart_bar_pub.html: stesso file, da aprire in locale o usare nei test
// Uso: CASSA_PIN=xxxx node build.mjs   (oppure: CASSA_PIN=xxxx npm run build)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';
import { createHash, randomBytes } from 'node:crypto';

const require = createRequire(import.meta.url);
const read = p => fs.readFileSync(p, 'utf8');
const src = read('src/orig.html');

// 1. Estrai il JSX dell'app e inserisci l'hash del PIN (CASSA_PIN, solo cifre: si digita col tastierino)
const pin = process.env.CASSA_PIN || '1234';
if (!/^\d{4,}$/.test(pin)) throw new Error('CASSA_PIN deve essere di almeno 4 cifre');
if (!process.env.CASSA_PIN) console.warn('ATTENZIONE: CASSA_PIN non impostato, uso il PIN predefinito 1234');
const pinSalt = randomBytes(16).toString('hex');
const pinHash = createHash('sha256').update(pinSalt + pin).digest('hex');
const jsx = src.match(/<script type="text\/babel">([\s\S]*?)<\/script>/)[1]
  .replace('__PIN_SALT__', pinSalt).replace('__PIN_HASH__', pinHash);

// 2. Sostituisci il componente Icon (lucide.createIcons manipola il DOM gestito da React)
//    con SVG inline generati solo per le icone usate
// Icone usate: <Icon name="X" /> scritte nel JSX, oppure icon: 'X' negli elenchi (es. barra delle schede)
const used = [...new Set([...jsx.matchAll(/(?:<Icon name="|\bicon: ')(\w+)/g)].map(m => m[1]))];
const { icons } = require('lucide');
const iconData = Object.fromEntries(used.map(n => {
  if (!icons[n]) throw new Error('Icona lucide mancante: ' + n);
  return [n, icons[n][2]]; // solo i figli dell'<svg>
}));
const iconComponent = `
        const ICONS = ${JSON.stringify(iconData)};
        function Icon({ name, className = "w-5 h-5" }) {
            const nodes = ICONS[name] || [];
            return React.createElement('svg', {
                xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none',
                stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
                className, 'aria-hidden': true
            }, nodes.map(([tag, attrs], i) => React.createElement(tag, { ...attrs, key: i })));
        }
`;
const iconRe = /function Icon\(\{[\s\S]*?\n        \}\n/;
if (!iconRe.test(jsx)) throw new Error('Componente Icon non trovato');
const appJsx = jsx.replace(iconRe, iconComponent);
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/app.jsx', appJsx);

// 3. Compila e minifica il JSX (React/ReactDOM restano globali UMD)
const appJs = esbuild.transformSync(appJsx, {
  loader: 'jsx', jsx: 'transform', minify: true, target: 'es2018', legalComments: 'none'
}).code;

// 4. Genera il CSS Tailwind con le sole classi usate
fs.writeFileSync('build/input.css', `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`);
fs.writeFileSync('build/tailwind.config.cjs', `module.exports = { content: ['./build/app.jsx'], theme: { extend: {} }, plugins: [] };\n`);
execFileSync('npx', ['tailwindcss', '-c', 'build/tailwind.config.cjs', '-i', 'build/input.css', '-o', 'build/tw.css', '--minify'], { stdio: 'inherit' });
const twCss = read('build/tw.css');

// 5. Font Inter (variabile, sottoinsieme latino) in base64
const font = fs.readFileSync('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2').toString('base64');
const fontCss = `@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:100 900;src:url(data:font/woff2;base64,${font}) format('woff2')}`;

// 6. Stili custom originali (senza @import di Google Fonts)
const customCss = src.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/@import[^;]+;/, '').trim().replace(/\s+/g, ' ');

const reactJs = read('node_modules/react/umd/react.production.min.js');
const reactDomJs = read('node_modules/react-dom/umd/react-dom.production.min.js');
const safe = s => s.replace(/<\/script/gi, '<\\/script');

const head = src.match(/<head>[\s\S]*?<title>.*?<\/title>/)[0].replace('<head>', '');
const bodyTag = src.match(/<body[^>]*>/)[0];

const out = `<!DOCTYPE html>
<html lang="it">
<head>${head}
<meta name="theme-color" content="#2563eb">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<style>${fontCss}${twCss}${customCss}</style>
</head>
${bodyTag}
<div id="root"></div>
<script>${safe(reactJs)}</script>
<script>${safe(reactDomJs)}</script>
<script>${safe(appJs)}</script>
<script>
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
</script>
</body>
</html>
`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/cassa_smart_bar_pub.html', out);

// 7. Sito per GitHub Pages (root del repo, branch main): PWA installabile, offline.
//    Le icone icon-192.png / icon-512.png sono già nella root e non vengono rigenerate.
fs.writeFileSync('index.html', out);
fs.writeFileSync('manifest.webmanifest', JSON.stringify({
  name: 'Cassa Smart Bar & Pub', short_name: 'Cassa', lang: 'it',
  start_url: './', scope: './', display: 'standalone',
  background_color: '#020617', theme_color: '#2563eb',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
}, null, 2) + '\n');
// La versione cambia a ogni build: il service worker aggiorna la cache
const version = createHash('sha256').update(out).digest('hex').slice(0, 12);
fs.writeFileSync('sw.js', `const CACHE = 'cassa-${version}';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Rete prima (per ricevere gli aggiornamenti), cache se offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request)
    .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
});
`);
fs.writeFileSync('.nojekyll', '');
for (const s of [192, 512]) if (!fs.existsSync(`icon-${s}.png`)) console.warn(`ATTENZIONE: icon-${s}.png mancante nella root`);
console.log('Icone:', used.join(', '));
console.log('Output:', (out.length / 1024).toFixed(0), 'KB -> index.html, dist/cassa_smart_bar_pub.html');
