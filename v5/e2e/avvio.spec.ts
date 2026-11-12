import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PIN, test, expect } from './supporto';

test('l\'app parte sulla Cassa, senza errori e senza richieste di rete', async ({ app }) => {
  await expect(app.page.getByTestId('app')).toBeVisible();
  await expect(app.page.getByTestId('nav-cassa')).toHaveAttribute('aria-current', 'page');
  await expect(app.page.locator('[data-tavolo="Banco"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(app.page).toHaveTitle('Cassa Smart Bar & Pub');
});

test('i caratteri sono quelli locali', async ({ app }) => {
  const caricati = await app.page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, ''));
  });
  expect(caricati).toContain('Inter Variable');
  expect(caricati).toContain('Barlow Condensed');
});

test('le icone sono SVG inline', async ({ app }) => {
  await expect(app.page.locator('[data-testid="nav-cassa"] svg path').first()).toBeAttached();
});

test('il PIN non compare in chiaro nel bundle', () => {
  const cartella = join(import.meta.dirname, '..', 'dist', 'assets');
  const codice = readdirSync(cartella).filter(f => f.endsWith('.js')).map(f => readFileSync(join(cartella, f), 'utf8')).join('\n');
  // confronto booleano: in caso di errore non si stampa l'intero bundle
  for (const s of [`"${PIN}"`, `'${PIN}'`, `\`${PIN}\``]) expect(codice.includes(s), `il bundle contiene ${s}`).toBe(false);
});
