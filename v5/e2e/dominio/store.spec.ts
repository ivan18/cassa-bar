// Lo store intero, con un archivio in memoria al posto del localStorage e un PIN di prova al posto di quello della build.
import { expect, test } from '@playwright/test';
import { creaPin } from '../../src/dominio/pin';
import { archivioInMemoria, creaArchivio } from '../../src/stato/archivio';
import { CHIAVE_ARCHIVIO, creaStore } from '../../src/stato/store';
import { ADESSO } from './aiuti';

async function nuovoStore(archivio = archivioInMemoria()) {
  const store = creaStore({ archivio, pinBuild: await creaPin('1234') });
  return { store, archivio, s: () => store.getState() };
}
const id = (nome: string, s: { prodotti: { id: string; nome: string }[] }) => s.prodotti.find(p => p.nome === nome)!.id;

test('una serata: soci al tavolo, comanda, conto salvato, quota di un socio, saldo', async () => {
  const { s } = await nuovoStore();
  s().selezionaTavolo('Tavolo 3');
  s().cambiaSeduto('Andrea');
  s().cambiaSeduto('Chiara');
  s().aggiungiProdotto(id('Dreher 66 cl', s()), ['Andrea']);
  s().aggiungiProdotto(id('Coca Cola', s()), ['Chiara']);
  s().aggiungiExtra(50, 'corretto', ['']);
  expect(s().salvaConto(ADESSO)).toBe(true);
  expect(s().comanda).toEqual({ tavolo: 'Banco', voci: [] });
  expect(s().contiAperti.map(c => c.tavolo)).toEqual(['Tavolo 3']);

  // dal conto aperto: paga la quota di Andrea
  const voci = s().contiAperti[0]!.voci;
  const v1 = s().incassa({ tipo: 'conto', tavolo: 'Tavolo 3' }, voci.map(v => (v.socio === 'Andrea' ? v.qta : 0)), ADESSO);
  expect(v1).toMatchObject({ pagatoDa: 'Andrea', totale: 200, tavolo: 'Tavolo 3', ora: '22:14' });
  expect(s().seduti['Tavolo 3']).toEqual(['Chiara']); // Andrea ha pagato tutto: esce

  // riaperto alla cassa, si salda il resto
  s().selezionaTavolo('Tavolo 3');
  const v2 = s().incassa({ tipo: 'comanda' }, s().comanda.voci.map(v => v.qta), ADESSO);
  expect(v2).toMatchObject({ pagatoDa: 'Intero tavolo', totale: 200 });
  expect(s().contiAperti).toEqual([]);
  expect(s().seduti['Tavolo 3']).toEqual([]);
  expect(s().comanda.tavolo).toBe('Banco');
  expect(s().vendite.map(v => v.totale)).toEqual([200, 200]);
});

test('incasso rifiutato se non c\'è niente da pagare o la selezione non corrisponde', async () => {
  const { s } = await nuovoStore();
  expect(s().incassa({ tipo: 'comanda' }, [], ADESSO)).toBeNull();
  s().aggiungiProdotto(id('Caffè', s()), ['']);
  expect(s().incassa({ tipo: 'comanda' }, [0], ADESSO)).toBeNull();
  expect(s().incassa({ tipo: 'comanda' }, [1, 1], ADESSO)).toBeNull();
  expect(s().incassa({ tipo: 'conto', tavolo: 'Tavolo 6' }, [1], ADESSO)).toBeNull();
  expect(s().vendite).toEqual([]);
});

test('chiusura e incasso parziale di un credito', async () => {
  const { s } = await nuovoStore();
  s().selezionaTavolo('Tavolo 2');
  s().aggiungiProdotto(id('Peroni 66 cl', s()), ['']);
  s().aggiungiProdotto(id('Peroni 66 cl', s()), ['']);
  s().salvaConto(ADESSO);
  const chiusura = s().chiudiCassa({ cassiere: 'Paolo', consegnato: null, causale: '' }, ADESSO);
  expect(chiusura.creditiCreati).toBe(1);
  const credito = s().crediti[0]!;
  const v = s().incassa({ tipo: 'credito', id: credito.id }, [1], ADESSO);
  expect(v?.pagatoDa).toBe('Credito del 12/11');
  expect(s().crediti[0]?.voci[0]?.qta).toBe(1); // il credito resta con ciò che non è stato pagato
  s().incassa({ tipo: 'credito', id: credito.id }, [1], ADESSO);
  expect(s().crediti).toEqual([]);
});

test('i dati si salvano in un\'unica chiave e si ritrovano al riavvio; lo stato della UI no', async () => {
  const archivio = archivioInMemoria();
  const primo = await nuovoStore(archivio);
  primo.s().impostaFondo(0);
  primo.s().aggiungiSocio('Sara');
  primo.store.setState({ memoriaPiena: true });
  expect([...archivio.dati.keys()]).toEqual([CHIAVE_ARCHIVIO]);
  expect(JSON.parse(archivio.dati.get(CHIAVE_ARCHIVIO)!)).toMatchObject({ version: 1 });
  expect(archivio.dati.get(CHIAVE_ARCHIVIO)).not.toContain('memoriaPiena');

  const secondo = await nuovoStore(archivio);
  expect(secondo.s().fondo).toBe(0);
  expect(secondo.s().soci).toContain('Sara');
  expect(secondo.s().memoriaPiena).toBe(false);
});

test('memoria piena: l\'app non si blocca e lo segnala', async () => {
  const base = archivioInMemoria();
  let segnalata = 0;
  const store = creaStore({ archivio: creaArchivio(base, () => segnalata++), pinBuild: await creaPin('1234') });
  base.piena = true;
  store.getState().aggiungiSocio('Sara'); // il salvataggio fallisce, lo store continua a funzionare
  expect(store.getState().soci).toContain('Sara');
  expect(segnalata).toBeGreaterThan(0);
});

test('PIN: vale quello della build finché la configurazione non ne imposta uno', async () => {
  const { s } = await nuovoStore();
  expect(await s().verificaPin('1234')).toBe(true);
  const esito = await s().caricaConfigurazione(JSON.stringify({ tipo: 'cassa-bar-config', versione: 1, soci: ['Sara', 'andrea'], pin: '482915' }));
  expect(esito).toEqual({ ok: true, valore: ['Soci aggiunti: 1 (1 già presente).', 'PIN aggiornato.'] });
  expect(await s().verificaPin('1234')).toBe(false);
  expect(await s().verificaPin('482915')).toBe(true);
  expect(JSON.stringify(s().pin)).not.toContain('482915');
});

test('configurazione non valida: nessuna modifica, nemmeno ai soci', async () => {
  const { s } = await nuovoStore();
  const soci = s().soci;
  const esito = await s().caricaConfigurazione(JSON.stringify({ tipo: 'cassa-bar-config', versione: 1, soci: ['Sara'], pin: '12' }));
  expect(esito.ok).toBe(false);
  expect(s().soci).toEqual(soci);
  expect(s().pin).toBeNull();
});

test('backup: esporta e reimporta su un altro dispositivo; il PIN resta lo stesso', async () => {
  const a = await nuovoStore();
  await a.s().caricaConfigurazione(JSON.stringify({ tipo: 'cassa-bar-config', versione: 1, pin: '482915' }));
  a.s().aggiungiSocio('Sara');
  const { contenuto } = a.s().esportaBackup(ADESSO);
  expect(contenuto).not.toContain('482915');

  const b = await nuovoStore();
  expect(b.s().importaBackup(contenuto)).toEqual({ ok: true, valore: null });
  expect(b.s().soci).toContain('Sara');
  expect(await b.s().verificaPin('482915')).toBe(true);
  expect(b.s().importaBackup('{"tipo":"cassa-bar-config","versione":1}').ok).toBe(false);
});

test('eliminare un socio lo toglie dai tavoli; eliminare un conto svuota la sua comanda', async () => {
  const { s } = await nuovoStore();
  s().selezionaTavolo('Tavolo 4');
  s().cambiaSeduto('Marco');
  s().aggiungiProdotto(id('Fanta', s()), ['Marco']);
  s().eliminaSocio('Marco');
  expect(s().seduti['Tavolo 4']).toEqual([]);
  expect(s().comanda.voci[0]?.socio).toBe('Marco'); // la voce già battuta resta
  s().salvaConto(ADESSO);
  s().selezionaTavolo('Tavolo 4');
  s().eliminaConto('Tavolo 4');
  expect(s().contiAperti).toEqual([]);
  expect(s().comanda).toEqual({ tavolo: 'Tavolo 4', voci: [] });
});
