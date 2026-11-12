// Report stampabile: rendiconto della serata in corso o di una chiusura dell'archivio.
// Sullo schermo si vede in un foglio, su carta bianca come uscirà. In stampa esce un'altra copia, montata
// direttamente sotto <body> (portal): lo scorrimento del foglio non taglia il PDF e il resto dell'app è nascosto (index.css).
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { riepilogoSerata } from '../../dominio/chiusura';
import { descriviVoci, totale } from '../../dominio/comanda';
import { dataCompleta, euro, oraBreve } from '../../dominio/formato';
import type { Credito, Intestazione, StatoDominio, VenditaArchiviata } from '../../dominio/tipi';
import { useCassa } from '../../stato/cassa';
import { ui, useUi, type Report } from '../../stato/ui';
import { cx } from '../comuni/cx';
import { Foglio } from '../comuni/Foglio';
import { Pulsante } from '../comuni/Pulsante';

interface DatiReport {
  titolo: string;
  sottotitolo: string;
  righe: [string, string][];
  /** null = chiusura senza dettaglio delle vendite */
  vendite: VenditaArchiviata[] | null;
  /** solo nel report della serata */
  crediti?: Credito[];
}

/** Contenuto del report; null se la chiusura richiesta non c'è più. */
export function datiReport(r: Report, s: StatoDominio, adesso: Date): DatiReport | null {
  if (r.tipo === 'serata') {
    const n = riepilogoSerata(s);
    return {
      titolo: 'Rendiconto della serata',
      sottotitolo: `Vendite dall'ultima chiusura · ${dataCompleta(adesso)}, ${oraBreve(adesso)}`,
      righe: [
        ['Fondo cassa iniziale', euro(n.fondo)],
        ['Totale incassato', euro(n.incassato)],
        ['Totale in cassa', euro(n.inCassa)],
        ['Crediti da incassare', euro(n.crediti)],
      ],
      vendite: [...s.vendite].reverse(), // dalla più vecchia
      crediti: s.crediti,
    };
  }
  const c = s.chiusure.find(x => x.id === r.id);
  if (!c) return null;
  return {
    titolo: 'Chiusura cassa',
    sottotitolo: `${c.data}, ${c.ora}`,
    righe: [
      ['Cassiere', c.cassiere || '—'],
      ['Fondo cassa iniziale', euro(c.fondoIniziale)],
      ['Totale incassato', euro(c.incassato)],
      ['Totale in cassa', euro(c.fondoIniziale + c.incassato)],
      ['Consegnato al presidente', euro(c.consegnato)],
      ['Fondo cassa per il giorno dopo', euro(c.fondoSuccessivo)],
      ['Causale', c.causale || '—'],
      ['Conti passati nei crediti', String(c.creditiCreati)],
    ],
    vendite: c.vendite,
  };
}

const cella = 'border-b border-[#dcdcd4] px-1.5 py-[5px] text-left align-top';
const intestazioneCella = cx(cella, 'text-[10px] font-semibold uppercase tracking-wider text-[#555b57]');
const sezione = 'mt-1 text-[11px] font-semibold uppercase tracking-widest text-[#555b57]';
const nota = 'italic text-[#555b57]';

/** Tabella larga: sullo schermo scorre di lato, in stampa occupa la pagina. */
function TabellaLarga({ stampa, children }: { stampa: boolean; children: ReactNode }) {
  const tabella = <table className={cx('w-full border-collapse tabular-nums', !stampa && 'min-w-[500px]')}>{children}</table>;
  if (stampa) return tabella;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-[#555b57] min-[560px]:hidden">Scorri la tabella di lato per vedere voci e totali →</span>
      <div className="overflow-x-auto">{tabella}</div>
    </div>
  );
}

function Carta({ dati, intestazione, stampa }: { dati: DatiReport; intestazione: Intestazione; stampa: boolean }) {
  const { vendite, crediti } = dati;
  return (
    <article
      data-testid={stampa ? 'report-stampa' : 'report'}
      className={cx('flex flex-col gap-3 bg-carta text-xs text-inchiostro', !stampa && 'rounded-md p-4 shadow-[0_2px_10px_rgb(0_0_0/.3)] min-[400px]:p-[18px]')}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-inchiostro pb-2">
        <b className="font-display text-[22px] leading-none">{intestazione.associazione}</b>
        <span className="text-[#555b57]">{intestazione.cassa}</span>
      </header>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="text-[15px]">{dati.titolo}</strong>
        <span className="text-[#555b57]">{dati.sottotitolo}</span>
      </div>
      <table className="w-full border-collapse tabular-nums">
        <tbody>
          {dati.righe.map(([k, v]) => (
            <tr key={k}><td className={cella}>{k}</td><td className={cx(cella, 'whitespace-nowrap text-right font-semibold')}>{v}</td></tr>
          ))}
        </tbody>
      </table>

      <h3 className={sezione}>Vendite{vendite ? ` (${vendite.length})` : ''}</h3>
      {!vendite ? (
        <p className={nota}>Dettaglio non disponibile: questa chiusura viene da una versione precedente e non ha le vendite archiviate.</p>
      ) : vendite.length === 0 ? (
        <p className={nota}>Nessuna vendita.</p>
      ) : (
        <TabellaLarga stampa={stampa}>
          <thead>
            <tr><th className={intestazioneCella}>Ora</th><th className={intestazioneCella}>Tavolo</th><th className={intestazioneCella}>Pagato da</th><th className={intestazioneCella}>Voci</th><th className={cx(intestazioneCella, 'text-right')}>Totale</th></tr>
          </thead>
          <tbody>
            {vendite.map((v, i) => (
              <tr key={i} data-riga-vendita>
                <td className={cella}>{v.ora}</td><td className={cx(cella, 'whitespace-nowrap')}>{v.tavolo}</td><td className={cella}>{v.pagatoDa}</td>
                <td className={cella}>{descriviVoci(v.voci)}</td><td className={cx(cella, 'whitespace-nowrap text-right')}>{euro(v.totale)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="border-t-2 border-inchiostro px-1.5 py-[5px] font-bold">Totale</td>
              <td className="whitespace-nowrap border-t-2 border-inchiostro px-1.5 py-[5px] text-right font-bold">{euro(vendite.reduce((t, v) => t + v.totale, 0))}</td>
            </tr>
          </tbody>
        </TabellaLarga>
      )}

      {crediti && (
        <>
          <h3 className={sezione}>Crediti da incassare ({crediti.length})</h3>
          {crediti.length === 0 ? <p className={nota}>Nessun credito.</p> : (
            <TabellaLarga stampa={stampa}>
              <thead>
                <tr><th className={intestazioneCella}>Del</th><th className={intestazioneCella}>Tavolo</th><th className={intestazioneCella}>Voci</th><th className={cx(intestazioneCella, 'text-right')}>Totale</th></tr>
              </thead>
              <tbody>
                {crediti.map(c => (
                  <tr key={c.id}>
                    <td className={cella}>{c.dataChiusura}</td><td className={cx(cella, 'whitespace-nowrap')}>{c.tavolo}</td>
                    <td className={cella}>{descriviVoci(c.voci)}</td><td className={cx(cella, 'whitespace-nowrap text-right')}>{euro(totale(c.voci))}</td>
                  </tr>
                ))}
              </tbody>
            </TabellaLarga>
          )}
        </>
      )}
    </article>
  );
}

function ContenutoReport({ report }: { report: Report }) {
  const stato = useCassa(s => s);
  const dati = datiReport(report, stato, new Date());
  const chiudi = () => ui.getState().chiudiReport();
  if (!dati) return null;
  return (
    <>
      <Foglio
        titolo="Report"
        onChiudi={chiudi}
        chiudiFuori
        largo
        testId="foglio-report"
        piede={<Pulsante grande variante="principale" data-testid="stampa" onClick={() => window.print()}>Stampa o salva PDF</Pulsante>}
      >
        <Carta dati={dati} intestazione={stato.intestazione} stampa={false} />
        <p className="text-xs text-gesso-dim">Si apre la stampa del browser: scegli la stampante oppure "Salva come PDF". Su alcune app installate su iPhone la stampa non c'è: apri il sito in Safari.</p>
      </Foglio>
      {createPortal(<div className="solo-stampa"><Carta dati={dati} intestazione={stato.intestazione} stampa /></div>, document.body)}
    </>
  );
}

export function FoglioReport() {
  const report = useUi(s => s.report);
  return report ? <ContenutoReport report={report} /> : null;
}
