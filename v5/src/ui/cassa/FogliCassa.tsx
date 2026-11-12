// Fogli della Cassa: comanda (telefono), soci al tavolo con filtro A–Z, battuta extra (D9).
import { useState } from 'react';
import { euro, leggiImporto } from '../../dominio/formato';
import { cassa, useCassa } from '../../stato/cassa';
import { ui, useUi } from '../../stato/ui';
import { battiExtra } from '../azioni';
import { FiltroAZ, filtraPerIniziale } from '../comuni/FiltroAZ';
import { Foglio } from '../comuni/Foglio';
import { Pulsante } from '../comuni/Pulsante';
import { digitaImporto, Tastierino } from '../comuni/Tastierino';
import { Comanda } from './Comanda';
import { useTavolo } from './usaTavolo';

const chiudi = () => ui.getState().chiudiFoglio();

function FoglioSoci() {
  const { tavolo, seduti } = useTavolo();
  const soci = useCassa(s => s.soci);
  const [lettera, setLettera] = useState('');
  const elenco = filtraPerIniziale(soci, lettera);

  return (
    <Foglio
      titolo={`Soci al ${tavolo} (${seduti.length})`}
      onChiudi={chiudi}
      chiudiFuori
      testId="foglio-soci"
      piede={<Pulsante grande variante="principale" onClick={chiudi}>Fatto</Pulsante>}
    >
      <FiltroAZ nomi={soci} lettera={lettera} onScegli={setLettera} />
      <div className="grid grid-cols-2 gap-2">
        {elenco.map(s => (
          <button
            key={s}
            type="button"
            data-socio-scelta={s}
            aria-pressed={seduti.includes(s)}
            onClick={() => cassa.getState().cambiaSeduto(s)}
            className="flex min-h-12 items-center justify-between gap-1.5 rounded-xl bg-lav-3 px-3 text-left font-semibold aria-pressed:bg-gesso aria-pressed:text-lav"
          >
            <span className="truncate">{s}</span><span aria-hidden="true">{seduti.includes(s) ? '✓' : '+'}</span>
          </button>
        ))}
      </div>
    </Foglio>
  );
}

const RAPIDI = ['0,50', '1,00', '1,50', '2,00'];

function FoglioExtra() {
  const { seduti, attivo, tutti } = useTavolo();
  const [importo, setImporto] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const centesimi = leggiImporto(importo) ?? 0;
  const aChi = tutti ? `uno per ognuno dei ${seduti.length} soci` : attivo || 'Tavolo generico';

  const aggiungi = () => {
    battiExtra(centesimi, descrizione);
    ui.getState().avvisa(`${descrizione.trim().toUpperCase() || 'EXTRA'} da ${euro(centesimi)} aggiunto.`);
    chiudi();
  };

  return (
    <Foglio
      titolo="Extra"
      onChiudi={chiudi}
      testId="foglio-extra"
      piede={<Pulsante grande variante="principale" data-testid="aggiungi-extra" onClick={aggiungi} disabled={centesimi <= 0}>Aggiungi {euro(centesimi)}</Pulsante>}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="extra-descrizione" className="text-xs font-semibold text-gesso-dim">Descrizione (facoltativa)</label>
        <input
          id="extra-descrizione"
          data-testid="descrizione-extra"
          value={descrizione}
          onChange={e => setDescrizione(e.target.value)}
          placeholder="Es. Corretto"
          autoComplete="off"
          className="min-h-[46px] rounded-[10px] border border-lav-4 bg-lav-2 px-3 text-base text-gesso placeholder:text-[#75817a]"
        />
      </div>
      <div className="flex items-baseline justify-between gap-2.5 rounded-xl bg-lav px-3.5 py-2.5">
        <span className="text-xs text-gesso-dim">Importo · {aChi}</span>
        <strong data-testid="extra-importo" className="whitespace-nowrap font-display text-[30px] leading-tight tabular-nums">{euro(centesimi)}</strong>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {RAPIDI.map(r => (
          <button key={r} type="button" data-rapido={r} onClick={() => setImporto(r)} className="min-h-[42px] whitespace-nowrap rounded-[10px] bg-lav-4 text-[13px] font-bold">
            € {r}
          </button>
        ))}
      </div>
      <Tastierino sinistro="," onTasto={t => setImporto(a => digitaImporto(a, t))} />
    </Foglio>
  );
}


export function FogliCassa() {
  const foglio = useUi(s => s.foglio);
  const tavolo = useCassa(s => s.comanda.tavolo);
  return (
    <>
      {foglio === 'comanda' && (
        <div className="lg:hidden">
          <Foglio titolo={tavolo} onChiudi={chiudi} chiudiFuori libero testId="foglio-comanda">
            <Comanda nelFoglio />
          </Foglio>
        </div>
      )}
      {foglio === 'soci' && <FoglioSoci />}
      {foglio === 'extra' && <FoglioExtra />}
    </>
  );
}
