// Inserimento del PIN con il tastierino. Il PIN ha almeno 4 cifre ma può essere più lungo: si conferma con "Accedi".
// Nessun suggerimento del PIN a schermo.
import { useState } from 'react';
import { cassa } from '../../stato/cassa';
import { Pulsante } from './Pulsante';
import { Tastierino, type Tasto } from './Tastierino';

const MASSIMO = 12;

type Props = { onCorretto: () => void; onAnnulla?: () => void };

export function InserimentoPin({ onCorretto, onAnnulla }: Props) {
  const [pin, setPin] = useState('');
  const [errore, setErrore] = useState('');
  const [verifica, setVerifica] = useState(false);

  const tasto = (t: Tasto) => {
    setErrore('');
    if (t === 'C') setPin('');
    else if (t === '⌫') setPin(p => p.slice(0, -1));
    else if (t !== ',' && pin.length < MASSIMO) setPin(p => p + t);
  };

  const accedi = async () => {
    setVerifica(true);
    const ok = await cassa.getState().verificaPin(pin);
    setVerifica(false);
    if (ok) onCorretto();
    else { setPin(''); setErrore('PIN errato. Riprova.'); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-[22px] justify-center gap-3.5" data-testid="pin-punti" aria-label={`${pin.length} cifre inserite`}>
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <i key={i} className={i < pin.length ? 'h-3.5 w-3.5 rounded-full border-2 border-ambra bg-ambra' : 'h-3.5 w-3.5 rounded-full border-2 border-gesso-dim'} />
        ))}
      </div>
      <div role="alert" className="min-h-5 text-center text-[13px] text-rosso">{errore}</div>
      <Tastierino onTasto={tasto} sinistro="C" />
      <div className="grid grid-cols-2 gap-2">
        {onAnnulla ? <Pulsante onClick={onAnnulla}>Annulla</Pulsante> : <span />}
        <Pulsante variante="principale" data-testid="accedi" onClick={accedi} disabled={pin.length < 4 || verifica}>Accedi</Pulsante>
      </div>
    </div>
  );
}
