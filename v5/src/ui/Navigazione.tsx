// Navigazione a 4 sezioni (D8): in basso su telefono, a sinistra da 1024 px.
// Sulla voce Conti: rosso = conti aperti, ambra = crediti.
import { History, Lock, Receipt, Coffee } from 'lucide';
import type { IconNode } from 'lucide';
import { useCassa } from '../stato/cassa';
import { ui, useUi, type Sezione } from '../stato/ui';
import { Icona } from './comuni/Icona';

const VOCI: { sezione: Sezione; etichetta: string; icona: IconNode }[] = [
  { sezione: 'cassa', etichetta: 'Cassa', icona: Coffee },
  { sezione: 'conti', etichetta: 'Conti', icona: Receipt },
  { sezione: 'storico', etichetta: 'Storico', icona: History },
  { sezione: 'gestione', etichetta: 'Gestione', icona: Lock },
];

export function Navigazione() {
  const attiva = useUi(s => s.sezione);
  const aperti = useCassa(s => s.contiAperti.length);
  const crediti = useCassa(s => s.crediti.length);

  return (
    <nav
      aria-label="Sezioni"
      className="grid grid-cols-4 border-t border-lav-3 bg-lav-2 pb-[env(safe-area-inset-bottom)] lg:h-full lg:auto-rows-min lg:grid-cols-1 lg:content-start lg:gap-1.5 lg:border-r lg:border-t-0 lg:pb-0 lg:pt-3.5"
    >
      {VOCI.map(v => (
        <button
          key={v.sezione}
          type="button"
          data-testid={`nav-${v.sezione}`}
          aria-current={attiva === v.sezione ? 'page' : undefined}
          onClick={() => ui.getState().vai(v.sezione)}
          className="relative flex min-h-14 flex-col items-center justify-center gap-[3px] px-1 pb-[11px] pt-[9px] text-[11px] font-semibold tracking-wide text-gesso-dim aria-[current=page]:text-ambra lg:min-h-16 lg:text-xs"
        >
          <Icona icona={v.icona} className="h-[22px] w-[22px]" />
          {v.etichetta}
          {v.sezione === 'conti' && (aperti > 0 || crediti > 0) && (
            <span className="absolute left-[calc(50%+6px)] top-1 flex gap-0.5">
              {aperti > 0 && <span data-testid="badge-conti" aria-label={`${aperti} conti aperti`} className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rosso px-[5px] text-[11px] font-bold leading-none text-white">{aperti}</span>}
              {crediti > 0 && <span data-testid="badge-crediti" aria-label={`${crediti} crediti`} className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ambra px-[5px] text-[11px] font-bold leading-none text-ambra-ink">{crediti}</span>}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
