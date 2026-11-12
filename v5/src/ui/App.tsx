// Fase 1: schermata provvisoria che verifica colori, caratteri e icone. Le schermate vere arrivano dalla Fase 3.
import { Coffee } from 'lucide';
import { Icona } from './comuni/Icona';

export function App() {
  return (
    <main data-testid="app" className="mx-auto flex min-h-full max-w-xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-gesso-dim">Circolo di esempio · Cassa</span>
        <h1 data-testid="titolo" className="font-display text-4xl font-bold leading-none">Cassa v5</h1>
      </header>
      <p className="text-gesso-dim">
        Scheletro della Fase 1: React, TypeScript e Vite, con i colori e i caratteri del prototipo. Le schermate
        arriveranno dalla Fase 3.
      </p>
      <div className="flex w-40 flex-col gap-3 rounded-2xl bg-lav-2 p-3 shadow-[inset_0_0_0_1px_theme(colors.lav.3)]">
        <Icona icona={Coffee} className="h-5 w-5 text-ambra" />
        <span className="text-sm font-semibold">Caffè</span>
        <span className="font-display text-2xl font-semibold tabular-nums">€ 1,00</span>
      </div>
    </main>
  );
}
