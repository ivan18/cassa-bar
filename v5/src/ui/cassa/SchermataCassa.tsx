// Cassa: tavoli, chi ordina, prodotti per categoria, riquadro Extra.
import type { ReactNode } from 'react';
import { TAVOLI, type Tavolo } from '../../dominio/costanti';
import { euro } from '../../dominio/formato';
import { useCassa } from '../../stato/cassa';
import { ui, useUi } from '../../stato/ui';
import { batti, selezionaTavolo } from '../azioni';
import { cx } from '../comuni/cx';
import { Intestazione } from '../Intestazione';
import { useTavolo } from './usaTavolo';

const chip = 'min-h-10 flex-none whitespace-nowrap rounded-full border border-lav-4 px-[15px] text-[13px] font-semibold text-gesso disabled:cursor-not-allowed disabled:opacity-40';
const chipScelto = 'aria-pressed:border-ambra aria-pressed:bg-ambra aria-pressed:text-ambra-ink';

function Titoletto({ testo, nota }: { testo: string; nota?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gesso-dim">{testo}</span>
      {nota && <small className="text-[11px] text-gesso-dim">{nota}</small>}
    </div>
  );
}

function Tavoli() {
  const { tavolo: corrente } = useTavolo();
  const seduti = useCassa(s => s.seduti);
  const conti = useCassa(s => s.contiAperti);
  const comanda = useCassa(s => s.comanda);
  const occupato = (t: Tavolo) =>
    (seduti[t]?.length ?? 0) > 0 || conti.some(c => c.tavolo === t) || (comanda.tavolo === t && comanda.voci.length > 0);

  return (
    <section className="flex flex-col gap-2">
      <Titoletto testo="Tavolo" nota={<><i className="mr-1 inline-block h-[7px] w-[7px] rounded-full bg-rosso align-[1px]" />occupato</>} />
      <div role="group" aria-label="Tavoli" className="grid grid-cols-4 gap-1.5 min-[480px]:grid-cols-[1.6fr_repeat(6,minmax(0,1fr))]">
        {TAVOLI.map(t => (
          <button
            key={t}
            type="button"
            data-tavolo={t}
            data-occupato={occupato(t) || undefined}
            aria-pressed={t === corrente}
            aria-label={`${t}${occupato(t) ? ', occupato' : ''}`}
            onClick={() => selezionaTavolo(t)}
            className="relative grid h-12 place-items-center rounded-xl border border-lav-4 bg-lav-2 aria-pressed:border-gesso aria-pressed:bg-gesso aria-pressed:text-lav"
          >
            <span className={cx('font-display font-bold leading-none', t === 'Banco' ? 'text-[17px] tracking-wide' : 'text-2xl')}>
              {t === 'Banco' ? 'Banco' : t.replace('Tavolo ', '')}
            </span>
            {occupato(t) && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-rosso" />}
          </button>
        ))}
      </div>
    </section>
  );
}

function ChiOrdina() {
  const { seduti, attivo, tutti } = useTavolo();
  return (
    <section className="flex flex-col gap-2">
      <Titoletto testo="Chi ordina" nota={seduti.length ? `${seduti.length} ${seduti.length === 1 ? 'seduto' : 'seduti'}` : 'nessuno seduto'} />
      <div role="group" aria-label="Chi ordina" data-testid="chi-ordina" className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="tutti"
          aria-pressed={tutti}
          disabled={seduti.length === 0}
          onClick={() => ui.getState().cambiaTutti()}
          className={cx(chip, 'aria-pressed:border-verde aria-pressed:bg-verde aria-pressed:text-[#0d2416]')}
        >
          Tutti{tutti ? ' ✓' : ''}
        </button>
        <button type="button" data-socio="" aria-pressed={!tutti && attivo === ''} onClick={() => ui.getState().scegliSocio('')} className={cx(chip, chipScelto)}>
          Generico
        </button>
        {seduti.map(m => (
          <button key={m} type="button" data-socio={m} aria-pressed={!tutti && attivo === m} onClick={() => ui.getState().scegliSocio(m)} className={cx(chip, chipScelto)}>
            {m}
          </button>
        ))}
        <button type="button" data-testid="apri-soci" onClick={() => ui.getState().apriFoglio('soci')} className={cx(chip, 'border-dashed text-gesso-dim')}>
          + Soci
        </button>
      </div>
    </section>
  );
}

function Prodotti() {
  const prodotti = useCassa(s => s.prodotti);
  const scelta = useUi(s => s.categoria);
  const categorie = ['Tutti', ...new Set(prodotti.map(p => p.categoria))];
  // una categoria rimasta senza prodotti (es. dopo un'eliminazione) non ha più il suo pulsante: si torna a Tutti
  const categoria = categorie.includes(scelta) ? scelta : 'Tutti';
  const elenco = prodotti.filter(p => categoria === 'Tutti' || p.categoria === categoria);

  return (
    <>
      <section className="flex flex-col gap-2">
        <Titoletto testo="Prodotti" nota={`${elenco.length} ${categoria === 'Tutti' ? 'in listino' : 'in ' + categoria}`} />
        <div role="group" aria-label="Categorie" className="flex flex-wrap gap-2">
          {categorie.map(c => (
            <button key={c} type="button" data-categoria={c} aria-pressed={c === categoria} onClick={() => ui.getState().scegliCategoria(c)} className={cx(chip, chipScelto)}>
              {c}
            </button>
          ))}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {elenco.map(p => (
          <button
            key={p.id}
            type="button"
            data-prodotto={p.nome}
            onClick={() => batti(p.id)}
            className="flex min-h-[88px] flex-col gap-2.5 rounded-[14px] bg-lav-2 px-3 pb-[11px] pt-3 text-left shadow-[inset_0_0_0_1px_theme(colors.lav.3)] active:bg-lav-3"
          >
            <span aria-hidden="true" className="h-4 w-4 rounded-full shadow-[0_0_0_3px_rgb(255_255_255/.06)]" style={{ background: p.colore }} />
            <span className="flex-1 text-[13px] font-semibold leading-tight">{p.nome}</span>
            <span className="font-display text-[22px] font-semibold leading-none tabular-nums">{euro(p.prezzo)}</span>
          </button>
        ))}
        <button
          type="button"
          data-testid="apri-extra"
          onClick={() => ui.getState().apriFoglio('extra')}
          className="flex min-h-[88px] flex-col gap-2.5 rounded-[14px] border border-dashed border-lav-4 px-3 pb-[11px] pt-3 text-left"
        >
          <span className="flex-1 text-[13px] font-semibold">Extra</span>
          <span className="font-display text-lg font-semibold leading-none text-ambra">importo libero</span>
        </button>
      </div>
    </>
  );
}

export function SchermataCassa() {
  return (
    <>
      <Intestazione />
      <Tavoli />
      <ChiOrdina />
      <Prodotti />
    </>
  );
}
