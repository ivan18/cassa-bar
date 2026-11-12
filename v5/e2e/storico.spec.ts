// Storico e report della serata.
import { batti, expect, preparaStato, siediSoci, test } from './supporto';
import type { Voce } from '../src/dominio/tipi';

const voce = (nome: string, prezzo: number, qta: number, socio = ''): Voce => ({ id: nome + socio, prodottoId: null, nome, prezzo, qta, socio });

test('le vendite incassate compaiono nello Storico, la più recente in alto, con chi ha pagato', async ({ app }) => {
  const { page } = app;
  await batti(page, 'Caffè', 2);
  await page.click('[data-testid=incassa]');
  await page.click('[data-testid=conferma-incasso]');
  await siediSoci(page, 'Tavolo 3', ['Andrea', 'Chiara']);
  await batti(page, 'Dreher 66 cl', 2, 'Andrea');
  await batti(page, 'Coca Cola', 1, 'Chiara');
  await page.click('[data-testid=incassa]');
  await page.locator('[data-preset="Andrea"]').click();
  await page.click('[data-testid=conferma-incasso]');

  await page.click('[data-testid=nav-storico]');
  const righe = page.locator('[data-vendita]');
  await expect(righe).toHaveCount(2);
  await expect(righe.first()).toHaveAttribute('data-vendita', 'Andrea');
  await expect(righe.first()).toContainText('Tavolo 3');
  await expect(righe.first()).toContainText('2× Dreher 66 cl (Andrea)');
  await expect(righe.first()).toContainText('€ 4,00');
  await expect(righe.nth(1)).toHaveAttribute('data-vendita', 'Intero tavolo');
  await expect(page.getByTestId('riepilogo-fondo')).toHaveText('€ 50,00');
  await expect(page.getByTestId('riepilogo-incassato')).toHaveText('€ 6,00');
  await expect(page.getByTestId('riepilogo-in-cassa')).toHaveText('€ 56,00');
});

test('Storico vuoto dopo l\'avvio', async ({ app }) => {
  const { page } = app;
  await page.click('[data-testid=nav-storico]');
  await expect(page.getByText('Nessuna vendita dall\'ultima chiusura.')).toBeVisible();
  await expect(page.getByTestId('riepilogo-incassato')).toHaveText('€ 0,00');
});

test('report della serata: totali, vendite in ordine, crediti; si stampa solo il report', async ({ app }) => {
  const { page } = app;
  await preparaStato(page, {
    fondo: 3000,
    vendite: [
      { id: 'b', ora: '22:10', tavolo: 'Tavolo 1', pagatoDa: 'Luca', voci: [voce('Dreher 66 cl', 200, 2, 'Luca')], totale: 400 },
      { id: 'a', ora: '21:30', tavolo: 'Banco', pagatoDa: 'Intero tavolo', voci: [voce('Caffè', 100, 1)], totale: 100 },
    ],
    crediti: [{ id: 'c1', tavolo: 'Tavolo 2', ora: '23:40', dataChiusura: '10/11', voci: [voce('Peroni 66 cl', 200, 1, 'Paolo')] }],
  });
  await page.click('[data-testid=nav-storico]');
  await page.click('[data-testid=report-serata]');

  const report = page.getByTestId('report');
  await expect(report).toContainText('Rendiconto della serata');
  for (const [k, v] of [['Fondo cassa iniziale', '€ 30,00'], ['Totale incassato', '€ 5,00'], ['Totale in cassa', '€ 35,00'], ['Crediti da incassare', '€ 2,00']]) {
    await expect(report.locator('tr', { hasText: k! })).toContainText(v!);
  }
  await expect(report.locator('[data-riga-vendita]').first()).toContainText('21:30'); // dalla più vecchia
  await expect(report).toContainText('Vendite (2)');
  await expect(report).toContainText('Crediti da incassare (1)');
  await expect(report).toContainText('1× Peroni 66 cl (Paolo)');

  await page.click('[data-testid=stampa]');
  expect(await app.stampe()).toBe(1);

  // In stampa si vede solo la copia del report, non l'app
  await expect(page.getByTestId('report-stampa')).toBeHidden();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByTestId('report-stampa')).toBeVisible();
  await expect(page.getByTestId('app')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });

  await page.getByTestId('foglio-report').getByRole('button', { name: 'Chiudi' }).click();
  await expect(page.getByTestId('foglio-report')).toHaveCount(0);
  await expect(page.getByTestId('report-stampa')).toHaveCount(0);
});
