// Chiusura cassa in tre passi (D12), fondo manuale, archivio delle chiusure (D14).
import type { Page } from '@playwright/test';
import type { Chiusura, Voce } from '../src/dominio/tipi';
import { digitaPin, expect, PIN, preparaStato, statoSalvato, test } from './supporto';

const voce = (nome: string, prezzo: number, qta: number, socio = ''): Voce => ({ id: nome + socio, prodottoId: null, nome, prezzo, qta, socio });

/** Fondo € 50, due vendite (€ 17,80), conto aperto al Tavolo 5 con Luca seduto. */
const SERATA = {
  fondo: 5000,
  vendite: [
    { id: 'b', ora: '22:10', tavolo: 'Tavolo 1' as const, pagatoDa: 'Luca', voci: [voce('Dreher 66 cl', 200, 4, 'Luca')], totale: 800 },
    { id: 'a', ora: '21:30', tavolo: 'Banco' as const, pagatoDa: 'Intero tavolo', voci: [voce('Caffè', 100, 2), voce('Amaro', 390, 2)], totale: 980 },
  ],
  contiAperti: [{ id: 'k5', tavolo: 'Tavolo 5' as const, ora: '22:05', voci: [voce('Coca Cola', 150, 2, 'Luca')] }],
  seduti: { 'Tavolo 5': ['Luca'] },
};

const chiusura = (id: string, data: string, vendite: Chiusura['vendite']): Chiusura => ({
  id, data, ora: '23:50', cassiere: 'Marco', fondoIniziale: 5000, incassato: 1000, consegnato: 1000,
  causale: '', fondoSuccessivo: 5000, creditiCreati: 0, vendite,
});

async function apriGestione(page: Page, voce: 'chiusura' | 'archivio') {
  await page.click('[data-testid=nav-gestione]');
  await digitaPin(page, PIN);
  await page.click(`[data-testid=voce-${voce}]`);
}

const tasti = async (page: Page, cifre: string) => {
  for (const t of cifre) await page.getByTestId('foglio-fondo').locator(`[data-tasto="${t}"]`).click();
};

test('chiusura in tre passi: fondo modificato, consegna parziale, conti → crediti, tavoli liberi, report', async ({ app }) => {
  const { page } = app;
  await preparaStato(page, SERATA);
  await apriGestione(page, 'chiusura');

  // 1. Riepilogo
  await expect(page.getByTestId('riepilogo-fondo')).toHaveText('€ 50,00');
  await expect(page.getByTestId('riepilogo-incassato')).toHaveText('€ 17,80');
  await expect(page.getByTestId('riepilogo-in-cassa')).toHaveText('€ 67,80');
  await expect(page.getByTestId('nota-conti')).toHaveText('1 conto aperto (Tavolo 5) passerà nei crediti e i tavoli verranno liberati.');
  await page.click('[data-testid=modifica-fondo]');
  await expect(page.getByTestId('imposta-fondo')).toBeDisabled();
  await tasti(page, '40');
  await expect(page.getByTestId('nuovo-fondo')).toHaveText('€ 40,00');
  await page.click('[data-testid=imposta-fondo]');
  await expect(page.getByTestId('avviso')).toHaveText('Fondo cassa impostato a € 40,00.');
  await expect(page.getByTestId('riepilogo-in-cassa')).toHaveText('€ 57,80');
  await page.click('[data-testid=avanti]');

  // 2. Consegna: un importo non valido blocca l'avanzamento
  await page.fill('[data-testid=cassiere]', ' Paolo ');
  await expect(page.getByTestId('consegnato')).toHaveAttribute('placeholder', /€\s17,80 \(tutto l'incasso\)/);
  await page.fill('[data-testid=consegnato]', 'dieci');
  await expect(page.getByTestId('avanti')).toBeDisabled();
  await expect(page.getByRole('alert')).toHaveText('Scrivi un importo, per esempio 50 oppure 42,50.');
  await page.fill('[data-testid=consegnato]', '10');
  await page.fill('[data-testid=causale]', 'Consegna serata');
  await page.click('[data-testid=avanti]');

  // 3. Conferma
  await expect(page.getByTestId('riepilogo-consegnato')).toHaveText('€ 10,00');
  await expect(page.getByTestId('fondo-domani')).toHaveText('€ 47,80');
  await page.click('[data-testid=registra-chiusura]');

  const finestra = page.getByRole('alertdialog', { name: 'Chiusura registrata' });
  await expect(finestra).toContainText('1 conto aperto è passato nei crediti. I tavoli sono liberi.');
  await expect(finestra).toContainText('Consegnato al presidente: € 10,00.');
  await expect(finestra).toContainText('Nuovo fondo cassa: € 47,80.');
  await finestra.getByRole('button', { name: 'Stampa report' }).click();

  const report = page.getByTestId('report');
  await expect(report).toContainText('Chiusura cassa');
  await expect(report.locator('tr', { hasText: 'Cassiere' })).toContainText('Paolo');
  await expect(report.locator('tr', { hasText: 'Fondo cassa per il giorno dopo' })).toContainText('€ 47,80');
  await expect(report.locator('tr', { hasText: 'Conti passati nei crediti' })).toContainText('1');
  await expect(report.locator('[data-riga-vendita]')).toHaveCount(2);
  await expect(report.locator('[data-riga-vendita]').first()).toContainText('2× Caffè, 2× Amaro');
  await page.click('[data-testid=stampa]');
  expect(await app.stampe()).toBe(1);
  await page.getByTestId('foglio-report').getByRole('button', { name: 'Chiudi' }).click();

  // Dopo: menu della Gestione, dati aggiornati
  await expect(page.getByTestId('gestione-menu')).toBeVisible();
  const s = await statoSalvato(page);
  expect(s.fondo).toBe(4780);
  expect(s.vendite).toEqual([]);
  expect(s.contiAperti).toEqual([]);
  expect(s.seduti).toEqual({});
  expect(s.crediti.map(c => [c.tavolo, c.ora])).toEqual([['Tavolo 5', '22:05']]);
  expect(s.chiusure).toHaveLength(1);
  expect(s.chiusure[0]).toMatchObject({ cassiere: 'Paolo', fondoIniziale: 4000, incassato: 1780, consegnato: 1000, causale: 'Consegna serata', fondoSuccessivo: 4780, creditiCreati: 1 });

  await page.click('[data-testid=voce-archivio]');
  await expect(page.locator('[data-chiusura]')).toHaveCount(1);
  await expect(page.locator('[data-chiusura]')).toContainText('2 vendite archiviate · 1 credito creato');

  await page.click('[data-testid=nav-storico]');
  await expect(page.getByTestId('riepilogo-fondo')).toHaveText('€ 47,80');
  await expect(page.getByTestId('riepilogo-incassato')).toHaveText('€ 0,00');
  await page.click('[data-testid=nav-cassa]');
  await expect(page.locator('[data-tavolo="Tavolo 5"]')).not.toHaveAttribute('data-occupato');
  await expect(page.getByTestId('badge-conti')).toHaveCount(0);
  await expect(page.getByTestId('badge-crediti')).toHaveText('1');
});

test('consegna vuota = tutto l\'incasso; "Non ora" non apre il report', async ({ app }) => {
  const { page } = app;
  await preparaStato(page, { ...SERATA, contiAperti: [], seduti: {} });
  await apriGestione(page, 'chiusura');
  await expect(page.getByTestId('nota-conti')).toHaveCount(0);
  await page.click('[data-testid=avanti]');
  await page.click('[data-testid=avanti]');
  await expect(page.getByTestId('riepilogo-consegnato')).toHaveText('€ 17,80');
  await expect(page.getByTestId('fondo-domani')).toHaveText('€ 50,00');
  await page.click('[data-testid=registra-chiusura]');
  await expect(page.getByRole('alertdialog')).toContainText('Nessun conto aperto. I tavoli sono liberi.');
  await page.getByRole('button', { name: 'Non ora' }).click();
  await expect(page.getByTestId('foglio-report')).toHaveCount(0);
  expect((await statoSalvato(page)).chiusure[0]).toMatchObject({ cassiere: '', consegnato: 1780, causale: '' });
});

test('Azzera il fondo con conferma; consegnato oltre il contante: fondo per domani zero', async ({ app }) => {
  const { page } = app;
  await preparaStato(page, SERATA);
  await apriGestione(page, 'chiusura');
  await page.click('[data-testid=modifica-fondo]');
  await page.click('[data-testid=azzera-fondo]');
  const conferma = page.getByRole('alertdialog', { name: 'Azzerare il fondo cassa?' });
  await expect(conferma).toContainText('Il fondo passa da € 50,00 a € 0,00.');
  await conferma.getByRole('button', { name: 'Annulla' }).click();
  await expect(page.getByTestId('riepilogo-fondo')).toHaveText('€ 50,00');

  await page.click('[data-testid=modifica-fondo]');
  await page.click('[data-testid=azzera-fondo]');
  await page.click('[data-testid=conferma-si]');
  await expect(page.getByTestId('riepilogo-fondo')).toHaveText('€ 0,00');
  expect((await statoSalvato(page)).fondo).toBe(0);

  await page.click('[data-testid=avanti]');
  await page.fill('[data-testid=consegnato]', '100');
  await page.click('[data-testid=avanti]');
  await expect(page.getByRole('alert')).toContainText('il fondo per domani sarà zero');
  await expect(page.getByTestId('fondo-domani')).toHaveText('€ 0,00');
});

test('una chiusura a metà si perde cambiando sezione: nulla registrato', async ({ app }) => {
  const { page } = app;
  await preparaStato(page, SERATA);
  await apriGestione(page, 'chiusura');
  await page.click('[data-testid=avanti]');
  await page.fill('[data-testid=cassiere]', 'Paolo');
  await page.click('[data-testid=nav-cassa]');
  await page.click('[data-testid=nav-gestione]');
  await digitaPin(page, PIN);
  await expect(page.getByTestId('gestione-menu')).toBeVisible();
  await page.click('[data-testid=voce-chiusura]');
  await expect(page.getByTestId('modifica-fondo')).toBeVisible(); // di nuovo al passo 1
  expect((await statoSalvato(page)).chiusure).toEqual([]);
});

test('archivio: chiusura senza vendite archiviate, Report, Elimina con conferma', async ({ app }) => {
  const { page } = app;
  const vendita = { ora: '22:00', tavolo: 'Banco' as const, pagatoDa: 'Intero tavolo', totale: 1000, voci: [{ nome: 'Caffè', qta: 10, prezzo: 100, socio: '' }] };
  await preparaStato(page, { chiusure: [chiusura('k2', '10/11/2026', [vendita]), chiusura('k1', '03/11/2026', null)] });
  await apriGestione(page, 'archivio');

  const schede = page.locator('[data-chiusura]');
  await expect(schede).toHaveCount(2);
  await expect(schede.nth(1)).toContainText('Vendite non archiviate (versione precedente)');
  await schede.nth(1).getByRole('button', { name: 'Report' }).click();
  await expect(page.getByTestId('report')).toContainText('Dettaglio non disponibile');
  await page.getByTestId('foglio-report').getByRole('button', { name: 'Chiudi' }).click();

  await page.locator('[data-chiusura="10/11/2026"]').getByRole('button', { name: 'Elimina' }).click();
  const conferma = page.getByRole('alertdialog', { name: 'Eliminare la chiusura del 10/11?' });
  await expect(conferma).toContainText('Si perdono anche la vendita archiviata.');
  await conferma.getByRole('button', { name: 'Elimina' }).click();
  await expect(schede).toHaveCount(1);
  await expect(page.getByTestId('avviso')).toHaveText('Chiusura eliminata.');
  expect((await statoSalvato(page)).chiusure.map(c => c.id)).toEqual(['k1']);

  await page.click('[data-testid=torna-gestione]');
  await expect(page.getByTestId('voce-archivio')).toContainText('1 chiusura registrata');
});

test.describe('blocco automatico', () => {
  test.use({ orologioFinto: true });

  test('quando la Gestione si richiude, il report di una chiusura si chiude', async ({ app }) => {
    const { page } = app;
    await preparaStato(page, { chiusure: [chiusura('k1', '03/11/2026', [])] });
    await apriGestione(page, 'archivio');
    await page.locator('[data-chiusura]').getByRole('button', { name: 'Report' }).click();
    await expect(page.getByTestId('foglio-report')).toBeVisible();
    await page.clock.fastForward('02:10');
    await expect(page.getByTestId('foglio-report')).toHaveCount(0);
    await expect(page.getByTestId('gestione-bloccata')).toBeVisible();
  });
});

test('la chiusura avvisa delle voci battute e non salvate, che andrebbero perse', async ({ app }) => {
  const { page } = app;
  await preparaStato(page, { ...SERATA, comanda: { tavolo: 'Tavolo 3', voci: [voce('Caffè', 100, 2)] } });
  await apriGestione(page, 'chiusura');
  await expect(page.getByTestId('nota-non-salvate')).toHaveText(
    'La comanda del Tavolo 3 ha 2 articoli non salvati (€ 2,00): con la chiusura si perdono. Salvali dalla Cassa con "Salva conto" (diventeranno un credito) oppure incassali.');
  await page.click('[data-testid=avanti]');
  await page.click('[data-testid=avanti]');
  await expect(page.getByTestId('nota-non-salvate')).toBeVisible();
});
