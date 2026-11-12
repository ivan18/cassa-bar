// Costanti della cassa. Gli importi sono sempre in centesimi interi.
import type { Prodotto } from './tipi';

export const TAVOLI = ['Banco', 'Tavolo 1', 'Tavolo 2', 'Tavolo 3', 'Tavolo 4', 'Tavolo 5', 'Tavolo 6'] as const;
export type Tavolo = (typeof TAVOLI)[number];

export const CATEGORIE = ['Birre', 'Bibite', 'Snack', 'Bar', 'Extra'] as const;
export type Categoria = (typeof CATEGORIE)[number];

/** Etichetta delle voci senza socio: restano del tavolo, in nessuna quota socio. */
export const TAVOLO_GENERICO = 'Tavolo generico';

/** Tavolozza dei colori dei prodotti (D10). */
export const COLORI = ['#e0a13a', '#d2493c', '#3f9e6b', '#4aa3d8', '#ec8a2f', '#3fb5a5', '#9a7656', '#a77bd1', '#c9a227', '#a33a3a'] as const;

export const FONDO_PREDEFINITO = 5000;

export const INTESTAZIONE_PREDEFINITA = { associazione: 'Associazione', cassa: 'Cassa' } as const;

// Listino e soci di esempio: nomi inventati, il repo è pubblico. I soci veri arrivano dal file di configurazione.
export const PRODOTTI_ESEMPIO: readonly Prodotto[] = [
  { id: 'p1', nome: 'Dreher 66 cl', categoria: 'Birre', prezzo: 200, colore: '#e0a13a' },
  { id: 'p2', nome: 'Peroni 66 cl', categoria: 'Birre', prezzo: 200, colore: '#d2493c' },
  { id: 'p3', nome: 'Bavaria 66 cl', categoria: 'Birre', prezzo: 200, colore: '#3f9e6b' },
  { id: 'p4', nome: 'Dreher 33 cl', categoria: 'Birre', prezzo: 110, colore: '#c9a227' },
  { id: 'p5', nome: 'Peroni 33 cl', categoria: 'Birre', prezzo: 120, colore: '#ec8a2f' },
  { id: 'p7', nome: 'Coca Cola', categoria: 'Bibite', prezzo: 150, colore: '#a33a3a' },
  { id: 'p8', nome: 'Fanta', categoria: 'Bibite', prezzo: 150, colore: '#ec8a2f' },
  { id: 'p12', nome: 'Gassosa', categoria: 'Bibite', prezzo: 100, colore: '#3fb5a5' },
  { id: 'p9', nome: 'Acqua 500 ml', categoria: 'Bibite', prezzo: 50, colore: '#4aa3d8' },
  { id: 'p10', nome: 'Patatine', categoria: 'Snack', prezzo: 150, colore: '#c9a227' },
  { id: 'p13', nome: 'Salatini', categoria: 'Snack', prezzo: 30, colore: '#e0a13a' },
  { id: 'p11', nome: 'Caffè', categoria: 'Bar', prezzo: 100, colore: '#9a7656' },
];

export const SOCI_ESEMPIO: readonly string[] = ['Andrea', 'Chiara', 'Giuseppe', 'Luca', 'Marco', 'Matteo', 'Paolo', 'Roberto'];
