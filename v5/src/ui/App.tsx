// Struttura dell'app: sezione aperta, comanda (barra su telefono, pannello da 1024 px), navigazione, finestre.
import { useEffect } from 'react';
import { ui, useUi } from '../stato/ui';
import { BarraComanda, Comanda } from './cassa/Comanda';
import { FogliCassa } from './cassa/FogliCassa';
import { SchermataCassa } from './cassa/SchermataCassa';
import { cx } from './comuni/cx';
import { Finestre } from './comuni/Finestre';
import { SchermataConti } from './conti/SchermataConti';
import { FoglioIncasso } from './incasso/FoglioIncasso';
import { Navigazione } from './Navigazione';
import { SchermataGestione, SchermataStorico } from './SchermateAltre';

/** Ogni tocco conta come attività; ogni 5 secondi si controlla il blocco automatico della Gestione (D8). */
function useBloccoAutomatico() {
  useEffect(() => {
    const tocco = () => ui.getState().tocco(Date.now());
    window.addEventListener('pointerdown', tocco, true);
    window.addEventListener('keydown', tocco, true);
    const controllo = setInterval(() => ui.getState().controllaBlocco(Date.now()), 5000);
    return () => {
      window.removeEventListener('pointerdown', tocco, true);
      window.removeEventListener('keydown', tocco, true);
      clearInterval(controllo);
    };
  }, []);
}

export function App() {
  const sezione = useUi(s => s.sezione);
  useBloccoAutomatico();
  const cassa = sezione === 'cassa';

  return (
    <div
      data-testid="app"
      className={cx(
        'grid h-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto_auto] [grid-template-areas:"main""barra""nav"]',
        'lg:grid-rows-[minmax(0,1fr)]',
        cassa
          ? 'lg:grid-cols-[92px_minmax(0,1fr)_340px] lg:[grid-template-areas:"nav_main_lato"]'
          : 'lg:grid-cols-[92px_minmax(0,1fr)] lg:[grid-template-areas:"nav_main"]',
      )}
    >
      <main className="flex flex-col gap-4 overflow-y-auto px-3.5 pb-5 pt-3.5 [grid-area:main] lg:px-6 lg:pb-6 lg:pt-[18px] [&>*]:flex-none">
        {sezione === 'cassa' && <SchermataCassa />}
        {sezione === 'conti' && <SchermataConti />}
        {sezione === 'storico' && <SchermataStorico />}
        {sezione === 'gestione' && <SchermataGestione />}
      </main>
      {cassa && (
        <>
          <div className="[grid-area:barra] lg:hidden"><BarraComanda /></div>
          <aside aria-label="Comanda" className="hidden min-h-0 flex-col border-l border-lav-3 bg-lav-2 [grid-area:lato] lg:flex">
            <Comanda />
          </aside>
        </>
      )}
      <div className="[grid-area:nav] lg:min-h-0"><Navigazione /></div>
      <FogliCassa />
      <FoglioIncasso />
      <Finestre />
    </div>
  );
}
