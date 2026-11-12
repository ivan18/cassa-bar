import { expect, test } from '@playwright/test';
import { dataBreve, dataCompleta, dataFile, euro, iniziale, leggiImporto, oraBreve } from '../../src/dominio/formato';
import { ADESSO } from './aiuti';

test('euro: virgola, due decimali, migliaia col punto, spazio indivisibile', () => {
  expect(euro(250)).toBe('€ 2,50');
  expect(euro(0)).toBe('€ 0,00');
  expect(euro(5)).toBe('€ 0,05');
  expect(euro(123456)).toBe('€ 1.234,56');
  expect(euro(-150)).toBe('−€ 1,50');
});

test('leggiImporto: forme accettate e rifiutate', () => {
  expect(leggiImporto('2')).toBe(200);
  expect(leggiImporto('2,5')).toBe(250);
  expect(leggiImporto('2.50')).toBe(250);
  expect(leggiImporto(' € 3,00 ')).toBe(300);
  expect(leggiImporto('1,15')).toBe(115); // niente errori di arrotondamento
  expect(leggiImporto('0')).toBe(0);
  for (const no of ['', 'abc', '-2', '2,555', '2,', ',5', '1.000,00']) expect(leggiImporto(no), no).toBeNull();
});

test('somme in centesimi senza errori dei decimali', () => {
  // in euro decimali 0,1 + 0,2 darebbe 0,30000000000000004
  expect(euro(10 + 20)).toBe('€ 0,30');
  expect(euro(110 * 3)).toBe('€ 3,30');
});

test('orari, date e iniziali', () => {
  expect(oraBreve(ADESSO)).toBe('22:14');
  expect(dataBreve(ADESSO)).toBe('12/11');
  expect(dataCompleta(ADESSO)).toBe('12/11/2026');
  expect(dataFile(ADESSO)).toBe('2026-11-12');
  expect(iniziale('Élia')).toBe('E');
  expect(iniziale('  marco')).toBe('M');
});
