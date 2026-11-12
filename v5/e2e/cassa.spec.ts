import { batti, comanda, digitaPin, expect, PIN, scegliTavolo, siediSoci, statoSalvato, test } from './supporto';

test('soci al tavolo: filtro A–Z con lettere vuote spente; il primo seduto diventa il socio attivo', async ({ app }) => {
  const { page } = app;
  await scegliTavolo(page, 'Tavolo 3');
  await page.click('[data-testid=apri-soci]');
  await page.locator('[data-testid=filtro-az] button', { hasText: /^M$/ }).click();
  await expect(page.locator('[data-socio-scelta]')).toHaveText([/Marco/, /Matteo/]);
  await expect(page.locator('[data-testid=filtro-az] button', { hasText: /^Q$/ })).toBeDisabled();
  await page.locator('[data-testid=filtro-az] button', { hasText: 'Tutti' }).click();
  await page.click('[data-socio-scelta="Andrea"]');
  await page.click('[data-socio-scelta="Chiara"]');
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Soci al Tavolo 3 (2)');
  await page.getByRole('button', { name: 'Fatto' }).click();

  await expect(page.locator('[data-testid=chi-ordina] [data-socio="Andrea"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-tavolo="Tavolo 3"]')).toHaveAttribute('data-occupato', 'true');
});

test('comanda: prodotti al socio attivo, al Generico e a tutti con TUTTI; subtotali e totale', async ({ app }) => {
  const { page } = app;
  await siediSoci(page, 'Tavolo 3', ['Andrea', 'Chiara', 'Marco']);
  await batti(page, 'Dreher 66 cl');                 // Andrea, attivo in automatico
  await batti(page, 'Coca Cola', 1, 'Chiara');
  await batti(page, 'Salatini', 2, '');              // Tavolo generico
  await page.click('[data-testid=tutti]');
  await batti(page, 'Caffè');                        // uno a testa
  await expect(page.locator('[data-testid=tutti]')).toHaveAttribute('aria-pressed', 'true');

  const c = comanda(page);
  await expect(c.locator('[data-gruppo]')).toHaveCount(4);
  await expect(c.locator('[data-gruppo="Andrea"] h4')).toContainText('€ 3,00');
  await expect(c.locator('[data-gruppo="Tavolo generico"] [data-voce="Salatini"] output')).toHaveText('2');
  await expect(c.locator('[data-gruppo="Marco"] [data-voce="Caffè"]')).toBeVisible();
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 7,10');
});

test('extra: descrizione in maiuscolo, importo dal tastierino o dai rapidi', async ({ app }) => {
  const { page } = app;
  await page.click('[data-testid=apri-extra]');
  await expect(page.getByTestId('aggiungi-extra')).toBeDisabled();
  await page.fill('[data-testid=descrizione-extra]', 'corretto');
  for (const t of ['1', ',', '2', '5']) await page.click(`[data-testid=foglio-extra] [data-tasto="${t}"]`);
  await expect(page.getByTestId('extra-importo')).toHaveText('€ 1,25');
  await page.click('[data-testid=aggiungi-extra]');
  await page.click('[data-testid=apri-extra]');
  await page.click('[data-rapido="0,50"]');
  await page.click('[data-testid=aggiungi-extra]');

  const c = comanda(page);
  await expect(c.locator('[data-voce="CORRETTO"]')).toContainText('€ 1,25');
  await expect(c.locator('[data-voce="EXTRA"]')).toContainText('€ 0,50');
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 1,75');
});

test('quantità, riassegnazione che unisce le righe, Svuota con conferma', async ({ app }) => {
  const { page } = app;
  await siediSoci(page, 'Tavolo 1', ['Andrea', 'Chiara']);
  await batti(page, 'Fanta', 1, 'Andrea');
  await batti(page, 'Fanta', 2, 'Chiara');
  const c = comanda(page);
  await c.getByRole('button', { name: 'Aggiungi un Fanta' }).first().click();
  await expect(c.locator('[data-gruppo="Andrea"] output')).toHaveText('2');
  await c.locator('[data-gruppo="Andrea"] select').selectOption('Chiara');
  await expect(c.locator('[data-gruppo]')).toHaveCount(1);
  await expect(c.locator('[data-gruppo="Chiara"] output')).toHaveText('4');
  await c.getByRole('button', { name: 'Togli un Fanta' }).click();
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 4,50');

  await c.getByRole('button', { name: 'Svuota' }).click();
  await expect(page.getByRole('alertdialog')).toHaveAccessibleName('Svuotare la comanda?');
  await page.click('[data-testid=conferma-no]');
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 4,50');
  await c.getByRole('button', { name: 'Svuota' }).click();
  await page.click('[data-testid=conferma-si]');
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 0,00');
});

test('Salva conto: torna al Banco, il tavolo resta occupato; conto e comanda sopravvivono al ricaricamento', async ({ app }) => {
  const { page } = app;
  await siediSoci(page, 'Tavolo 3', ['Andrea']);
  await batti(page, 'Peroni 66 cl', 2);
  await page.click('[data-testid=salva-conto]');
  await expect(page.getByTestId('avviso')).toHaveText('Conto del Tavolo 3 salvato.');
  await expect(page.locator('[data-tavolo="Banco"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-tavolo="Tavolo 3"]')).toHaveAttribute('data-occupato', 'true');
  await expect(page.getByTestId('badge-conti')).toHaveText('1');

  // comanda in corso al Banco, non salvata
  await batti(page, 'Caffè');
  await page.reload();
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 1,00');
  await expect(page.getByTestId('badge-conti')).toHaveText('1');
  const salvato = await statoSalvato(page);
  expect(salvato.contiAperti.map(c => [c.tavolo, c.voci[0]?.qta])).toEqual([['Tavolo 3', 2]]);
  expect(salvato.seduti['Tavolo 3']).toEqual(['Andrea']);
});


test.describe('telefono', () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test('barra della comanda: riepilogo, foglio con la comanda, Salva', async ({ app }) => {
    const { page } = app;
    await expect(page.locator('aside[aria-label=Comanda]')).toBeHidden();
    await siediSoci(page, 'Tavolo 2', ['Luca']);
    await batti(page, 'Dreher 66 cl', 3);
    const barra = page.getByTestId('barra-comanda');
    await expect(barra).toContainText('Tavolo 2 · Luca · 3 art.');
    await expect(barra).toContainText('€ 6,00');
    await barra.getByRole('button', { name: 'Apri la comanda di Tavolo 2' }).click();
    await expect(page.getByTestId('foglio-comanda')).toBeVisible();
    await expect(comanda(page).locator('[data-voce="Dreher 66 cl"] output')).toHaveText('3');
    await page.getByRole('button', { name: 'Chiudi' }).click();
    await barra.getByRole('button', { name: 'Salva', exact: true }).click();
    await expect(page.getByTestId('avviso')).toHaveText('Conto del Tavolo 2 salvato.');
  });
});

test('categorie: solo quelle presenti nel listino; il filtro mostra i prodotti della categoria', async ({ app }) => {
  const { page } = app;
  const categorie = page.locator('[data-categoria]');
  await expect(categorie).toHaveText(['Tutti', 'Birre', 'Bibite', 'Snack', 'Bar']); // nessun prodotto Extra di esempio
  await expect(page.locator('[data-categoria="Tutti"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-categoria="Snack"]');
  await expect(page.locator('[data-prodotto]')).toHaveText([/Patatine/, /Salatini/]);
  await expect(page.getByText('2 in Snack')).toBeVisible();
  await page.click('[data-categoria="Tutti"]');
  await expect(page.locator('[data-prodotto]')).toHaveCount(12);
});

test('una categoria che resta senza prodotti sparisce e il filtro torna a Tutti', async ({ app }) => {
  const { page } = app;
  await page.click('[data-categoria="Bar"]');
  await expect(page.locator('[data-prodotto]')).toHaveText([/Caffè/]);
  await page.click('[data-testid=nav-gestione]');
  await digitaPin(page, PIN);
  await page.click('[data-testid=voce-prodotti]');
  await page.click('[data-prodotto-listino="Caffè"]');
  await page.click('[data-testid=elimina-prodotto]');
  await page.click('[data-testid=conferma-si]');
  await page.click('[data-testid=nav-cassa]');
  await expect(page.locator('[data-categoria="Bar"]')).toHaveCount(0);
  await expect(page.locator('[data-categoria="Tutti"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-prodotto]')).toHaveCount(11);
});

test('cambio tavolo con voci non salvate: Resta qui, Salva e cambia, Scarta', async ({ app }) => {
  const { page } = app;
  const finestra = page.getByRole('alertdialog');
  const aperto = (t: string) => expect(page.locator(`[data-tavolo="${t}"]`)).toHaveAttribute('aria-pressed', 'true');

  await siediSoci(page, 'Tavolo 3', ['Andrea']);
  await batti(page, 'Caffè', 2);
  await scegliTavolo(page, 'Tavolo 3'); // il tavolo già aperto: nessuna domanda, le voci restano
  await expect(finestra).toHaveCount(0);
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 2,00');

  await scegliTavolo(page, 'Tavolo 5');
  await expect(finestra).toHaveAccessibleName('Voci non salvate al Tavolo 3');
  await expect(finestra).toContainText('2 articoli (€ 2,00) non sono nel conto. Cosa vuoi fare prima di passare al Tavolo 5?');
  await finestra.getByRole('button', { name: 'Resta qui' }).click();
  await aperto('Tavolo 3');
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 2,00');

  await scegliTavolo(page, 'Tavolo 5');
  await finestra.getByRole('button', { name: 'Salva e cambia' }).click();
  await aperto('Tavolo 5');
  await expect(page.getByTestId('avviso')).toHaveText('Conto del Tavolo 3 salvato.');
  expect((await statoSalvato(page)).contiAperti.map(c => [c.tavolo, c.voci[0]?.qta])).toEqual([['Tavolo 3', 2]]);

  await batti(page, 'Fanta');
  await scegliTavolo(page, 'Tavolo 3');
  await finestra.getByRole('button', { name: 'Scarta' }).click();
  await aperto('Tavolo 3');
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 2,00'); // il conto salvato
  expect((await statoSalvato(page)).contiAperti.map(c => c.tavolo)).toEqual(['Tavolo 3']);

  // anche cambiare un conto già salvato è una modifica non salvata
  await batti(page, 'Caffè');
  await scegliTavolo(page, 'Banco');
  await expect(finestra).toContainText('3 articoli (€ 3,00)');
  await finestra.getByRole('button', { name: 'Scarta' }).click();
  expect((await statoSalvato(page)).contiAperti[0]?.voci[0]?.qta).toBe(2);

  // senza modifiche si cambia tavolo senza domande
  await scegliTavolo(page, 'Tavolo 3');
  await scegliTavolo(page, 'Banco');
  await expect(finestra).toHaveCount(0);
  await aperto('Banco');
});

test('Conti → Modifica con voci non salvate in Cassa: prima la domanda, poi il conto scelto', async ({ app }) => {
  const { page } = app;
  await scegliTavolo(page, 'Tavolo 2');
  await batti(page, 'Caffè');
  await page.click('[data-testid=salva-conto]');
  await batti(page, 'Fanta'); // al Banco, non salvata
  await page.click('[data-testid=nav-conti]');
  await page.locator('[data-conto="Tavolo 2"]').getByRole('button', { name: 'Modifica' }).click();
  await expect(page.getByRole('alertdialog')).toHaveAccessibleName('Voci non salvate al Banco');
  await page.getByRole('button', { name: 'Salva e cambia' }).click();
  await expect(page.locator('[data-tavolo="Tavolo 2"]')).toHaveAttribute('aria-pressed', 'true');
  expect((await statoSalvato(page)).contiAperti.map(c => c.tavolo).sort()).toEqual(['Banco', 'Tavolo 2']);
});
