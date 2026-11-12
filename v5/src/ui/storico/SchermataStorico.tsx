// Storico: vendite dall'ultima chiusura (la più recente in alto) con chi ha pagato; fondo, incassato e
// totale in cassa in cima; report della serata da stampare. Non è protetto dal PIN, come nella v4.2.
import { incassato } from '../../dominio/chiusura';
import { descriviVoci } from '../../dominio/comanda';
import { euro } from '../../dominio/formato';
import { useCassa } from '../../stato/cassa';
import { ui } from '../../stato/ui';
import { Intestazione } from '../Intestazione';
import { Pulsante } from '../comuni/Pulsante';
import { Riepilogo } from '../comuni/Riepilogo';

export function SchermataStorico() {
  const vendite = useCassa(s => s.vendite);
  const fondo = useCassa(s => s.fondo);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <Intestazione />
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold leading-none">Storico</h1>
          <p className="text-[13px] text-gesso-dim">Vendite dall'ultima chiusura.</p>
        </div>
        <Pulsante data-testid="report-serata" onClick={() => ui.getState().apriReport({ tipo: 'serata' })}>Report della serata</Pulsante>
      </div>
      <Riepilogo fondo={fondo} incassato={incassato(vendite)} />

      {vendite.length === 0 ? (
        <p className="px-2.5 py-7 text-center text-[13px] text-gesso-dim">Nessuna vendita dall'ultima chiusura.</p>
      ) : (
        <ol aria-label="Vendite" className="flex flex-col divide-y divide-lav-3 rounded-[14px] bg-lav-2 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
          {vendite.map(v => (
            <li key={v.id} data-vendita={v.pagatoDa} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 px-3.5 py-2.5">
              <time className="font-display text-base tabular-nums text-gesso-dim">{v.ora}</time>
              <span className="min-w-0 text-sm"><b className="font-semibold">{v.pagatoDa}</b> <span className="text-gesso-dim">· {v.tavolo}</span></span>
              <strong className="whitespace-nowrap font-display text-xl tabular-nums">{euro(v.totale)}</strong>
              <span className="col-start-2 col-end-4 text-xs text-gesso-dim">{descriviVoci(v.voci)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
