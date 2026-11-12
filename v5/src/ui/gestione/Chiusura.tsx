// Chiusura cassa in tre passi (D12): Riepilogo (con il fondo modificabile), Consegna, Conferma.
// I dati inseriti restano nel componente: se la Gestione si richiude o si cambia sezione la chiusura riparte,
// e nulla viene registrato finché non si tocca "Registra chiusura".
import { useState } from 'react';
import { fondoSuccessivo, incassato } from '../../dominio/chiusura';
import { contiOrdinati } from '../../dominio/conti';
import { euro, leggiImporto } from '../../dominio/formato';
import { useCassa } from '../../stato/cassa';
import { azzeraFondo, impostaFondo, registraChiusura } from '../azioni';
import { cx } from '../comuni/cx';
import { Foglio } from '../comuni/Foglio';
import { Pulsante } from '../comuni/Pulsante';
import { Riepilogo } from '../comuni/Riepilogo';
import { digitaImporto, Tastierino } from '../comuni/Tastierino';

const PASSI = ['Riepilogo', 'Consegna', 'Conferma'] as const;
type Passo = 1 | 2 | 3;

const campo = 'min-h-12 w-full rounded-xl border border-lav-4 bg-lav px-3.5 text-[15px] placeholder:text-gesso-dim/70 focus:border-ambra focus:outline-none';
const etichetta = 'text-xs font-semibold text-gesso-dim';
const nota = 'rounded-[10px] px-3 py-2.5 text-[13px]';

function Passi({ passo }: { passo: Passo }) {
  return (
    <ol aria-label="Passi della chiusura" className="grid grid-cols-3 gap-1.5">
      {PASSI.map((nome, i) => (
        <li key={nome} aria-current={passo === i + 1 ? 'step' : undefined} className="flex flex-col gap-1.5">
          <span aria-hidden="true" className={cx('h-1 rounded-full', i < passo ? 'bg-ambra' : 'bg-lav-4')} />
          <span className={cx('truncate text-xs', passo === i + 1 ? 'font-semibold text-gesso' : 'text-gesso-dim')}>{i + 1}. {nome}</span>
        </li>
      ))}
    </ol>
  );
}

function FoglioFondo({ onChiudi }: { onChiudi: () => void }) {
  const fondo = useCassa(s => s.fondo);
  const [testo, setTesto] = useState('');
  const nuovo = leggiImporto(testo);
  return (
    <Foglio
      titolo="Fondo cassa"
      onChiudi={onChiudi}
      testId="foglio-fondo"
      piede={
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Pulsante grande variante="principale" data-testid="imposta-fondo" disabled={nuovo === null} onClick={() => { if (nuovo !== null) { impostaFondo(nuovo); onChiudi(); } }}>
            {nuovo === null ? 'Imposta' : `Imposta ${euro(nuovo)}`}
          </Pulsante>
          <Pulsante variante="pericolo" data-testid="azzera-fondo" className="min-h-[54px]" onClick={() => { onChiudi(); azzeraFondo(); }}>Azzera</Pulsante>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-lav px-3 py-2">
          <span className="text-xs text-gesso-dim">Attuale</span>
          <strong className="whitespace-nowrap font-display text-[26px] leading-tight tabular-nums">{euro(fondo)}</strong>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-lav px-3 py-2">
          <span className="text-xs text-gesso-dim">Nuovo fondo</span>
          <strong data-testid="nuovo-fondo" className="whitespace-nowrap font-display text-[26px] leading-tight tabular-nums text-verde">{nuovo === null ? '—' : euro(nuovo)}</strong>
        </div>
      </div>
      <Tastierino sinistro="," onTasto={t => setTesto(c => digitaImporto(c, t))} />
    </Foglio>
  );
}

export function Chiusura() {
  const fondo = useCassa(s => s.fondo);
  const vendite = useCassa(s => s.vendite);
  const conti = useCassa(s => s.contiAperti);
  const [passo, setPasso] = useState<Passo>(1);
  const [cassiere, setCassiere] = useState('');
  const [consegnato, setConsegnato] = useState(''); // vuoto = tutto l'incasso
  const [causale, setCausale] = useState('');
  const [fondoAperto, setFondoAperto] = useState(false);

  const incasso = incassato(vendite);
  const consegna = consegnato.trim() === '' ? incasso : leggiImporto(consegnato);
  const tavoli = contiOrdinati(conti).map(c => c.tavolo);
  const prossimo = fondoSuccessivo(fondo, incasso, consegna ?? 0);

  return (
    <>
      <h1 className="font-display text-3xl font-bold leading-none">Chiusura cassa</h1>
      <Passi passo={passo} />

      {passo === 1 && (
        <section aria-label="Riepilogo" className="flex flex-col gap-3.5">
          <Riepilogo fondo={fondo} incassato={incasso} etichettaFondo="Fondo iniziale" />
          <Pulsante data-testid="modifica-fondo" className="self-start" onClick={() => setFondoAperto(true)}>Modifica fondo cassa</Pulsante>
          {tavoli.length > 0 && (
            <p data-testid="nota-conti" className={cx(nota, 'bg-ambra/15 text-gesso')}>
              {tavoli.length === 1 ? '1 conto aperto' : `${tavoli.length} conti aperti`} ({tavoli.join(', ')}) {tavoli.length === 1 ? 'passerà' : 'passeranno'} nei crediti e i tavoli verranno liberati.
            </p>
          )}
          <Pulsante grande variante="principale" data-testid="avanti" onClick={() => setPasso(2)}>Avanti</Pulsante>
        </section>
      )}

      {passo === 2 && (
        <section aria-label="Consegna" className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chiusura-cassiere" className={etichetta}>Cassiere</label>
            <input id="chiusura-cassiere" data-testid="cassiere" className={campo} value={cassiere} onChange={e => setCassiere(e.target.value)} placeholder="Nome di chi chiude" autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chiusura-consegnato" className={etichetta}>Consegnato al presidente</label>
            <input
              id="chiusura-consegnato"
              data-testid="consegnato"
              className={cx(campo, consegna === null && 'border-rosso focus:border-rosso')}
              value={consegnato}
              onChange={e => setConsegnato(e.target.value)}
              placeholder={`${euro(incasso)} (tutto l'incasso)`}
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={consegna === null}
              aria-describedby="chiusura-consegnato-aiuto"
            />
            <span id="chiusura-consegnato-aiuto" role={consegna === null ? 'alert' : undefined} className={cx('text-xs', consegna === null ? 'text-rosso' : 'text-gesso-dim')}>
              {consegna === null ? 'Scrivi un importo, per esempio 50 oppure 42,50.' : "Lascia vuoto per consegnare tutto l'incasso della serata."}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chiusura-causale" className={etichetta}>Causale</label>
            <input id="chiusura-causale" data-testid="causale" className={campo} value={causale} onChange={e => setCausale(e.target.value)} placeholder="Facoltativa" autoComplete="off" />
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <Pulsante grande className="px-5" onClick={() => setPasso(1)}>Indietro</Pulsante>
            <Pulsante grande variante="principale" data-testid="avanti" disabled={consegna === null} onClick={() => setPasso(3)}>Avanti</Pulsante>
          </div>
        </section>
      )}

      {passo === 3 && consegna !== null && (
        <section aria-label="Conferma" className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-3 rounded-[14px] bg-lav-2 p-3.5 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="text-gesso-dim">Cassiere</dt><dd className="text-right font-semibold">{cassiere.trim() || 'non indicato'}</dd>
              <dt className="text-gesso-dim">Incassato stasera</dt><dd className="whitespace-nowrap text-right font-semibold tabular-nums">{euro(incasso)}</dd>
              <dt className="text-gesso-dim">Consegnato al presidente</dt><dd data-testid="riepilogo-consegnato" className="whitespace-nowrap text-right font-semibold tabular-nums">{euro(consegna)}</dd>
              {causale.trim() && <><dt className="text-gesso-dim">Causale</dt><dd className="text-right font-semibold">{causale.trim()}</dd></>}
              <dt className="text-gesso-dim">Conti che diventano crediti</dt><dd className="text-right font-semibold tabular-nums">{tavoli.length}</dd>
            </dl>
            <div className="flex items-baseline justify-between gap-2.5 rounded-xl bg-lav px-3.5 py-2.5">
              <span className="text-xs text-gesso-dim">Fondo per domani</span>
              <strong data-testid="fondo-domani" className="whitespace-nowrap font-display text-[30px] leading-tight tabular-nums text-verde">{euro(prossimo)}</strong>
            </div>
          </div>
          {consegna > fondo + incasso && (
            <p role="alert" className={cx(nota, 'bg-rosso/15 text-rosso')}>Il consegnato supera il contante in cassa ({euro(fondo + incasso)}): il fondo per domani sarà zero.</p>
          )}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <Pulsante grande className="px-5" onClick={() => setPasso(2)}>Indietro</Pulsante>
            <Pulsante
              grande
              variante="principale"
              data-testid="registra-chiusura"
              onClick={() => registraChiusura({ cassiere, consegnato: consegnato.trim() === '' ? null : consegna, causale })}
            >
              Registra chiusura
            </Pulsante>
          </div>
        </section>
      )}

      {fondoAperto && <FoglioFondo onChiudi={() => setFondoAperto(false)} />}
    </>
  );
}
