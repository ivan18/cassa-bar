// Riga in cima a ogni sezione: associazione · cassa (un tocco apre la modifica, come nella v4.2) e orologio.
// Sotto, se serve, l'avviso di memoria piena (D14).
import { Pencil } from 'lucide';
import { useEffect, useState } from 'react';
import { oraBreve } from '../dominio/formato';
import { useCassa } from '../stato/cassa';
import { ui } from '../stato/ui';
import { liberaSpazio } from './azioni';
import { Icona } from './comuni/Icona';

function useOra() {
  const [ora, setOra] = useState(() => oraBreve(new Date()));
  useEffect(() => {
    const t = setInterval(() => setOra(oraBreve(new Date())), 15_000);
    return () => clearInterval(t);
  }, []);
  return ora;
}

export function Intestazione() {
  const { associazione, cassa } = useCassa(s => s.intestazione);
  const memoriaPiena = useCassa(s => s.memoriaPiena);
  const ora = useOra();
  return (
    <>
      <div className="flex min-h-7 items-center justify-between gap-2">
        <button
          type="button"
          data-testid="intestazione"
          aria-label={`${associazione} · ${cassa}. Modifica intestazione`}
          onClick={() => ui.getState().apriFoglio('intestazione')}
          className="-ml-1 flex min-h-8 min-w-0 items-center gap-1.5 rounded-lg px-1 text-gesso-dim"
        >
          <span className="truncate text-[11px] font-semibold uppercase tracking-widest">{associazione} · {cassa}</span>
          <Icona icona={Pencil} className="h-3.5 w-3.5 flex-none" />
        </button>
        <span className="font-display text-lg tabular-nums text-gesso-dim">{ora}</span>
      </div>
      {memoriaPiena && (
        <div role="alert" data-testid="avviso-memoria" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-rosso/15 px-3.5 py-2.5 text-[13px] shadow-[inset_0_0_0_1px_rgb(232_112_91/.45)]">
          <span>Memoria piena: le ultime modifiche potrebbero non essere salvate.</span>
          <button type="button" onClick={liberaSpazio} className="min-h-10 rounded-lg bg-lav-4 px-3.5 text-[13px] font-bold">Libera spazio</button>
        </div>
      )}
    </>
  );
}
