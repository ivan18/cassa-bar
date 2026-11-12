// Modifica dell'intestazione: nome dell'associazione e della cassa (un campo vuoto lascia il valore attuale).
import { useState, type FormEvent } from 'react';
import { cassa, useCassa } from '../../stato/cassa';
import { ui, useUi } from '../../stato/ui';
import { Foglio } from './Foglio';
import { Pulsante } from './Pulsante';

const campo = 'min-h-12 w-full rounded-xl border border-lav-4 bg-lav px-3.5 text-[15px] focus:border-ambra focus:outline-none';
const chiudi = () => ui.getState().chiudiFoglio();

function Modifica() {
  const attuale = useCassa(s => s.intestazione);
  const [associazione, setAssociazione] = useState(attuale.associazione);
  const [nomeCassa, setNomeCassa] = useState(attuale.cassa);
  const salva = (e?: FormEvent) => {
    e?.preventDefault();
    cassa.getState().impostaIntestazione(associazione, nomeCassa);
    chiudi();
    ui.getState().avvisa('Intestazione salvata.');
  };
  return (
    <Foglio
      titolo="Intestazione"
      onChiudi={chiudi}
      testId="foglio-intestazione"
      piede={
        <div className="grid grid-cols-2 gap-2">
          <Pulsante grande onClick={chiudi}>Annulla</Pulsante>
          <Pulsante grande variante="principale" data-testid="salva-intestazione" onClick={() => salva()}>Salva</Pulsante>
        </div>
      }
    >
      <form onSubmit={salva} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="intestazione-associazione" className="text-xs font-semibold text-gesso-dim">Associazione</label>
          <input id="intestazione-associazione" data-testid="intestazione-associazione" className={campo} value={associazione} onChange={e => setAssociazione(e.target.value)} autoComplete="off" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="intestazione-cassa" className="text-xs font-semibold text-gesso-dim">Nome della cassa</label>
          <input id="intestazione-cassa" data-testid="intestazione-cassa" className={campo} value={nomeCassa} onChange={e => setNomeCassa(e.target.value)} autoComplete="off" />
        </div>
        <button type="submit" hidden />
      </form>
    </Foglio>
  );
}

export function FoglioIntestazione() {
  return useUi(s => s.foglio) === 'intestazione' ? <Modifica /> : null;
}
