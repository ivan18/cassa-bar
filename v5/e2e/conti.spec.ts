import { batti, comanda, digitaPin, expect, PIN, PIN_ERRATO, preparaStato, scegliTavolo, test } from './supporto';

async function salvaContoSu(page: import('@playwright/test').Page, tavolo: string, prodotto: string, volte = 1) {
  await scegliTavolo(page, tavolo);
  await batti(page, prodotto, volte);
  await page.click('[data-testid=salva-conto]');
}

test('conti aperti ordinati per tavolo; Modifica riapre la comanda in Cassa', async ({ app }) => {
  const { page } = app;
  await salvaContoSu(page, 'Tavolo 5', 'Caffè', 3);
  await salvaContoSu(page, 'Banco', 'Acqua 500 ml');
  await salvaContoSu(page, 'Tavolo 2', 'Fanta');
  await expect(page.getByTestId('badge-conti')).toHaveText('3');

  await page.click('[data-testid=nav-conti]');
  await expect(page.locator('[data-conto]')).toHaveCount(3);
  expect(await page.locator('[data-conto]').evaluateAll(e => e.map(x => x.getAttribute('data-conto')))).toEqual(['Banco', 'Tavolo 2', 'Tavolo 5']);
  await expect(page.locator('[data-conto="Tavolo 5"]')).toContainText('Tavolo generico · 3× Caffè');
  await expect(page.locator('[data-conto="Tavolo 5"]')).toContainText('€ 3,00');

  await page.locator('[data-conto="Tavolo 5"]').getByRole('button', { name: 'Modifica' }).click();
  await expect(page.getByTestId('nav-cassa')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-tavolo="Tavolo 5"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(comanda(page).locator('[data-voce="Caffè"] output')).toHaveText('3');
});

test('Elimina conto chiede il PIN: il motivo è scritto, nessun suggerimento, PIN errato rifiutato', async ({ app }) => {
  const { page } = app;
  await salvaContoSu(page, 'Tavolo 2', 'Peroni 66 cl', 2);
  await page.click('[data-testid=nav-conti]');
  await page.locator('[data-conto="Tavolo 2"]').getByRole('button', { name: 'Elimina' }).click();

  const foglio = page.getByTestId('foglio-pin');
  await expect(page.getByTestId('pin-motivo')).toHaveText('Elimina il conto del Tavolo 2 (€ 4,00).');
  // testo del foglio senza i tasti del tastierino (le cifre 1-9 di seguito conterrebbero "1234")
  const testo = await foglio.evaluate(f => {
    const copia = f.cloneNode(true) as HTMLElement;
    copia.querySelectorAll('[data-tasto]').forEach(t => t.remove());
    return copia.textContent ?? '';
  });
  expect(testo).not.toContain(PIN);
  expect(testo).not.toMatch(/predefinit/i);

  await digitaPin(page, PIN_ERRATO);
  await expect(foglio.getByRole('alert')).toHaveText('PIN errato. Riprova.');
  await expect(page.locator('[data-conto="Tavolo 2"]')).toHaveCount(1);

  await digitaPin(page, PIN);
  await expect(foglio).toHaveCount(0);
  await expect(page.locator('[data-conto]')).toHaveCount(0);
  await expect(page.getByTestId('avviso')).toHaveText('Conto del Tavolo 2 eliminato.');
});

test('crediti: totale dei sospesi, Elimina con PIN', async ({ app }) => {
  const { page } = app;
  const voce = (id: string, nome: string, prezzo: number, qta: number, socio: string) => ({ id, prodottoId: null, nome, prezzo, qta, socio });
  await preparaStato(page, {
    crediti: [
      { id: 'c1', tavolo: 'Tavolo 2', ora: '23:40', dataChiusura: '10/11', voci: [voce('a', 'Peroni 66 cl', 200, 2, 'Paolo'), voce('b', 'Coca Cola', 150, 1, 'Roberto')] },
      { id: 'c2', tavolo: 'Tavolo 4', ora: '23:10', dataChiusura: '10/11', voci: [voce('c', 'Caffè', 100, 1, '')] },
    ],
  });
  await expect(page.getByTestId('badge-crediti')).toHaveText('2');
  await page.click('[data-testid=nav-conti]');
  await page.click('[data-testid=vista-crediti]');
  await expect(page.getByTestId('totale-crediti')).toHaveText('€ 6,50');
  await expect(page.locator('[data-credito="Tavolo 2"]')).toContainText('Paolo · 2× Peroni 66 cl');

  await page.locator('[data-credito="Tavolo 4"]').getByRole('button', { name: 'Elimina' }).click();
  await expect(page.getByTestId('pin-motivo')).toHaveText('Elimina il credito del Tavolo 4 del 10/11 (€ 1,00).');
  await digitaPin(page, PIN);
  await expect(page.locator('[data-credito]')).toHaveCount(1);
  await expect(page.getByTestId('totale-crediti')).toHaveText('€ 5,50');
});
