// Token di stile della v5, ripresi dal prototipo della Fase 0 (docs/prototipo-v5.html): "lavagna del bar".
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lav: { DEFAULT: '#17201c', 2: '#1f2a25', 3: '#2a3731', 4: '#3a4a42' }, // fondi, dal più scuro
        gesso: { DEFAULT: '#ece8dc', dim: '#a3ada5' }, // testo e testo secondario
        ambra: { DEFAULT: '#f0a83a', ink: '#2a1a04' }, // azione principale e testo sopra
        rosso: '#e8705b', // tavolo occupato, eliminazioni, errori
        verde: '#6cc28a', // modalità TUTTI, resto, conferme
        carta: '#fdfcf8', // anteprima del report
        inchiostro: '#1c1f1d',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'], // numeri, prezzi, titoli
        body: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
