// Larghezze da 320 a 1280 px: niente sforamenti, menu sempre completo, comanda nel posto giusto, fogli interi, report e chiusura.
import { batti, digitaPin, expect, PIN, siediSoci, test } from './supporto';

const sfora = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

for (const larghezza of [320, 360, 375, 768, 1024, 1280]) {
  test.describe(`${larghezza} px`, () => {
    test.use({ viewport: { width: larghezza, height: 800 } });

    test('Cassa con soci e voci, fogli, Conti', async ({ app }) => {
      const { page } = app;
      await siediSoci(page, 'Tavolo 3', ['Andrea', 'Chiara', 'Giuseppe', 'Matteo', 'Roberto']);
      await batti(page, 'Bavaria 66 cl', 2);
      await batti(page, 'Acqua 500 ml', 1, '');
      expect(await sfora(page)).toBe(false);

      for (const s of ['cassa', 'conti', 'storico', 'gestione']) await expect(page.getByTestId(`nav-${s}`)).toBeVisible();
      const tablet = larghezza >= 1024;
      await expect(page.locator('aside[aria-label=Comanda]')).toBeVisible({ visible: tablet });
      await expect(page.getByTestId('barra-comanda')).toBeVisible({ visible: !tablet });
      // ogni tavolo largo abbastanza per un dito
      for (const box of await page.locator('[data-tavolo]').evaluateAll(e => e.map(x => x.getBoundingClientRect().width))) expect(box).toBeGreaterThanOrEqual(44);

      for (const apri of ['apri-soci', 'apri-extra']) {
        await page.click(`[data-testid=${apri}]`);
        const foglio = page.getByRole('dialog');
        await expect(foglio.getByRole('button', { name: 'Chiudi' })).toBeInViewport();
        expect(await sfora(page)).toBe(false);
        await foglio.getByRole('button', { name: 'Chiudi' }).click();
      }
      if (!tablet) {
        await page.getByTestId('barra-comanda').getByRole('button', { name: /Apri la comanda/ }).click();
        await expect(page.getByTestId('foglio-comanda').getByRole('button', { name: 'Incassa' })).toBeInViewport();
        expect(await sfora(page)).toBe(false);
        await page.getByRole('button', { name: 'Chiudi' }).click();
      }
      // incasso: conferma sempre raggiungibile, niente sforamenti
      await page.locator('button:has-text("Incassa"):visible').first().click();
      await expect(page.getByTestId('conferma-incasso')).toBeInViewport();
      await expect(page.getByTestId('resto')).toBeInViewport(); // il resto si vede senza scorrere
      expect(await sfora(page)).toBe(false);
      await page.getByTestId('foglio-incasso').getByRole('button', { name: 'Chiudi' }).click();

      await page.locator('button:has-text("Salva"):visible').first().click();
      await page.click('[data-testid=nav-conti]');
      expect(await sfora(page)).toBe(false);
    });

    test('Storico, report, chiusura in tre passi, archivio', async ({ app }) => {
      const { page } = app;
      await batti(page, 'Caffè', 2);
      await page.locator('button:has-text("Incassa"):visible').first().click();
      await page.click('[data-testid=conferma-incasso]');
      await siediSoci(page, 'Tavolo 3', ['Andrea', 'Chiara']);
      await batti(page, 'Bavaria 66 cl', 2);
      await page.locator('button:has-text("Salva"):visible').first().click();

      await page.click('[data-testid=nav-storico]');
      expect(await sfora(page)).toBe(false);
      await page.click('[data-testid=report-serata]');
      await expect(page.getByTestId('stampa')).toBeInViewport();
      expect(await sfora(page)).toBe(false);
      await page.getByTestId('foglio-report').getByRole('button', { name: 'Chiudi' }).click();

      await page.click('[data-testid=nav-gestione]');
      await digitaPin(page, PIN);
      await page.click('[data-testid=voce-chiusura]');
      await page.click('[data-testid=modifica-fondo]');
      await expect(page.getByTestId('imposta-fondo')).toBeInViewport();
      await expect(page.getByTestId('azzera-fondo')).toBeInViewport();
      expect(await sfora(page)).toBe(false);
      await page.getByTestId('foglio-fondo').getByRole('button', { name: 'Chiudi' }).click();
      for (const passo of ['avanti', 'avanti', 'registra-chiusura']) {
        expect(await sfora(page)).toBe(false);
        await page.getByTestId(passo).scrollIntoViewIfNeeded();
        await page.click(`[data-testid=${passo}]`);
      }
      await page.getByRole('button', { name: 'Stampa report' }).click();
      await expect(page.getByTestId('stampa')).toBeInViewport();
      expect(await sfora(page)).toBe(false);
      await page.getByTestId('foglio-report').getByRole('button', { name: 'Chiudi' }).click();
      await page.click('[data-testid=voce-archivio]');
      expect(await sfora(page)).toBe(false);
    });
  });
}
