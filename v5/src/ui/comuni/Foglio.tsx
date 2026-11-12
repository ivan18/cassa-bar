// Foglio: dal basso su telefono, finestra centrata da 1024 px. Si chiude con × o Esc;
// toccando fuori solo se `chiudiFuori` (mai per fogli con dati inseriti: incasso, extra, PIN).
import { useEffect, type ReactNode } from 'react';
import { cx } from './cx';

type Props = {
  titolo: string;
  onChiudi: () => void;
  chiudiFuori?: boolean;
  largo?: boolean;
  /** il contenuto gestisce da sé margini e scorrimento (es. la comanda) */
  libero?: boolean;
  piede?: ReactNode;
  testId?: string;
  children: ReactNode;
};

export function Foglio({ titolo, onChiudi, chiudiFuori = false, largo = false, libero = false, piede, testId, children }: Props) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onChiudi]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 lg:items-center"
      onClick={chiudiFuori ? e => { if (e.target === e.currentTarget) onChiudi(); } : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titolo}
        data-testid={testId}
        className={cx(
          'flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-lav-2 motion-safe:animate-[sale_.18s_ease-out] lg:max-h-[90dvh] lg:rounded-2xl',
          largo ? 'lg:w-[860px]' : 'lg:w-[560px]',
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-1.5 pt-4">
          <h2 className="font-display text-[26px] font-bold leading-none">{titolo}</h2>
          <button type="button" onClick={onChiudi} aria-label="Chiudi" className="grid h-10 w-10 flex-none place-items-center rounded-full bg-lav-3 text-xl">
            ×
          </button>
        </div>
        {libero ? children : <div className="flex min-h-0 flex-col gap-3.5 overflow-y-auto px-4 pb-4 pt-2 [&>*]:flex-none">{children}</div>}
        {piede && <div className="flex flex-col gap-2.5 border-t border-lav-4 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">{piede}</div>}
      </div>
    </div>
  );
}
