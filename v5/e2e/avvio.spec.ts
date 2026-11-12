import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './supporto';

const PIN = process.env.CASSA_PIN ?? '1234';

test('l\'app parte senza errori e senza richieste di rete', async ({ app }) => {
  await expect(app.page.getByTestId('app')).toBeVisible();
  await expect(app.page.getByTestId('titolo')).toHaveText('Cassa v5');
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
  await expect(app.page.locator('[data-testid="app"] svg path').first()).toBeAttached();
});

for (const larghezza of [320, 360, 375, 768, 1024, 1280]) {
  test(`nessuno sforamento orizzontale a ${larghezza} px`, async ({ app }) => {
    await app.page.setViewportSize({ width: larghezza, height: 800 });
    const sfora = await app.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(sfora).toBe(false);
  });
}

test('il PIN non compare in chiaro nel bundle', () => {
  const cartella = join(import.meta.dirname, '..', 'dist', 'assets');
  const codice = readdirSync(cartella).filter(f => f.endsWith('.js')).map(f => readFileSync(join(cartella, f), 'utf8')).join('\n');
  for (const s of [`"${PIN}"`, `'${PIN}'`, `\`${PIN}\``]) expect(codice).not.toContain(s);
});
