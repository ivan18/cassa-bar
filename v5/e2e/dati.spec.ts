// Gestione: Prodotti, Soci, Dati (backup, configurazione, intestazione, memoria piena).
import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { batti, digitaPin, expect, PIN, preparaStato, siediSoci, statoSalvato, test } from './supporto';

async function apri(page: Page, voce: 'prodotti' | 'soci' | 'dati' | 'archivio') {
  await page.click('[data-testid=nav-gestione]');
  await digitaPin(page, PIN);
  await page.click(`[data-testid=voce-${voce}]`);
}

const finestra = (page: Page) => page.getByRole('alertdialog');
const json = (nome: string, dati: unknown) => ({ name: nome, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(dati)) });

test('prodotti: nuovo con colore, modifica del prezzo, elimina con conferma; le voci battute restano', async ({ app }) => {
  const { page } = app;
  await apri(page, 'prodotti');
  await page.click('[data-testid=nuovo-prodotto]');
  const scheda = page.getByTestId('foglio-prodotto');
  await expect(page.getByTestId('salva-prodotto')).toBeDisabled();
  await page.fill('[data-testid=prodotto-nome]', '  Spritz ');
  await page.fill('[data-testid=prodotto-prezzo]', '0');
  await expect(page.getByTestId('salva-prodotto')).toBeDisabled(); // il prezzo deve essere maggiore di zero
  await page.fill('[data-testid=prodotto-prezzo]', '3,5');
  await scheda.getByRole('button', { name: 'Bar' }).click();
  await scheda.getByRole('button', { name: 'Colore 4' }).click();
  await page.click('[data-testid=salva-prodotto]');
  await expect(page.getByTestId('avviso')).toHaveText('Spritz salvato.');
  await expect(page.locator('section[aria-label=Bar] [data-prodotto-listino="Spritz"]')).toContainText('€ 3,50');

  await page.click('[data-prodotto-listino="Spritz"]');
  await expect(page.getByTestId('prodotto-prezzo')).toHaveValue('3,50');
  await page.fill('[data-testid=prodotto-prezzo]', '4');
  await page.click('[data-testid=salva-prodotto]');
  await expect(page.locator('[data-prodotto-listino="Spritz"]')).toContainText('€ 4,00');
  const salvato = (await statoSalvato(page)).prodotti.find(p => p.nome === 'Spritz');
  expect(salvato).toMatchObject({ categoria: 'Bar', prezzo: 400, colore: '#4aa3d8' });

  await page.click('[data-testid=nav-cassa]');
  await batti(page, 'Spritz', 2);
  await page.click('[data-testid=nav-gestione]');
  await digitaPin(page, PIN);
  await page.click('[data-testid=voce-prodotti]');
  await page.click('[data-prodotto-listino="Spritz"]');
  await page.click('[data-testid=elimina-prodotto]');
  await expect(finestra(page)).toHaveAccessibleName('Eliminare Spritz?');
  await page.click('[data-testid=conferma-si]');
  await expect(page.locator('[data-prodotto-listino="Spritz"]')).toHaveCount(0);
  await expect(page.getByTestId('foglio-prodotto')).toHaveCount(0);

  await page.click('[data-testid=nav-cassa]');
  await expect(page.locator('[data-prodotto="Spritz"]')).toHaveCount(0);
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 8,00'); // le due voci già battute restano
});

test('soci: iscrizione senza doppioni, filtro A–Z, eliminare un socio lo toglie dal tavolo', async ({ app }) => {
  const { page } = app;
  await siediSoci(page, 'Tavolo 2', ['Paolo', 'Luca']);
  await apri(page, 'soci');

  await page.fill('[data-testid=socio-nuovo]', '  Sara   Neri ');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('avviso')).toHaveText('Sara Neri iscritto.');
  await expect(page.getByTestId('socio-nuovo')).toHaveValue('');
  await page.fill('[data-testid=socio-nuovo]', 'sara neri');
  await page.click('[data-testid=iscrivi]');
  await expect(page.getByTestId('avviso')).toHaveText('sara neri è già iscritto.');
  await expect(page.getByTestId('socio-nuovo')).toHaveValue('sara neri');

  await page.getByTestId('filtro-az').getByRole('button', { name: 'S', exact: true }).click();
  await expect(page.locator('[data-socio-iscritto]')).toHaveCount(1);
  await expect(page.locator('[data-socio-iscritto]')).toHaveAttribute('data-socio-iscritto', 'Sara Neri');
  await page.getByTestId('filtro-az').getByRole('button', { name: 'Tutti' }).click();

  const paolo = page.locator('[data-socio-iscritto="Paolo"]');
  await expect(paolo).toContainText('seduto al Tavolo 2');
  await paolo.getByRole('button', { name: 'Elimina' }).click();
  await expect(finestra(page)).toContainText('Paolo è seduto al Tavolo 2: verrà tolto anche dal tavolo.');
  await page.click('[data-testid=conferma-si]');
  await expect(paolo).toHaveCount(0);
  const s = await statoSalvato(page);
  expect(s.soci).not.toContain('Paolo');
  expect(s.soci).toContain('Sara Neri');
  expect(s.seduti['Tavolo 2']).toEqual(['Luca']);
});

test('intestazione: si modifica toccando il nome, un campo vuoto lascia il valore attuale', async ({ app }) => {
  const { page } = app;
  await page.click('[data-testid=intestazione]');
  await page.fill('[data-testid=intestazione-associazione]', 'Circolo del Ponte');
  await page.fill('[data-testid=intestazione-cassa]', '   ');
  await page.click('[data-testid=salva-intestazione]');
  await expect(page.getByTestId('intestazione')).toContainText('Circolo del Ponte · Cassa');
  expect((await statoSalvato(page)).intestazione).toEqual({ associazione: 'Circolo del Ponte', cassa: 'Cassa' });

  await apri(page, 'dati');
  await page.click('[data-testid=modifica-intestazione]');
  await page.fill('[data-testid=intestazione-cassa]', 'Bar estivo');
  await page.getByTestId('intestazione-cassa').press('Enter');
  await expect(page.getByTestId('modifica-intestazione')).toContainText('Circolo del Ponte · Bar estivo');
});

test('backup: esporta un file senza PIN in chiaro, lo reimporta dopo conferma; file sbagliati rifiutati', async ({ app }) => {
  const { page } = app;
  await siediSoci(page, 'Tavolo 1', ['Andrea']);
  await batti(page, 'Caffè', 2);
  await page.click('[data-testid=salva-conto]');
  await apri(page, 'dati');

  const [scaricato] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid=esporta-backup]')]);
  expect(scaricato.suggestedFilename()).toMatch(/^backup_cassa_\d{4}-\d{2}-\d{2}\.json$/);
  const testo = await readFile(await scaricato.path(), 'utf8');
  const backup = JSON.parse(testo) as { tipo: string; versione: number; dati: { contiAperti: unknown[] } };
  expect([backup.tipo, backup.versione, backup.dati.contiAperti.length]).toEqual(['cassa-bar-backup', 5, 1]);
  expect(testo).not.toContain(`"${PIN}"`);
  await expect(finestra(page)).toHaveAccessibleName('Backup esportato');
  await page.click('[data-testid=conferma-si]');

  // si cambiano i dati, poi si ripristina il backup
  await page.click('[data-testid=torna-gestione]');
  await page.click('[data-testid=voce-soci]');
  await page.fill('[data-testid=socio-nuovo]', 'Elena');
  await page.click('[data-testid=iscrivi]');
  await page.click('[data-testid=torna-gestione]');
  await page.click('[data-testid=voce-dati]');
  await page.getByTestId('importa-backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(testo) });
  await expect(finestra(page)).toHaveAccessibleName('Sostituire i dati attuali?');
  await page.click('[data-testid=conferma-si]');
  await expect(finestra(page)).toHaveAccessibleName('Backup ripristinato');
  await page.click('[data-testid=conferma-si]');
  expect(await page.evaluate(() => localStorage.getItem('cassa5_stato') ?? '')).not.toContain('Elena'); // niente salvato

  // un file di configurazione o un backup v4 non si importano come backup
  await page.getByTestId('importa-backup').setInputFiles(json('config.json', { tipo: 'cassa-bar-config', versione: 1, soci: ['Sara'] }));
  await expect(finestra(page)).toHaveAccessibleName('Backup non importato');
  await expect(finestra(page)).toContainText('Questo è un file di configurazione: usa "Carica configurazione".');
  await expect(finestra(page)).toContainText('Nessuna modifica applicata.');
  await page.click('[data-testid=conferma-si]');
  await page.getByTestId('importa-backup').setInputFiles(json('vecchio.json', { products: [], customerList: [] }));
  await expect(finestra(page)).toContainText('backup della v4');
  await page.click('[data-testid=conferma-si]');
  expect((await statoSalvato(page)).soci).not.toContain('Sara');
});

test('configurazione: soci aggiunti senza doppioni e nuovo PIN; un file non valido non cambia nulla', async ({ app }) => {
  const { page } = app;
  const nuovo = PIN === '482915' ? '615243' : '482915';
  await apri(page, 'dati');

  await page.getByTestId('carica-configurazione').setInputFiles(json('errata.json', { tipo: 'cassa-bar-config', versione: 1, soci: ['Elena'], pin: '123' }));
  await expect(finestra(page)).toHaveAccessibleName('Configurazione non caricata');
  await expect(finestra(page)).toContainText('Il PIN deve essere un testo di sole cifre tra virgolette, almeno 4.');
  await page.click('[data-testid=conferma-si]');
  expect(await page.evaluate(() => localStorage.getItem('cassa5_stato') ?? '')).not.toContain('Elena'); // niente salvato

  await page.getByTestId('carica-configurazione').setInputFiles(json('config-cassa.json', { tipo: 'cassa-bar-config', versione: 1, soci: ['Elena', 'andrea'], pin: nuovo }));
  await expect(finestra(page)).toHaveAccessibleName('Configurazione caricata');
  await expect(finestra(page)).toContainText('Soci aggiunti: 1 (1 già presente).');
  await expect(finestra(page)).toContainText('PIN aggiornato.');
  await page.click('[data-testid=conferma-si]');

  await page.click('[data-testid=nav-cassa]');
  await page.click('[data-testid=nav-gestione]');
  await digitaPin(page, PIN);
  await expect(page.getByTestId('gestione-bloccata').getByRole('alert')).toHaveText('PIN errato. Riprova.');
  await digitaPin(page, nuovo);
  await expect(page.getByTestId('gestione-menu')).toBeVisible();
  const s = await statoSalvato(page);
  expect(s.soci).toContain('Elena');
  expect(JSON.stringify(s)).not.toContain(nuovo);
});

test('memoria piena: avviso in ogni sezione, "Libera spazio" porta all\'archivio, sparisce al primo salvataggio riuscito', async ({ app }) => {
  const { page } = app;
  await preparaStato(page, {
    chiusure: [{ id: 'k1', data: '03/11/2026', ora: '23:31', cassiere: '', fondoIniziale: 5000, incassato: 0, consegnato: 0, causale: '', fondoSuccessivo: 5000, creditiCreati: 0, vendite: [] }],
  });
  await page.evaluate(() => {
    const originale = Storage.prototype.setItem;
    (window as unknown as { __ripristina: () => void }).__ripristina = () => { Storage.prototype.setItem = originale; };
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === 'cassa5_stato') throw new DOMException('memoria piena', 'QuotaExceededError');
      originale.call(this, k, v);
    };
  });
  await batti(page, 'Caffè');
  await expect(page.getByTestId('avviso-memoria')).toBeVisible();
  await expect(page.getByTestId('totale-comanda')).toHaveText('€ 1,00'); // l'app continua a funzionare
  await page.click('[data-testid=nav-storico]');
  await expect(page.getByTestId('avviso-memoria')).toBeVisible();

  await page.getByTestId('avviso-memoria').getByRole('button', { name: 'Libera spazio' }).click();
  await digitaPin(page, PIN);
  await expect(page.getByRole('heading', { name: 'Archivio chiusure' })).toBeVisible();

  await page.evaluate(() => (window as unknown as { __ripristina: () => void }).__ripristina());
  await page.locator('[data-chiusura]').getByRole('button', { name: 'Elimina' }).click();
  await page.click('[data-testid=conferma-si]');
  await expect(page.getByTestId('avviso-memoria')).toHaveCount(0);
  expect((await statoSalvato(page)).chiusure).toEqual([]);

  await page.click('[data-testid=torna-gestione]');
  await page.click('[data-testid=voce-dati]');
  await expect(page.getByTestId('memoria-usata')).toHaveText(/^0,\d\d MB di circa 5 MB$/);
});
