// Archivio delle chiusure (D14): la più recente in alto, con Report ed Elimina (con conferma).
import { euro } from '../../dominio/formato';
import { useCassa } from '../../stato/cassa';
import { ui } from '../../stato/ui';
import { eliminaChiusura } from '../azioni';
import { Pulsante } from '../comuni/Pulsante';

export function Archivio() {
  const chiusure = useCassa(s => s.chiusure);

  return (
    <>
      <h1 className="font-display text-3xl font-bold leading-none">Archivio chiusure</h1>
      {chiusure.length === 0 ? (
        <p className="px-2.5 py-7 text-center text-[13px] text-gesso-dim">Nessuna chiusura registrata. Ogni chiusura cassa compare qui con il suo report.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {chiusure.map(c => (
            <article key={c.id} data-chiusura={c.data} className="flex flex-col gap-2.5 rounded-[14px] bg-lav-2 p-3.5 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <b className="font-display text-2xl leading-none">{c.data}</b>{' '}
                  <span className="text-xs text-gesso-dim">{c.ora}{c.cassiere ? ` · ${c.cassiere}` : ''}</span>
                </div>
                <strong className="whitespace-nowrap font-display text-[26px] leading-none tabular-nums">{euro(c.incassato)}</strong>
              </div>
              <div className="flex flex-col gap-[3px] text-[13px] text-gesso-dim">
                <span>Consegnato <b className="font-semibold text-gesso">{euro(c.consegnato)}</b> · fondo dopo <b className="font-semibold text-gesso">{euro(c.fondoSuccessivo)}</b></span>
                <span>
                  {c.vendite ? `${c.vendite.length === 1 ? '1 vendita archiviata' : `${c.vendite.length} vendite archiviate`}` : 'Vendite non archiviate (versione precedente)'}
                  {c.creditiCreati > 0 && ` · ${c.creditiCreati === 1 ? '1 credito creato' : `${c.creditiCreati} crediti creati`}`}
                </span>
              </div>
              <div className="flex gap-2">
                <Pulsante className="flex-1" onClick={() => ui.getState().apriReport({ tipo: 'chiusura', id: c.id })}>Report</Pulsante>
                <Pulsante variante="pericolo" onClick={() => eliminaChiusura(c.id)}>Elimina</Pulsante>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
