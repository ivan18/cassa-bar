// Prodotti: listino per categoria; un tocco apre la scheda (nome, prezzo, categoria, colore da tavolozza, D10).
// Elimina sta in fondo alla scheda e chiede conferma.
import { useState } from 'react';
import { CATEGORIE, COLORI, type Categoria } from '../../dominio/costanti';
import { euro, leggiImporto } from '../../dominio/formato';
import type { DatiProdotto } from '../../dominio/prodotti';
import type { Prodotto } from '../../dominio/tipi';
import { cassa, useCassa } from '../../stato/cassa';
import { ui } from '../../stato/ui';
import { eliminaProdotto } from '../azioni';
import { Foglio } from '../comuni/Foglio';
import { Pulsante } from '../comuni/Pulsante';

const campo = 'min-h-12 w-full rounded-xl border border-lav-4 bg-lav px-3.5 text-[15px] placeholder:text-gesso-dim/70 focus:border-ambra focus:outline-none';
const etichetta = 'text-xs font-semibold text-gesso-dim';
const chip = 'min-h-10 rounded-full border border-lav-4 px-[15px] text-[13px] font-semibold aria-pressed:border-ambra aria-pressed:bg-ambra aria-pressed:text-ambra-ink';

const nuovo = (): DatiProdotto => ({ nome: '', categoria: 'Birre', prezzo: '', colore: COLORI[0] });
const daProdotto = (p: Prodotto): DatiProdotto => ({ id: p.id, nome: p.nome, categoria: p.categoria, prezzo: (p.prezzo / 100).toFixed(2).replace('.', ','), colore: p.colore });

function SchedaProdotto({ iniziale, onChiudi }: { iniziale: DatiProdotto; onChiudi: () => void }) {
  const [d, setD] = useState(iniziale);
  const [errore, setErrore] = useState('');
  const prezzo = leggiImporto(d.prezzo);
  const valido = d.nome.trim() !== '' && prezzo !== null && prezzo > 0;
  const cambia = (parte: Partial<DatiProdotto>) => { setD(x => ({ ...x, ...parte })); setErrore(''); };

  const salva = () => {
    const esito = cassa.getState().salvaProdotto(d);
    if (!esito.ok) { setErrore(esito.errore); return; }
    ui.getState().avvisa(`${d.nome.trim()} salvato.`);
    onChiudi();
  };

  return (
    <Foglio
      titolo={d.id ? 'Modifica prodotto' : 'Nuovo prodotto'}
      onChiudi={onChiudi}
      testId="foglio-prodotto"
      piede={
        <div className={d.id ? 'grid grid-cols-[minmax(0,1fr)_auto] gap-2' : 'flex'}>
          <Pulsante grande variante="principale" data-testid="salva-prodotto" disabled={!valido} onClick={salva}>Salva</Pulsante>
          {d.id && <Pulsante variante="pericolo" data-testid="elimina-prodotto" className="min-h-[54px]" onClick={() => eliminaProdotto(d.id!, onChiudi)}>Elimina</Pulsante>}
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="prodotto-nome" className={etichetta}>Nome</label>
        <input id="prodotto-nome" data-testid="prodotto-nome" className={campo} value={d.nome} onChange={e => cambia({ nome: e.target.value })} placeholder="Es. Spritz" autoComplete="off" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="prodotto-prezzo" className={etichetta}>Prezzo in euro</label>
        <input id="prodotto-prezzo" data-testid="prodotto-prezzo" className={campo} value={d.prezzo} onChange={e => cambia({ prezzo: e.target.value })} placeholder="0,00" inputMode="decimal" autoComplete="off" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={etichetta}>Categoria</span>
        <div role="group" aria-label="Categoria" className="flex flex-wrap gap-2">
          {CATEGORIE.map(c => <button key={c} type="button" aria-pressed={d.categoria === c} onClick={() => cambia({ categoria: c as Categoria })} className={chip}>{c}</button>)}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={etichetta}>Colore</span>
        <div role="group" aria-label="Colore" className="flex flex-wrap gap-2">
          {COLORI.map(c => (
            <button
              key={c}
              type="button"
              aria-pressed={d.colore === c}
              aria-label={`Colore ${COLORI.indexOf(c) + 1}`}
              onClick={() => cambia({ colore: c })}
              style={{ background: c }}
              className="h-10 w-10 rounded-full aria-pressed:shadow-[0_0_0_3px_theme(colors.lav.2),0_0_0_5px_theme(colors.gesso.DEFAULT)]"
            />
          ))}
        </div>
      </div>
      {/* anteprima del pulsante in Cassa */}
      <div aria-hidden="true" className="flex min-h-[88px] w-40 flex-col gap-2.5 rounded-[14px] bg-lav px-3 pb-[11px] pt-3 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
        <span className="h-4 w-4 rounded-full shadow-[0_0_0_3px_rgb(255_255_255/.06)]" style={{ background: d.colore }} />
        <span className="flex-1 truncate text-[13px] font-semibold leading-tight">{d.nome.trim() || 'Anteprima'}</span>
        <span className="font-display text-[22px] font-semibold leading-none tabular-nums">{euro(prezzo ?? 0)}</span>
      </div>
      {errore && <p role="alert" className="text-[13px] text-rosso">{errore}</p>}
    </Foglio>
  );
}

export function Prodotti() {
  const prodotti = useCassa(s => s.prodotti);
  const [scheda, setScheda] = useState<DatiProdotto | null>(null);
  const gruppi = CATEGORIE.map(c => [c, prodotti.filter(p => p.categoria === c)] as const).filter(([, ps]) => ps.length > 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-bold leading-none">Prodotti</h1>
        <Pulsante variante="principale" data-testid="nuovo-prodotto" onClick={() => setScheda(nuovo())}>+ Nuovo prodotto</Pulsante>
      </div>
      {gruppi.length === 0 && <p className="px-2.5 py-7 text-center text-[13px] text-gesso-dim">Il listino è vuoto. Aggiungi il primo prodotto.</p>}
      {gruppi.map(([categoria, ps]) => (
        <section key={categoria} aria-label={categoria} className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gesso-dim">{categoria}</span>
          <div className="flex flex-col divide-y divide-lav-3 overflow-hidden rounded-[14px] bg-lav-2 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
            {ps.map(p => (
              <button key={p.id} type="button" data-prodotto-listino={p.nome} onClick={() => setScheda(daProdotto(p))} className="grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2 text-left">
                <span aria-hidden="true" className="h-4 w-4 rounded-full" style={{ background: p.colore }} />
                <span className="truncate text-sm font-semibold">{p.nome}</span>
                <strong className="whitespace-nowrap font-display text-lg tabular-nums">{euro(p.prezzo)}</strong>
              </button>
            ))}
          </div>
        </section>
      ))}
      {scheda && <SchedaProdotto iniziale={scheda} onChiudi={() => setScheda(null)} />}
    </>
  );
}
