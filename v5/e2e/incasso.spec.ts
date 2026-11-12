import { batti, comanda, expect, preparaStato, scegliTavolo, siediSoci, statoSalvato, test } from './supporto';
import type { Page } from '@playwright/test';

const foglio = (page: Page) => page.getByTestId('foglio-incasso');
const dovuto = (page: Page) => page.getByTestId('da-incassare');
const tasto = (page: Page, t: string) => foglio(page).locator(`[data-tasto="${t}"]`).click();

/** Tavolo 3: Andrea 2 Dreher, Chiara 1 Coca Cola, 2 Salatini del Tavolo generico (€ 6,10). */
async function tavoloTre(page: Page) {
  await siediSoci(page, 'Tavolo 3', ['Andrea', 'Chiara']);
  await batti(page, 'Dreher 66 cl', 2, 'Andrea');
  await batti(page, 'Coca Cola', 1, 'Chiara');
  await batti(page, 'Salatini', 2, '');
}

test('si apre con tutto selezionato; Esatto, conferma, tavolo libero, vendita registrata', async ({ app }) => {
  const { page } = app;
  await tavoloTre(page);
  await page.click('[data-testid=incassa]');
  await expect(dovuto(page)).toHaveText('€ 6,10');
  await expect(foglio(page).locator('[data-preset="tutto"]')).toHaveAttribute('aria-pressed', 'true');
  await foglio(page).locator('[data-rapido="esatto"]').click();
  await expect(page.getByTestId('contante')).toHaveText('€ 6,10');
  await expect(page.getByTestId('resto')).toHaveText('€ 0,00');
  await page.click('[data-testid=conferma-incasso]');

  await expect(page.getByTestId('avviso')).toHaveText('Intero tavolo: incassati € 6,10');
  await expect(foglio(page)).toHaveCount(0);
  await expect(page.locator('[data-tavolo="Banco"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-tavolo="Tavolo 3"]')).not.toHaveAttribute('data-occupato');
  const s = await statoSalvato(page);
  expect(s.vendite.map(v => [v.pagatoDa, v.totale, v.tavolo])).toEqual([['Intero tavolo', 610, 'Tavolo 3']]);
  expect(s.seduti['Tavolo 3']).toEqual([]);
});

test('quota socio: paga solo Andrea, resto calcolato, Andrea esce dal tavolo', async ({ app }) => {
  const { page } = app;
  await tavoloTre(page);
  await page.click('[data-testid=incassa]');
  await foglio(page).locator('[data-preset="Andrea"]').click();
  await expect(dovuto(page)).toHaveText('€ 4,00');
  await expect(foglio(page).locator('[data-voce-incasso="Coca Cola"] [data-testid=quantita-scelta]')).toHaveText('0 di 1');
  await foglio(page).locator('[data-rapido="5"]').click();
  await expect(page.getByTestId('resto')).toHaveText('€ 1,00');
  await page.click('[data-testid=conferma-incasso]');

  await expect(page.getByTestId('avviso')).toHaveText('Andrea: incassati € 4,00 · resto € 1,00');
  await expect(page.locator('[data-testid=chi-ordina] [data-socio="Andrea"]')).toHaveCount(0);
  await expect(page.locator('[data-testid=chi-ordina] [data-socio="Chiara"]')).toBeVisible();
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 2,10');
  await expect(comanda(page).locator('[data-gruppo]')).toHaveCount(2);
});

test('selezione manuale: "Andrea (parziale)" e Andrea resta seduto', async ({ app }) => {
  const { page } = app;
  await tavoloTre(page);
  await page.click('[data-testid=incassa]');
  await foglio(page).locator('[data-preset="Andrea"]').click();
  await foglio(page).getByRole('button', { name: 'Paga un Dreher 66 cl in meno' }).click();
  await expect(page.getByTestId('selezione-manuale')).toBeVisible();
  await expect(dovuto(page)).toHaveText('€ 2,00');
  await page.click('[data-testid=conferma-incasso]');
  await expect(page.getByTestId('avviso')).toHaveText('Andrea (parziale): incassati € 2,00');
  await expect(page.locator('[data-testid=chi-ordina] [data-socio="Andrea"]')).toBeVisible();
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 4,10');
});

test('"Niente" azzera e disattiva la conferma; più soci insieme = "Parziale"', async ({ app }) => {
  const { page } = app;
  await tavoloTre(page);
  await page.click('[data-testid=incassa]');
  await foglio(page).locator('[data-preset="niente"]').click();
  await expect(dovuto(page)).toHaveText('€ 0,00');
  await expect(page.getByTestId('conferma-incasso')).toBeDisabled();
  await expect(page.getByTestId('conferma-incasso')).toHaveText('Seleziona cosa incassare');
  await foglio(page).getByRole('button', { name: 'Paga un Dreher 66 cl in più' }).click();
  await foglio(page).getByRole('button', { name: 'Paga un Coca Cola in più' }).click();
  await foglio(page).getByRole('button', { name: 'Paga un Coca Cola in più' }).click(); // oltre la quantità: resta 1
  await expect(foglio(page).locator('[data-voce-incasso="Coca Cola"] output')).toHaveText('1');
  await page.click('[data-testid=conferma-incasso]');
  await expect(page.getByTestId('avviso')).toHaveText('Parziale: incassati € 3,50');
});

test('contante dal tastierino: "Mancano" finché non basta, poi il resto', async ({ app }) => {
  const { page } = app;
  await batti(page, 'Dreher 66 cl', 3, '');
  await page.click('[data-testid=incassa]');
  for (const t of ['5', ',', '5']) await tasto(page, t);
  await expect(page.getByTestId('contante')).toHaveText('€ 5,50');
  await expect(page.getByTestId('resto')).toHaveText('€ 0,50');
  await expect(foglio(page).getByText('Mancano')).toBeVisible();
  await tasto(page, '⌫'); await tasto(page, '⌫'); await tasto(page, '⌫'); await tasto(page, '7');
  await expect(page.getByTestId('resto')).toHaveText('€ 1,00');
  await expect(foglio(page).getByText('Resto')).toBeVisible();
});

test('× chiude senza incassare; toccare fuori non chiude', async ({ app }) => {
  const { page } = app;
  await batti(page, 'Caffè');
  await page.click('[data-testid=incassa]');
  await page.mouse.click(5, 5);
  await expect(foglio(page)).toBeVisible();
  await foglio(page).getByRole('button', { name: 'Chiudi' }).click();
  await expect(foglio(page)).toHaveCount(0);
  expect((await statoSalvato(page)).vendite).toEqual([]);
});

test('da un conto aperto: incasso completo, il conto sparisce', async ({ app }) => {
  const { page } = app;
  await scegliTavolo(page, 'Tavolo 5');
  await batti(page, 'Caffè', 3);
  await page.click('[data-testid=salva-conto]');
  await page.click('[data-testid=nav-conti]');
  await page.locator('[data-conto="Tavolo 5"]').getByRole('button', { name: 'Incassa' }).click();
  await expect(foglio(page)).toHaveAccessibleName('Incasso · Tavolo 5');
  await expect(dovuto(page)).toHaveText('€ 3,00');
  await page.click('[data-testid=conferma-incasso]');
  await expect(page.locator('[data-conto]')).toHaveCount(0);
  await expect(page.getByTestId('badge-conti')).toHaveCount(0);
});

test('da un credito: incasso parziale ("Credito del gg/mm"), poi il saldo', async ({ app }) => {
  const { page } = app;
  const voce = (id: string, nome: string, prezzo: number, qta: number, socio: string) => ({ id, prodottoId: null, nome, prezzo, qta, socio });
  await preparaStato(page, {
    crediti: [{ id: 'c1', tavolo: 'Tavolo 2', ora: '23:40', dataChiusura: '10/11', voci: [voce('a', 'Peroni 66 cl', 200, 2, 'Paolo'), voce('b', 'Coca Cola', 150, 1, 'Roberto')] }],
  });
  await page.click('[data-testid=nav-conti]');
  await page.click('[data-testid=vista-crediti]');
  await page.locator('[data-credito="Tavolo 2"]').getByRole('button', { name: 'Incassa credito' }).click();
  await expect(foglio(page)).toHaveAccessibleName('Credito · Tavolo 2');
  await foglio(page).locator('[data-preset="Paolo"]').click();
  await page.click('[data-testid=conferma-incasso]');
  await expect(page.getByTestId('avviso')).toHaveText('Credito del 10/11: incassati € 4,00');
  await expect(page.getByTestId('totale-crediti')).toHaveText('€ 1,50');

  await page.locator('[data-credito="Tavolo 2"]').getByRole('button', { name: 'Incassa credito' }).click();
  await page.click('[data-testid=conferma-incasso]');
  await expect(page.locator('[data-credito]')).toHaveCount(0);
  const s = await statoSalvato(page);
  expect(s.vendite.map(v => [v.pagatoDa, v.totale])).toEqual([['Credito del 10/11', 150], ['Credito del 10/11', 400]]);
});
