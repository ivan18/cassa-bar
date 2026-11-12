import { expect, test } from '@playwright/test';
import { chiudiCassa, fondoSuccessivo, incassato, riepilogoSerata } from '../../src/dominio/chiusura';
import { descriviVoci } from '../../src/dominio/comanda';
import { contiOrdinati, salvaConto, vociDelTavolo } from '../../src/dominio/conti';
import type { StatoDominio, Vendita } from '../../src/dominio/tipi';
import { statoIniziale } from '../../src/stato/store';
import { ADESSO, voce } from './aiuti';

const vendita = (ora: string, totale: number): Vendita =>
  ({ id: ora, ora, tavolo: 'Banco', pagatoDa: 'Intero tavolo', voci: [voce('Caffè', totale, 1)], totale });

test('conti aperti: salvataggio con id stabile, ordine per tavolo, comanda vuota non si salva', () => {
  let conti = salvaConto([], { tavolo: 'Tavolo 3', voci: [voce('Fanta', 150, 1)] }, ADESSO);
  const id = conti[0]!.id;
  conti = salvaConto(conti, { tavolo: 'Tavolo 3', voci: [voce('Fanta', 150, 2)] }, ADESSO);
  conti = salvaConto(conti, { tavolo: 'Banco', voci: [voce('Caffè', 100, 1)] }, ADESSO);
  conti = salvaConto(conti, { tavolo: 'Tavolo 1', voci: [] }, ADESSO);
  expect(conti).toHaveLength(2);
  expect(conti.find(c => c.tavolo === 'Tavolo 3')?.id).toBe(id);
  expect(vociDelTavolo(conti, 'Tavolo 3')[0]?.qta).toBe(2);
  expect(contiOrdinati(conti).map(c => c.tavolo)).toEqual(['Banco', 'Tavolo 3']);
  expect(conti[0]?.ora).toBe('22:14');
});

test('fondo per domani: fondo + incassato − consegnato, mai sotto zero', () => {
  expect(fondoSuccessivo(5000, 1780, 1000)).toBe(5780);
  expect(fondoSuccessivo(5000, 1780, 1780)).toBe(5000);
  expect(fondoSuccessivo(5000, 1780, 9000)).toBe(0);
});

test('chiusura: crediti, tavoli liberi, vendite archiviate, storico vuoto, nuovo fondo', () => {
  const prima: StatoDominio = {
    ...statoIniziale(),
    fondo: 5000,
    vendite: [vendita('22:10', 900), vendita('21:30', 250)], // la più recente per prima
    contiAperti: [
      { id: 'c1', tavolo: 'Tavolo 1', voci: [voce('Dreher 66 cl', 200, 2, 'Luca')], ora: '21:48' },
      { id: 'c5', tavolo: 'Tavolo 5', voci: [voce('Caffè', 100, 3)], ora: '22:05' },
    ],
    crediti: [{ id: 'vecchio', tavolo: 'Tavolo 2', voci: [voce('Peroni 66 cl', 200, 1, 'Paolo')], ora: '23:40', dataChiusura: '10/11' }],
    seduti: { 'Tavolo 1': ['Luca'], 'Tavolo 3': ['Andrea'] },
    comanda: { tavolo: 'Tavolo 3', voci: [voce('Fanta', 150, 1, 'Andrea')] },
  };
  const { stato, chiusura } = chiudiCassa(prima, { cassiere: ' Paolo ', consegnato: null, causale: 'Consegna serata' }, ADESSO);

  expect(incassato(prima.vendite)).toBe(1150);
  expect(chiusura).toMatchObject({
    data: '12/11/2026', ora: '22:14', cassiere: 'Paolo', fondoIniziale: 5000, incassato: 1150,
    consegnato: 1150, causale: 'Consegna serata', fondoSuccessivo: 5000, creditiCreati: 2,
  });
  // vendite archiviate dalla più vecchia, solo i campi del rendiconto
  expect(chiusura.vendite?.map(v => v.ora)).toEqual(['21:30', '22:10']);
  expect(Object.keys(chiusura.vendite![0]!.voci[0]!).sort()).toEqual(['nome', 'prezzo', 'qta', 'socio']);

  expect(stato.crediti.map(c => [c.tavolo, c.dataChiusura])).toEqual([['Tavolo 1', '12/11'], ['Tavolo 5', '12/11'], ['Tavolo 2', '10/11']]);
  expect(stato.contiAperti).toEqual([]);
  expect(stato.seduti).toEqual({});
  expect(stato.comanda).toEqual({ tavolo: 'Banco', voci: [] });
  expect(stato.vendite).toEqual([]);
  expect(stato.chiusure[0]).toBe(chiusura);
  expect(stato.fondo).toBe(5000);
});

test('chiusura con consegna parziale: il resto rimane nel fondo', () => {
  const prima = { ...statoIniziale(), fondo: 5000, vendite: [vendita('22:00', 1780)] };
  const { stato } = chiudiCassa(prima, { cassiere: '', consegnato: 1000, causale: '' }, ADESSO);
  expect(stato.fondo).toBe(5780);
  expect(stato.chiusure[0]?.creditiCreati).toBe(0);
});

test('riepilogo della serata: fondo, incassato, in cassa, crediti da incassare', () => {
  const s = {
    fondo: 5000,
    vendite: [vendita('22:00', 1780), vendita('21:00', 250)],
    crediti: [{ id: 'c', tavolo: 'Tavolo 2' as const, voci: [voce('Peroni 66 cl', 200, 2, 'Paolo'), voce('Caffè', 100, 1)], ora: '23:40', dataChiusura: '10/11' }],
  };
  expect(riepilogoSerata(s)).toEqual({ fondo: 5000, incassato: 2030, inCassa: 7030, crediti: 500 });
  expect(riepilogoSerata({ fondo: 0, vendite: [], crediti: [] })).toEqual({ fondo: 0, incassato: 0, inCassa: 0, crediti: 0 });
});

test('voci in una riga: quantità, nome e socio (il Tavolo generico non si scrive)', () => {
  expect(descriviVoci([voce('Dreher 66 cl', 200, 2, 'Andrea'), voce('Caffè', 100, 1)])).toBe('2× Dreher 66 cl (Andrea), 1× Caffè');
  expect(descriviVoci([])).toBe('');
});
