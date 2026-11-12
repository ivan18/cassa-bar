// Fixture comune ai test nel browser: le stesse garanzie di tests/test_cassa.py della v4.2.
// - ogni test parte da un contesto nuovo (localStorage vuoto);
// - ogni richiesta fuori dal server locale viene bloccata e registrata: alla fine del test devono essere zero;
// - errori JavaScript e messaggi di errore in console fanno fallire il test;
// - window.print è sostituita da un contatore (la stampa vera bloccherebbe il browser);
// - con `test.use({ orologioFinto: true })` il tempo si controlla con page.clock (es. blocco della Gestione).
import { test as base, expect, type Page } from '@playwright/test';
import type { StatoDominio } from '../src/dominio/tipi';
import { CHIAVE_ARCHIVIO, statoIniziale, VERSIONE_ARCHIVIO } from '../src/stato/store';

declare global {
  interface Window { __stampe: number }
}

export const PIN = process.env.CASSA_PIN ?? '1234';
export const PIN_ERRATO = PIN === '0'.repeat(PIN.length) ? '9'.repeat(PIN.length) : '0'.repeat(PIN.length);

export type App = {
  page: Page;
  esterne: string[];
  errori: string[];
  stampe: () => Promise<number>;
};

export const test = base.extend<{ app: App; orologioFinto: boolean }>({
  orologioFinto: [false, { option: true }],
  app: async ({ page, baseURL, orologioFinto }, use) => {
    const origine = new URL(baseURL ?? 'http://localhost/').origin;
    const esterne: string[] = [];
    const errori: string[] = [];

    if (orologioFinto) await page.clock.install();
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

// ---------- aiuti ----------

/** La comanda visibile: pannello a destra da 1024 px, foglio su telefono. */
export const comanda = (page: Page) => page.locator('[data-testid=comanda]:visible');

export async function scegliTavolo(page: Page, tavolo: string) {
  await page.click(`[data-tavolo="${tavolo}"]`);
}

/** Sceglie il tavolo e ci fa sedere i soci indicati. */
export async function siediSoci(page: Page, tavolo: string, soci: string[]) {
  await scegliTavolo(page, tavolo);
  await page.click('[data-testid=apri-soci]');
  for (const s of soci) await page.click(`[data-socio-scelta="${s}"]`);
  await page.getByRole('button', { name: 'Fatto' }).click();
}

/** Batte un prodotto `volte` volte; `socio` undefined = lascia il socio attivo, '' = Generico. */
export async function batti(page: Page, prodotto: string, volte = 1, socio?: string) {
  if (socio !== undefined) await page.click(`[data-testid=chi-ordina] [data-socio="${socio}"]`);
  for (let i = 0; i < volte; i++) await page.click(`[data-prodotto="${prodotto}"]`);
}

export async function digitaPin(page: Page, pin: string) {
  for (const c of pin) await page.locator(`[data-tasto="${c}"]:visible`).first().click();
  await page.locator('[data-testid=accedi]:visible').click();
}

/** Dati salvati sul dispositivo. */
export async function statoSalvato(page: Page): Promise<StatoDominio> {
  const grezzo = await page.evaluate(k => localStorage.getItem(k), CHIAVE_ARCHIVIO);
  return (JSON.parse(grezzo ?? 'null') as { state: StatoDominio }).state;
}

/** Scrive dati di partenza sul dispositivo e ricarica l'app. */
export async function preparaStato(page: Page, parziale: Partial<StatoDominio>) {
  const valore = JSON.stringify({ state: { ...statoIniziale(), ...parziale }, version: VERSIONE_ARCHIVIO });
  await page.evaluate(([k, v]) => localStorage.setItem(k as string, v as string), [CHIAVE_ARCHIVIO, valore]);
  await page.reload();
}
