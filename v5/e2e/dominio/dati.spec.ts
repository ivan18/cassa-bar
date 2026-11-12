import { expect, test } from '@playwright/test';
import { applicaBackup, creaBackup, leggiBackup } from '../../src/dominio/backup';
import { leggiConfigurazione } from '../../src/dominio/configurazione';
import { creaPin, pinValido, sha256Hex, verificaPin } from '../../src/dominio/pin';
import { statoIniziale } from '../../src/stato/store';
import { ADESSO } from './aiuti';

test('PIN: solo cifre e almeno 4; verifica con salt + hash; mai il PIN in chiaro', async () => {
  expect(pinValido('1234')).toBe(true);
  expect(pinValido('123')).toBe(false);
  expect(pinValido('12a4')).toBe(false);
  const pin = await creaPin('482915');
  expect(pin.salt).toMatch(/^[0-9a-f]{32}$/);
  expect(pin.hash).toBe(await sha256Hex(pin.salt + '482915'));
  expect(JSON.stringify(pin)).not.toContain('482915');
  expect(await verificaPin('482915', pin)).toBe(true);
  expect(await verificaPin('000000', pin)).toBe(false);
  expect(await verificaPin('', pin)).toBe(false);
  expect((await creaPin('482915')).salt).not.toBe(pin.salt); // salt nuovo ogni volta
});

test('configurazione valida: soci e PIN, anche uno solo dei due', () => {
  const c = (o: object) => leggiConfigurazione(JSON.stringify({ tipo: 'cassa-bar-config', versione: 1, ...o }));
  expect(c({ soci: ['Sara'], pin: '482915' })).toEqual({ ok: true, valore: { soci: ['Sara'], pin: '482915' } });
  expect(c({ pin: '4829' })).toEqual({ ok: true, valore: { pin: '4829' } });
  expect(c({ soci: [] })).toEqual({ ok: true, valore: { soci: [] } });
});

test('configurazione non valida: rifiutata con il motivo', () => {
  const errore = (testo: string) => { const r = leggiConfigurazione(testo); return r.ok ? '' : r.errore; };
  const c = (o: object) => JSON.stringify({ tipo: 'cassa-bar-config', versione: 1, ...o });
  expect(errore('{')).toContain('non è un JSON valido');
  expect(errore('{"products": []}')).toContain('non è una configurazione della cassa');
  expect(errore(JSON.stringify({ tipo: 'cassa-bar-config', versione: 2, pin: '1234' }))).toContain('versione 2 non supportata');
  expect(errore(c({}))).toContain('né "soci" né "pin"');
  expect(errore(c({ soci: 'Sara' }))).toContain('elenco di nomi');
  expect(errore(c({ soci: ['Sara', 3] }))).toContain('elenco di nomi');
  expect(errore(c({ pin: '123' }))).toContain('almeno 4');
  expect(errore(c({ pin: 4829 }))).toContain('sole cifre');
});

test('backup: andata e ritorno identici, nome del file con la data', () => {
  const stato = { ...statoIniziale(), fondo: 0, pin: { salt: 'ab', hash: 'cd' } };
  const { nomeFile, contenuto } = creaBackup(stato, ADESSO);
  expect(nomeFile).toBe('backup_cassa_2026-11-12.json');
  expect(JSON.parse(contenuto)).toMatchObject({ tipo: 'cassa-bar-backup', versione: 5 });
  expect(leggiBackup(contenuto)).toEqual({ ok: true, valore: stato }); // un fondo pari a zero resta zero
});

test('backup: file sbagliati rifiutati con il motivo', () => {
  const errore = (testo: string) => { const r = leggiBackup(testo); return r.ok ? '' : r.errore; };
  expect(errore('non json')).toContain('non è un JSON valido');
  expect(errore(JSON.stringify({ tipo: 'cassa-bar-config', versione: 1, pin: '1234' }))).toContain('usa "Carica configurazione"');
  expect(errore(JSON.stringify({ products: [], customerList: [] }))).toContain('backup della v4');
  expect(errore(JSON.stringify({ tipo: 'cassa-bar-backup', versione: 6, dati: {} }))).toContain('versione più recente');
  const guasto = JSON.parse(creaBackup(statoIniziale(), ADESSO).contenuto);
  guasto.dati.prodotti[2].prezzo = 1.5; // decimali non ammessi: gli importi sono centesimi interi
  expect(errore(JSON.stringify(guasto))).toBe('dati non validi (prodotti[2].prezzo).');
  const guasto2 = JSON.parse(creaBackup(statoIniziale(), ADESSO).contenuto);
  guasto2.dati.crediti = [{ id: 'x', tavolo: 'Tavolo 9', voci: [], ora: '22:00', dataChiusura: '12/11' }];
  expect(errore(JSON.stringify(guasto2))).toBe('dati non validi (crediti[0].tavolo).');
});

test('backup senza PIN: il PIN del dispositivo non cambia (D5)', () => {
  const dispositivo = { ...statoIniziale(), pin: { salt: 's', hash: 'h' } };
  expect(applicaBackup(dispositivo, { ...statoIniziale(), pin: null }).pin).toEqual({ salt: 's', hash: 'h' });
  expect(applicaBackup(dispositivo, { ...statoIniziale(), pin: { salt: 'n', hash: 'm' } }).pin).toEqual({ salt: 'n', hash: 'm' });
});
