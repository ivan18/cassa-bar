// Fixture comune a tutti i test: le stesse garanzie di tests/test_cassa.py della v4.2.
// - ogni test parte da un contesto nuovo (localStorage vuoto);
// - ogni richiesta fuori dal server locale viene bloccata e registrata: alla fine del test devono essere zero;
// - errori JavaScript e messaggi di errore in console fanno fallire il test;
// - window.print è sostituita da un contatore (la stampa vera bloccherebbe il browser).
import { test as base, expect, type Page } from '@playwright/test';

declare global {
  interface Window { __stampe: number }
}

export type App = {
  page: Page;
  esterne: string[];
  errori: string[];
  stampe: () => Promise<number>;
};

export const test = base.extend<{ app: App }>({
  app: async ({ page, baseURL }, use) => {
    const origine = new URL(baseURL ?? 'http://localhost/').origin;
    const esterne: string[] = [];
    const errori: string[] = [];

    await page.addInitScript(() => {
      window.__stampe = 0;
      window.print = () => { window.__stampe++; };
    });
    await page.route('**/*', rotta => {
      const url = rotta.request().url();
      if (url.startsWith(origine) || url.startsWith('data:') || url.startsWith('blob:')) return rotta.continue();
      esterne.push(url);
      return rotta.abort();
    });
    page.on('pageerror', e => errori.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });

    await page.goto('./');
    await use({ page, esterne, errori, stampe: () => page.evaluate(() => window.__stampe) });

    expect(esterne, 'richieste di rete verso l\'esterno').toEqual([]);
    expect(errori, 'errori JavaScript o in console').toEqual([]);
  },
});

export { expect };
