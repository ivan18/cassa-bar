import { expect, test } from '@playwright/test';
import { aggiungiExtra, aggiungiProdotto, articoli, assegna, cambiaQuantita, destinatari, perSocio, socioDi, totale } from '../../src/dominio/comanda';
import { prodotto } from './aiuti';

const dreher = prodotto('Dreher 66 cl');
const coca = prodotto('Coca Cola');

test('lo stesso prodotto per lo stesso socio si somma; per un altro socio è una riga nuova', () => {
  let v = aggiungiProdotto([], dreher, ['Andrea']);
  v = aggiungiProdotto(v, dreher, ['Andrea']);
  v = aggiungiProdotto(v, dreher, ['Chiara']);
  expect(v.map(x => [x.socio, x.qta])).toEqual([['Andrea', 2], ['Chiara', 1]]);
  expect(totale(v)).toBe(600);
  expect(articoli(v)).toBe(3);
});

test('modalità TUTTI: una unità per ogni socio seduto; senza soci seduti va al socio attivo', () => {
  expect(destinatari(['Andrea', 'Chiara', 'Marco'], 'Andrea', true)).toEqual(['Andrea', 'Chiara', 'Marco']);
  expect(destinatari([], '', true)).toEqual(['']);
  expect(destinatari(['Andrea'], 'Andrea', false)).toEqual(['Andrea']);
  const v = aggiungiProdotto([], coca, destinatari(['Andrea', 'Chiara'], 'Andrea', true));
  expect(v.map(x => x.socio)).toEqual(['Andrea', 'Chiara']);
});

test('Tavolo generico: voce senza socio', () => {
  const v = aggiungiProdotto([], coca, ['']);
  expect(v[0]?.socio).toBe('');
  expect(socioDi(v[0]!)).toBe('Tavolo generico');
});

test('battuta extra: descrizione in maiuscolo o "EXTRA", mai unita, anche in TUTTI', () => {
  let v = aggiungiExtra([], 50, '  corretto ', ['Andrea']);
  v = aggiungiExtra(v, 50, '', ['Andrea']);
  v = aggiungiExtra(v, 50, '', ['Andrea', 'Chiara']);
  expect(v.map(x => [x.nome, x.socio, x.qta, x.prodottoId])).toEqual([
    ['CORRETTO', 'Andrea', 1, null], ['EXTRA', 'Andrea', 1, null], ['EXTRA', 'Andrea', 1, null], ['EXTRA', 'Chiara', 1, null],
  ]);
});

test('quantità: + e −, a zero la voce sparisce', () => {
  let v = aggiungiProdotto([], dreher, ['Andrea']);
  const id = v[0]!.id;
  v = cambiaQuantita(v, id, 1);
  expect(v[0]?.qta).toBe(2);
  v = cambiaQuantita(v, id, -2);
  expect(v).toEqual([]);
});

test('riassegnazione: su un socio che ha già lo stesso prodotto le righe si uniscono', () => {
  let v = aggiungiProdotto([], dreher, ['Andrea']);
  v = aggiungiProdotto(v, dreher, ['Chiara']);
  v = aggiungiProdotto(v, dreher, ['Chiara']);
  v = assegna(v, v[0]!.id, 'Chiara');
  expect(v.map(x => [x.socio, x.qta])).toEqual([['Chiara', 3]]);
  // verso il generico, senza gemelle: cambia solo il socio
  v = assegna(v, v[0]!.id, '');
  expect(v.map(x => [x.socio, x.qta])).toEqual([['', 3]]);
});

test('voci per socio: subtotali, Tavolo generico per ultimo', () => {
  let v = aggiungiProdotto([], coca, ['']);
  v = aggiungiProdotto(v, dreher, ['Marco']);
  v = aggiungiProdotto(v, coca, ['Andrea']);
  expect(perSocio(v).map(g => [g.socio, g.totale])).toEqual([['Marco', 200], ['Andrea', 150], ['', 150]]);
});
