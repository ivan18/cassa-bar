// Soci: iscrizione (i doppioni vengono ignorati), elenco alfabetico con filtro A–Z, dove è seduto, Elimina con conferma.
import { useState, type FormEvent } from 'react';
import type { Tavolo } from '../../dominio/costanti';
import { useCassa } from '../../stato/cassa';
import { eliminaSocio, iscriviSocio } from '../azioni';
import { FiltroAZ, filtraPerIniziale } from '../comuni/FiltroAZ';
import { Pulsante } from '../comuni/Pulsante';

export function Soci() {
  const soci = useCassa(s => s.soci);
  const seduti = useCassa(s => s.seduti);
  const [nome, setNome] = useState('');
  const [lettera, setLettera] = useState('');
  const elenco = filtraPerIniziale(soci, lettera);
  const tavoliDi = (socio: string) => (Object.entries(seduti) as [Tavolo, string[]][]).filter(([, m]) => m.includes(socio)).map(([t]) => t);

  const iscrivi = (e: FormEvent) => {
    e.preventDefault();
    if (iscriviSocio(nome)) setNome('');
  };

  return (
    <>
      <h1 className="font-display text-3xl font-bold leading-none">Soci <span className="text-gesso-dim">({soci.length})</span></h1>
      <form onSubmit={iscrivi} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="socio-nuovo" className="text-xs font-semibold text-gesso-dim">Nuovo socio</label>
          <input
            id="socio-nuovo"
            data-testid="socio-nuovo"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome e cognome"
            autoComplete="off"
            className="min-h-12 w-full rounded-xl border border-lav-4 bg-lav px-3.5 text-[15px] placeholder:text-gesso-dim/70 focus:border-ambra focus:outline-none"
          />
        </div>
        <Pulsante type="submit" variante="principale" data-testid="iscrivi" className="min-h-12">Iscrivi</Pulsante>
      </form>
      <FiltroAZ nomi={soci} lettera={lettera} onScegli={setLettera} />
      {soci.length === 0 ? (
        <p className="px-2.5 py-7 text-center text-[13px] text-gesso-dim">Nessun socio iscritto. Iscrivili qui o carica il file di configurazione da Dati.</p>
      ) : (
        <ul aria-label="Soci iscritti" className="flex flex-col divide-y divide-lav-3 overflow-hidden rounded-[14px] bg-lav-2 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
          {elenco.map(s => {
            const tavoli = tavoliDi(s);
            return (
              <li key={s} data-socio-iscritto={s} className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1 pl-3.5 pr-1.5">
                <span className="min-w-0">
                  <span className="text-sm font-semibold">{s}</span>
                  {tavoli.length > 0 && <small className="text-xs text-gesso-dim"> · seduto al {tavoli.join(', ')}</small>}
                </span>
                <button type="button" onClick={() => eliminaSocio(s)} className="min-h-10 rounded-lg px-3 text-[13px] font-semibold text-gesso-dim">Elimina</button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
