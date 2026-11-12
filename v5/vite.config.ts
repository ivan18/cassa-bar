// Build della v5. Il PIN della build (CASSA_PIN, solo cifre) entra nel bundle solo come salt + hash SHA-256.
// Uso: CASSA_PIN=xxxx npm run build   (senza CASSA_PIN vale il predefinito pubblico 1234)
import { createHash, randomBytes } from 'node:crypto';
import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import tailwindConfig from './tailwind.config.ts';

const pin = process.env.CASSA_PIN ?? '1234';
if (!/^\d{4,}$/.test(pin)) throw new Error('CASSA_PIN deve essere di almeno 4 cifre');
if (!process.env.CASSA_PIN) console.warn('ATTENZIONE: CASSA_PIN non impostato, uso il PIN predefinito 1234');
const pinSalt = randomBytes(16).toString('hex');
const pinHash = createHash('sha256').update(pinSalt + pin).digest('hex');

export default defineConfig({
  // percorsi relativi: il sito sta in una sottocartella di GitHub Pages
  base: './',
  define: {
    __PIN_SALT__: JSON.stringify(pinSalt),
    __PIN_HASH__: JSON.stringify(pinHash),
  },
  css: {
    postcss: { plugins: [tailwindcss(tailwindConfig)] },
  },
});
