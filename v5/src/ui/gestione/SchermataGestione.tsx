// Gestione: un solo PIN (D8), poi il menu delle voci. Chiusura e Archivio sono attive dalla Fase 5;
// Prodotti, Soci e Dati arrivano nella Fase 6.
import { useCassa } from '../../stato/cassa';
import { ui, useUi, type VoceGestione } from '../../stato/ui';
import { InserimentoPin } from '../comuni/InserimentoPin';
import { Pulsante } from '../comuni/Pulsante';
import { Intestazione } from '../Intestazione';
import { Archivio } from './Archivio';
import { Chiusura } from './Chiusura';

const voce = 'grid min-h-[60px] grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.5 rounded-[14px] bg-lav-2 p-3.5 text-left shadow-[inset_0_0_0_1px_theme(colors.lav.3)]';

function Menu() {
  const chiusure = useCassa(s => s.chiusure.length);
  const conti = useCassa(s => s.contiAperti.length);
  const attive: [Exclude<VoceGestione, 'menu'>, string, string][] = [
    ['chiusura', 'Chiusura cassa', `Fine serata: fondo, consegna al presidente${conti ? `, ${conti === 1 ? '1 conto' : `${conti} conti`} in crediti` : ''}`],
    ['archivio', 'Archivio chiusure', chiusure === 1 ? '1 chiusura registrata, con il report' : `${chiusure} chiusure registrate, con i report`],
  ];
  const inArrivo = [
    ['Prodotti', 'Listino: aggiungi, modifica, elimina'],
    ['Soci', 'Iscrizioni ed eliminazioni'],
    ['Dati', 'Backup, configurazione, intestazione, memoria'],
  ] as const;

  return (
    <>
      <h1 className="font-display text-3xl font-bold leading-none">Gestione</h1>
      <div data-testid="gestione-menu" className="flex flex-col gap-2">
        {attive.map(([id, titolo, descrizione]) => (
          <button key={id} type="button" data-testid={`voce-${id}`} onClick={() => ui.getState().apriVoceGestione(id)} className={voce}>
            <b className="text-[15px]">{titolo}</b>
            <span className="col-start-1 text-xs text-gesso-dim">{descrizione}</span>
            <span aria-hidden="true" className="col-start-2 row-span-2 row-start-1 self-center text-2xl leading-none text-gesso-dim">›</span>
          </button>
        ))}
        {inArrivo.map(([titolo, descrizione]) => (
          <div key={titolo} className={`${voce} opacity-60`}>
            <b className="text-[15px]">{titolo}</b>
            <span className="col-start-1 text-xs text-gesso-dim">{descrizione}</span>
            <span className="col-start-2 row-span-2 row-start-1 self-center text-xs text-gesso-dim">in arrivo</span>
          </div>
        ))}
      </div>
      <Pulsante data-testid="blocca" onClick={() => ui.getState().bloccaGestione()}>Blocca</Pulsante>
    </>
  );
}

export function SchermataGestione() {
  const sbloccata = useUi(s => s.gestioneSbloccata);
  const aperta = useUi(s => s.voceGestione);

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <Intestazione />
      {!sbloccata ? (
        <>
          <h1 className="font-display text-3xl font-bold leading-none">Gestione</h1>
          <div data-testid="gestione-bloccata" className="flex flex-col gap-3.5 rounded-[14px] bg-lav-2 p-3.5 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gesso-dim">Area protetta</span>
            <p className="text-gesso-dim">Chiusura cassa, archivio, prodotti, soci e dati. Inserisci il PIN.</p>
            <InserimentoPin onCorretto={() => ui.getState().sbloccaGestione(Date.now())} />
          </div>
        </>
      ) : aperta === 'menu' ? <Menu /> : (
        <>
          <button
            type="button"
            data-testid="torna-gestione"
            onClick={() => ui.getState().apriVoceGestione('menu')}
            className="-ml-1 flex min-h-10 items-center gap-1 self-start rounded-lg px-1 text-sm font-semibold text-gesso-dim"
          >
            <span aria-hidden="true" className="text-xl leading-none">‹</span> Gestione
          </button>
          {aperta === 'chiusura' ? <Chiusura /> : <Archivio />}
        </>
      )}
    </div>
  );
}
