import { expect, test } from '@playwright/test';
import { COLORI } from '../../src/dominio/costanti';
import { eliminaProdotto, salvaProdotto } from '../../src/dominio/prodotti';
import { aggiungiSoci, aggiungiSocio, cambiaSeduto, eliminaSocio, ordinaSoci } from '../../src/dominio/soci';
import { statoIniziale } from '../../src/stato/store';

test('soci: ordine alfabetico italiano, accenti e maiuscole indifferenti', () => {
  expect(ordinaSoci(['marco', 'Élia', 'andrea', 'Zeno', 'Enrico'])).toEqual(['andrea', 'Élia', 'Enrico', 'marco', 'Zeno']);
});

test('iscrizione: spazi ripuliti, doppioni ignorati senza badare alle maiuscole, nome vuoto rifiutato', () => {
  const base = ['Andrea', 'Marco'];
  expect(aggiungiSocio(base, '  Luca   Bianchi ')).toMatchObject({ esito: 'aggiunto', soci: ['Andrea', 'Luca Bianchi', 'Marco'] });
  expect(aggiungiSocio(base, 'marco').esito).toBe('gia-presente');
  expect(aggiungiSocio(base, '   ').esito).toBe('vuoto');
});

test('soci dal file di configurazione: niente vuoti né doppioni, conteggio dei già presenti', () => {
  const r = aggiungiSoci(['Andrea', 'Luca'], ['Sara', ' ', 'sara', 'luca', 'Elena']);
  expect(r).toEqual({ soci: ['Andrea', 'Elena', 'Luca', 'Sara'], aggiunti: 2, giaPresenti: 1 });
});

test('eliminare un socio lo toglie anche dai tavoli (D10)', () => {
  let seduti = cambiaSeduto({}, 'Tavolo 3', 'Andrea');
  seduti = cambiaSeduto(seduti, 'Tavolo 3', 'Chiara');
  seduti = cambiaSeduto(seduti, 'Tavolo 1', 'Andrea');
  const r = eliminaSocio({ soci: ['Andrea', 'Chiara'], seduti }, 'Andrea');
  expect(r.soci).toEqual(['Chiara']);
  expect(r.seduti).toEqual({ 'Tavolo 3': ['Chiara'], 'Tavolo 1': [] });
  // cambiaSeduto alza chi è già seduto
  expect(cambiaSeduto(r.seduti, 'Tavolo 3', 'Chiara')['Tavolo 3']).toEqual([]);
});

test('prodotti: aggiunta, modifica, controlli su nome e prezzo, colore dalla tavolozza', () => {
  const listino = statoIniziale().prodotti;
  const nuovo = salvaProdotto(listino, { nome: ' Spritz ', categoria: 'Bar', prezzo: '3,5', colore: COLORI[3] });
  expect(nuovo.ok).toBe(true);
  if (!nuovo.ok) return;
  const spritz = nuovo.valore.at(-1)!;
  expect(spritz).toMatchObject({ nome: 'Spritz', categoria: 'Bar', prezzo: 350, colore: COLORI[3] });

  const mod = salvaProdotto(nuovo.valore, { id: spritz.id, nome: 'Spritz Aperol', categoria: 'Bar', prezzo: '4', colore: '#000000' });
  expect(mod.ok && mod.valore.find(p => p.id === spritz.id)).toMatchObject({ nome: 'Spritz Aperol', prezzo: 400, colore: COLORI[0] });

  expect(salvaProdotto(listino, { nome: '', categoria: 'Bar', prezzo: '1', colore: COLORI[0] }).ok).toBe(false);
  expect(salvaProdotto(listino, { nome: 'X', categoria: 'Bar', prezzo: '0', colore: COLORI[0] }).ok).toBe(false);
  expect(salvaProdotto(listino, { nome: 'X', categoria: 'Bar', prezzo: 'abc', colore: COLORI[0] }).ok).toBe(false);
  expect(salvaProdotto(listino, { id: 'non-esiste', nome: 'X', categoria: 'Bar', prezzo: '1', colore: COLORI[0] }).ok).toBe(false);
  expect(eliminaProdotto(nuovo.valore, spritz.id)).toHaveLength(listino.length);
});
