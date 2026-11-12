// Conti: due viste, conti aperti (ordinati per tavolo) e crediti (D8).
import { perSocio, socioDi, totale } from '../../dominio/comanda';
import { contiOrdinati } from '../../dominio/conti';
import { euro } from '../../dominio/formato';
import type { Voce } from '../../dominio/tipi';
import { useCassa } from '../../stato/cassa';
import { ui, useUi } from '../../stato/ui';
import { eliminaConto, eliminaCredito, modificaConto } from '../azioni';
import { Intestazione } from '../Intestazione';
import { Pulsante } from '../comuni/Pulsante';

function VociPerSocio({ voci }: { voci: Voce[] }) {
  return (
    <div className="flex flex-col gap-[3px] text-[13px] text-gesso-dim">
      {perSocio(voci).map(g => (
        <span key={g.socio || '-'}>
          <b className="font-semibold text-gesso">{socioDi(g)}</b> · {g.voci.map(v => `${v.qta}× ${v.nome}`).join(', ')}
        </span>
      ))}
    </div>
  );
}

const scheda = 'flex flex-col gap-2.5 rounded-[14px] bg-lav-2 p-3.5 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]';
const segmento = 'min-h-[38px] whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold text-gesso-dim aria-pressed:bg-lav-4 aria-pressed:text-gesso';

export function SchermataConti() {
  const vista = useUi(s => s.vistaConti);
  const conti = useCassa(s => s.contiAperti);
  const crediti = useCassa(s => s.crediti);

  return (
    <>
      <Intestazione />
      <h1 className="font-display text-3xl font-bold leading-none">Conti</h1>
      <div role="group" aria-label="Vista" className="inline-flex gap-0.5 self-start rounded-[10px] bg-lav-2 p-[3px]">
        <button type="button" data-testid="vista-aperti" aria-pressed={vista === 'aperti'} onClick={() => ui.getState().scegliVistaConti('aperti')} className={segmento}>Aperti ({conti.length})</button>
        <button type="button" data-testid="vista-crediti" aria-pressed={vista === 'crediti'} onClick={() => ui.getState().scegliVistaConti('crediti')} className={segmento}>Crediti ({crediti.length})</button>
      </div>

      {vista === 'aperti' && (conti.length === 0
        ? <p className="px-2.5 py-7 text-center text-[13px] text-gesso-dim">Nessun conto aperto. I conti salvati dalla Cassa compaiono qui.</p>
        : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {contiOrdinati(conti).map(c => (
              <article key={c.id} data-conto={c.tavolo} className={scheda}>
                <div className="flex items-baseline justify-between gap-2">
                  <div><b className="font-display text-2xl leading-none">{c.tavolo}</b> <span className="text-xs text-gesso-dim">salvato alle {c.ora}</span></div>
                  <strong className="whitespace-nowrap font-display text-[26px] leading-none tabular-nums">{euro(totale(c.voci))}</strong>
                </div>
                <VociPerSocio voci={c.voci} />
                <div className="flex flex-wrap gap-2">
                  <Pulsante variante="principale" className="flex-1" onClick={() => ui.getState().apriIncasso({ tipo: 'conto', tavolo: c.tavolo })}>Incassa</Pulsante>
                  <Pulsante onClick={() => modificaConto(c.tavolo)}>Modifica</Pulsante>
                  <Pulsante variante="pericolo" onClick={() => eliminaConto(c.tavolo)}>Elimina</Pulsante>
                </div>
              </article>
            ))}
          </div>
        ))}

      {vista === 'crediti' && (
        <>
          <div className="flex flex-col gap-0.5 rounded-xl bg-lav-2 px-3 py-2.5 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gesso-dim">Totale sospesi</span>
            <strong data-testid="totale-crediti" className="font-display text-[22px] leading-tight text-ambra tabular-nums">
              {euro(crediti.reduce((s, c) => s + totale(c.voci), 0))}
            </strong>
          </div>
          {crediti.length === 0
            ? <p className="px-2.5 py-7 text-center text-[13px] text-gesso-dim">Nessun credito da incassare. Alla chiusura i conti ancora aperti diventano crediti.</p>
            : (
              <div className="grid gap-2.5 lg:grid-cols-2">
                {crediti.map(c => (
                  <article key={c.id} data-credito={c.tavolo} className={scheda}>
                    <div className="flex items-baseline justify-between gap-2">
                      <div><b className="font-display text-2xl leading-none">{c.tavolo}</b> <span className="text-xs text-gesso-dim">chiusura del {c.dataChiusura}, {c.ora}</span></div>
                      <strong className="whitespace-nowrap font-display text-[26px] leading-none tabular-nums">{euro(totale(c.voci))}</strong>
                    </div>
                    <VociPerSocio voci={c.voci} />
                    <div className="flex flex-wrap gap-2">
                      <Pulsante variante="principale" className="flex-1" onClick={() => ui.getState().apriIncasso({ tipo: 'credito', id: c.id })}>Incassa credito</Pulsante>
                      <Pulsante variante="pericolo" onClick={() => eliminaCredito(c.id)}>Elimina</Pulsante>
                    </div>
                  </article>
                ))}
              </div>
            )}
        </>
      )}
    </>
  );
}
