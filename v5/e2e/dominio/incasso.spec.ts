import { expect, test } from '@playwright/test';
import {
  cambiaSelezione, daIncassare, dividi, etichettaPagatore, mancano, preseleziona, resto, sedutiDopoIncasso, selezioneCompleta, sociConQuota,
} from '../../src/dominio/incasso';
import { voce } from './aiuti';

// Tavolo 3: Andrea 2 birre, Chiara 1 coca, 2 salatini del Tavolo generico
const voci = [voce('Dreher 66 cl', 200, 2, 'Andrea'), voce('Coca Cola', 150, 1, 'Chiara'), voce('Salatini', 30, 2)];

test('all\'apertura è selezionato tutto', () => {
  expect(selezioneCompleta(voci)).toEqual([2, 1, 2]);
  expect(daIncassare(voci, selezioneCompleta(voci))).toBe(610);
});

test('preselezioni: tavolo intero, quota socio, niente', () => {
  expect(preseleziona(voci, 'TUTTO')).toEqual([2, 1, 2]);
  expect(preseleziona(voci, { socio: 'Andrea' })).toEqual([2, 0, 0]);
  expect(preseleziona(voci, 'NIENTE')).toEqual([0, 0, 0]);
  expect(sociConQuota(voci)).toEqual(['Andrea', 'Chiara']); // il Tavolo generico non è la quota di nessuno
});

test('+ e − restano tra zero e la quantità della voce', () => {
  let sel = preseleziona(voci, 'NIENTE');
  sel = cambiaSelezione(voci, sel, 0, -1);
  expect(sel[0]).toBe(0);
  sel = cambiaSelezione(voci, cambiaSelezione(voci, cambiaSelezione(voci, sel, 0, 1), 0, 1), 0, 1);
  expect(sel[0]).toBe(2);
});

test('dividi: pagato ora e resto da pagare', () => {
  const { pagate, restanti } = dividi(voci, [1, 1, 0]);
  expect(pagate.map(v => [v.nome, v.qta])).toEqual([['Dreher 66 cl', 1], ['Coca Cola', 1]]);
  expect(restanti.map(v => [v.nome, v.qta])).toEqual([['Dreher 66 cl', 1], ['Salatini', 2]]);
});

test('chi ha pagato: le cinque etichette dello Storico', () => {
  const caso = (sel: number[], data?: string) => { const d = dividi(voci, sel); return etichettaPagatore(d.pagate, d.restanti, data); };
  expect(caso([2, 1, 2])).toBe('Intero tavolo');
  expect(caso([2, 0, 0])).toBe('Andrea');
  expect(caso([1, 0, 0])).toBe('Andrea (parziale)');
  expect(caso([2, 1, 0])).toBe('Parziale');
  expect(caso([1, 0, 0], '10/11')).toBe('Credito del 10/11');
});

test('chi ha pagato tutto esce dal tavolo; a conto saldato il tavolo si libera', () => {
  const seduti = ['Andrea', 'Chiara', 'Marco'];
  let d = dividi(voci, [2, 0, 0]);
  expect(sedutiDopoIncasso(seduti, d.pagate, d.restanti)).toEqual(['Chiara', 'Marco']);
  d = dividi(voci, [1, 0, 0]); // Andrea paga solo in parte: resta
  expect(sedutiDopoIncasso(seduti, d.pagate, d.restanti)).toEqual(seduti);
  d = dividi(voci, [2, 1, 2]);
  expect(sedutiDopoIncasso(seduti, d.pagate, d.restanti)).toEqual([]);
});

test('resto e importo mancante', () => {
  expect(resto(610, 1000)).toBe(390);
  expect(resto(610, 500)).toBe(0);
  expect(mancano(610, 500)).toBe(110);
});
