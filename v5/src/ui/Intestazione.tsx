// Riga in cima a ogni sezione: associazione · cassa e orologio. (La modifica dell'intestazione arriva in Fase 6.)
import { useEffect, useState } from 'react';
import { oraBreve } from '../dominio/formato';
import { useCassa } from '../stato/cassa';

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
  const ora = useOra();
  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <span className="truncate text-[11px] font-semibold uppercase tracking-widest text-gesso-dim">
        {associazione} · {cassa}
      </span>
      <span className="font-display text-lg tabular-nums text-gesso-dim">{ora}</span>
    </div>
  );
}
