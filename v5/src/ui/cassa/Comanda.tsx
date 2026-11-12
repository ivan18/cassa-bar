// Comanda: voci per socio con subtotale, quantità, riassegnazione, Svuota, totale, Salva conto e Incassa.
// Su tablet è il pannello a destra; su telefono sta nel foglio che si apre dalla barra.
import { articoli, perSocio, socioDi, totale } from '../../dominio/comanda';
import { TAVOLO_GENERICO } from '../../dominio/costanti';
import { euro } from '../../dominio/formato';
import { cassa } from '../../stato/cassa';
import { ui } from '../../stato/ui';
import { salvaConto, svuotaComanda } from '../azioni';
import { Pulsante } from '../comuni/Pulsante';
import { useTavolo } from './usaTavolo';

export function Comanda({ nelFoglio = false }: { nelFoglio?: boolean }) {
  const { tavolo, voci, seduti } = useTavolo();
  const gruppi = perSocio(voci);
  const opzioni = ['', ...seduti];

  return (
    <div data-testid="comanda" className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between px-4 pt-4">
        {nelFoglio
          ? <span className="text-[11px] font-semibold uppercase tracking-widest text-gesso-dim">Voci</span>
          : <h2 className="font-display text-[26px] font-bold leading-none">{tavolo}</h2>}
        {voci.length > 0 && (
          <button type="button" onClick={svuotaComanda} className="min-h-10 px-1.5 text-[13px] font-semibold text-gesso-dim underline underline-offset-[3px]">
            Svuota
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4">
        {voci.length === 0 && (
          <p className="px-2.5 py-7 text-center text-[13px] text-gesso-dim">Nessuna voce. Tocca un prodotto per iniziare la comanda di {tavolo}.</p>
        )}
        {gruppi.map(g => (
          <div key={g.socio || '-'} className="flex flex-col gap-1.5" data-gruppo={socioDi(g)}>
            <h4 className="flex justify-between text-xs font-semibold uppercase tracking-wider text-gesso-dim">
              {socioDi(g)}<span className="tabular-nums">{euro(g.totale)}</span>
            </h4>
            {g.voci.map(v => (
              <div key={v.id} data-voce={v.nome} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 rounded-[10px] bg-lav-3 px-2.5 py-2">
                <span className="text-[13px] font-semibold">{v.nome}</span>
                <span className="col-start-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gesso-dim">
                  <span className="whitespace-nowrap">{euro(v.prezzo)}</span>
                  <select
                    aria-label={`Assegna ${v.nome} a`}
                    value={v.socio}
                    onChange={e => cassa.getState().assegnaVoce(v.id, e.target.value)}
                    className="min-h-9 max-w-[150px] rounded-lg border border-lav-4 bg-lav-2 px-1.5 text-xs text-gesso"
                  >
                    {/* un socio non più seduto resta tra le opzioni finché ha voci */}
                    {[...opzioni, ...(opzioni.includes(v.socio) ? [] : [v.socio])].map(o => (
                      <option key={o || '-'} value={o}>{o || TAVOLO_GENERICO}</option>
                    ))}
                  </select>
                </span>
                <span className="col-start-2 row-span-2 row-start-1 flex items-center gap-1">
                  <button type="button" aria-label={`Togli un ${v.nome}`} onClick={() => cassa.getState().cambiaQuantita(v.id, -1)} className="h-9 w-9 rounded-[10px] bg-lav-4 text-[19px] font-bold min-[341px]:h-10 min-[341px]:w-10">−</button>
                  <output className="min-w-[26px] text-center font-display text-xl tabular-nums">{v.qta}</output>
                  <button type="button" aria-label={`Aggiungi un ${v.nome}`} onClick={() => cassa.getState().cambiaQuantita(v.id, 1)} className="h-9 w-9 rounded-[10px] bg-lav-4 text-[19px] font-bold min-[341px]:h-10 min-[341px]:w-10">+</button>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-lav-4 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-gesso-dim">{articoli(voci)} articoli</span>
          <strong data-testid="totale-comanda" className="font-display text-[34px] leading-none tabular-nums">{euro(totale(voci))}</strong>
        </div>
        <div className="grid grid-cols-[1fr_1.4fr] gap-2">
          <Pulsante data-testid="salva-conto" onClick={salvaConto} disabled={voci.length === 0}>Salva conto</Pulsante>
          <Pulsante data-testid="incassa" variante="principale" onClick={() => ui.getState().apriIncasso({ tipo: 'comanda' })} disabled={voci.length === 0}>Incassa</Pulsante>
        </div>
      </div>
    </div>
  );
}

/** Barra fissa su telefono (D11): tavolo, chi ordina, articoli, totale; toccandola si apre la comanda. */
export function BarraComanda() {
  const { tavolo, voci, attivo, tutti } = useTavolo();
  return (
    <div data-testid="barra-comanda" className="flex items-center gap-2 border-t border-lav-4 bg-lav-3 px-3 py-2.5">
      <button
        type="button"
        onClick={() => ui.getState().apriFoglio('comanda')}
        aria-label={`Apri la comanda di ${tavolo}`}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
      >
        <small className="truncate text-[11px] text-gesso-dim">{tavolo} · {tutti ? 'tutti' : attivo || 'generico'} · {articoli(voci)} art. ▴</small>
        <strong className="font-display text-[26px] leading-tight tabular-nums">{euro(totale(voci))}</strong>
      </button>
      <Pulsante onClick={salvaConto} disabled={voci.length === 0}>Salva</Pulsante>
      <Pulsante variante="principale" onClick={() => ui.getState().apriIncasso({ tipo: 'comanda' })} disabled={voci.length === 0}>Incassa</Pulsante>
    </div>
  );
}
