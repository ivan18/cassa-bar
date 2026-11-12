// Incasso per quantità: chi paga (tavolo intero, quota di un socio, niente), quante unità di ogni voce,
// contante con tastierino e tasti rapidi, resto. Dalla comanda, da un conto aperto o da un credito.
// Non si chiude toccando fuori: la selezione non va persa per un tocco sbagliato.
import { useState } from 'react';
import { socioDi } from '../../dominio/comanda';
import { euro, leggiImporto } from '../../dominio/formato';
import { cambiaSelezione, daIncassare, mancano, preseleziona, resto, selezioneCompleta, sociConQuota, type Selezione } from '../../dominio/incasso';
import type { Voce } from '../../dominio/tipi';
import { cassa, useCassa } from '../../stato/cassa';
import type { OrigineIncasso } from '../../stato/store';
import { ui, useUi } from '../../stato/ui';
import { cx } from '../comuni/cx';
import { Foglio } from '../comuni/Foglio';
import { Pulsante } from '../comuni/Pulsante';
import { digitaImporto, Tastierino } from '../comuni/Tastierino';

const NESSUNA_VOCE: Voce[] = [];

/** Voci da incassare e titolo del foglio, secondo l'origine (riferimenti stabili per Zustand). */
function useDaIncassare(origine: OrigineIncasso): { voci: Voce[]; titolo: string } {
  const voci = useCassa(s =>
    origine.tipo === 'comanda' ? s.comanda.voci
      : origine.tipo === 'conto' ? s.contiAperti.find(c => c.tavolo === origine.tavolo)?.voci ?? NESSUNA_VOCE
        : s.crediti.find(c => c.id === origine.id)?.voci ?? NESSUNA_VOCE);
  const titolo = useCassa(s => {
    if (origine.tipo === 'credito') return `Credito · ${s.crediti.find(c => c.id === origine.id)?.tavolo ?? ''}`;
    return `Incasso · ${origine.tipo === 'conto' ? origine.tavolo : s.comanda.tavolo}`;
  });
  return { voci, titolo };
}

type Scelta = 'TUTTO' | 'MANUALE' | { socio: string };

const chip = 'min-h-10 flex-none whitespace-nowrap rounded-full border border-lav-4 px-[15px] text-[13px] font-semibold aria-pressed:border-ambra aria-pressed:bg-ambra aria-pressed:text-ambra-ink';
const schermo = 'flex items-baseline justify-between gap-2.5 rounded-xl bg-lav px-3.5 py-2.5';
const schermoPiccolo = 'flex min-w-0 flex-col gap-0.5 rounded-xl bg-lav px-3 py-2';

function Incasso({ origine }: { origine: OrigineIncasso }) {
  const { voci, titolo } = useDaIncassare(origine);
  const [sel, setSel] = useState<Selezione>(() => selezioneCompleta(voci));
  const [scelta, setScelta] = useState<Scelta>('TUTTO');
  const [contante, setContante] = useState('');

  const dovuto = daIncassare(voci, sel);
  const ricevuto = leggiImporto(contante) ?? 0;
  const soci = sociConQuota(voci);
  const chiudi = () => ui.getState().chiudiIncasso();

  const preselezione = (p: 'TUTTO' | 'NIENTE' | { socio: string }) => {
    setSel(preseleziona(voci, p));
    setScelta(p === 'NIENTE' ? 'MANUALE' : p);
    setContante('');
  };
  const cambia = (i: number, delta: number) => {
    setSel(s => cambiaSelezione(voci, s, i, delta));
    setScelta('MANUALE');
    setContante('');
  };

  const conferma = () => {
    const vendita = cassa.getState().incassa(origine, sel, new Date());
    chiudi();
    if (!vendita) return;
    const r = resto(vendita.totale, ricevuto);
    ui.getState().avvisa(`${vendita.pagatoDa}: incassati ${euro(vendita.totale)}${r > 0 ? ` · resto ${euro(r)}` : ''}`);
  };

  if (voci.length === 0) {
    return (
      <Foglio titolo={titolo} onChiudi={chiudi} testId="foglio-incasso">
        <p className="text-gesso-dim">Non c'è niente da incassare.</p>
      </Foglio>
    );
  }

  const manca = contante !== '' && ricevuto < dovuto;

  return (
    <Foglio
      titolo={titolo}
      onChiudi={chiudi}
      largo
      testId="foglio-incasso"
      piede={
        <Pulsante grande variante="principale" data-testid="conferma-incasso" onClick={conferma} disabled={dovuto === 0}>
          {dovuto > 0 ? `Conferma incasso ${euro(dovuto)}` : 'Seleziona cosa incassare'}
        </Pulsante>
      }
    >
      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gesso-dim">Chi paga</span>
            {scelta === 'MANUALE' && <small data-testid="selezione-manuale" className="text-[11px] text-ambra">selezione manuale</small>}
          </div>
          <div role="group" aria-label="Chi paga" className="flex flex-wrap gap-2">
            <button type="button" data-preset="tutto" aria-pressed={scelta === 'TUTTO'} onClick={() => preselezione('TUTTO')} className={chip}>Tavolo intero</button>
            {soci.map(m => (
              <button key={m} type="button" data-preset={m} aria-pressed={typeof scelta === 'object' && scelta.socio === m} onClick={() => preselezione({ socio: m })} className={chip}>
                {m}
              </button>
            ))}
            <button type="button" data-preset="niente" onClick={() => preselezione('NIENTE')} className={cx(chip, 'border-dashed text-gesso-dim')}>Niente</button>
          </div>
          {voci.map((v, i) => (
            <div key={v.id} data-voce-incasso={v.nome} data-socio={v.socio} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 rounded-[10px] bg-lav-3 px-2.5 py-2">
              <span className="text-[13px] font-semibold">{v.nome}</span>
              <span className="col-start-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-gesso-dim">
                <b className="whitespace-nowrap font-semibold text-gesso">{socioDi(v)}</b>
                <span className="whitespace-nowrap">{euro(v.prezzo)}</span>
                <span className="whitespace-nowrap" data-testid="quantita-scelta">{sel[i] ?? 0} di {v.qta}</span>
              </span>
              <span className="col-start-2 row-span-2 row-start-1 flex items-center gap-1">
                <button type="button" aria-label={`Paga un ${v.nome} in meno`} onClick={() => cambia(i, -1)} className="h-9 w-9 rounded-[10px] bg-lav-4 text-[19px] font-bold min-[341px]:h-10 min-[341px]:w-10">−</button>
                <output className="min-w-[26px] text-center font-display text-xl tabular-nums">{sel[i] ?? 0}</output>
                <button type="button" aria-label={`Paga un ${v.nome} in più`} onClick={() => cambia(i, 1)} className="h-9 w-9 rounded-[10px] bg-lav-4 text-[19px] font-bold min-[341px]:h-10 min-[341px]:w-10">+</button>
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className={schermo}>
            <span className="text-xs text-gesso-dim">Da incassare</span>
            <strong data-testid="da-incassare" className="whitespace-nowrap font-display text-[30px] leading-tight tabular-nums">{euro(dovuto)}</strong>
          </div>
          {/* contante e resto affiancati, sopra il tastierino: il resto si vede senza scorrere */}
          <div className="grid grid-cols-2 gap-2">
            <div className={schermoPiccolo}>
              <span className="text-xs text-gesso-dim">Contante</span>
              <strong data-testid="contante" className="whitespace-nowrap font-display text-[26px] leading-tight tabular-nums">{contante ? euro(ricevuto) : '—'}</strong>
            </div>
            <div className={schermoPiccolo}>
              <span className="text-xs text-gesso-dim">{manca ? 'Mancano' : 'Resto'}</span>
              <strong data-testid="resto" className={cx('whitespace-nowrap font-display text-[26px] leading-tight tabular-nums', manca ? 'text-rosso' : 'text-verde')}>
                {euro(manca ? mancano(dovuto, ricevuto) : resto(dovuto, ricevuto))}
              </strong>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 min-[341px]:grid-cols-5">
            <button type="button" data-rapido="esatto" onClick={() => setContante((dovuto / 100).toFixed(2).replace('.', ','))} className="min-h-[42px] whitespace-nowrap rounded-[10px] bg-lav-4 text-[13px] font-bold">Esatto</button>
            {[5, 10, 20, 50].map(n => (
              <button key={n} type="button" data-rapido={n} onClick={() => setContante(String(n))} className="min-h-[42px] whitespace-nowrap rounded-[10px] bg-lav-4 text-[13px] font-bold">€ {n}</button>
            ))}
          </div>
          <Tastierino sinistro="," onTasto={t => setContante(c => digitaImporto(c, t))} />
        </div>
      </div>
    </Foglio>
  );
}

/** Si monta di nuovo a ogni apertura: selezione e contante ripartono da zero. */
export function FoglioIncasso() {
  const origine = useUi(s => s.incasso);
  if (!origine) return null;
  const chiave = origine.tipo === 'comanda' ? 'comanda' : origine.tipo === 'conto' ? `conto-${origine.tavolo}` : `credito-${origine.id}`;
  return <Incasso key={chiave} origine={origine} />;
}
