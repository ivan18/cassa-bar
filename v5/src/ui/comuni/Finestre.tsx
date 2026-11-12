// Finestre globali dell'app: conferme/avvisi (al posto di confirm/alert, D12), richiesta del PIN, avviso breve.
import { useUi, ui } from '../../stato/ui';
import { cx } from './cx';
import { Foglio } from './Foglio';
import { InserimentoPin } from './InserimentoPin';
import { Pulsante } from './Pulsante';

export function Finestre() {
  const conferma = useUi(s => s.conferma);
  const richiestaPin = useUi(s => s.richiestaPin);
  const avviso = useUi(s => s.avviso);

  return (
    <>
      {richiestaPin && (
        <Foglio titolo="PIN richiesto" onChiudi={() => ui.getState().chiudiPin()} testId="foglio-pin">
          <div data-testid="pin-motivo" className="rounded-[10px] bg-lav px-3 py-2.5 text-[13px]">{richiestaPin.motivo}</div>
          <InserimentoPin
            onAnnulla={() => ui.getState().chiudiPin()}
            onCorretto={() => { ui.getState().chiudiPin(); richiestaPin.azione(); }}
          />
        </Foglio>
      )}

      {conferma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div role="alertdialog" aria-modal="true" aria-label={conferma.titolo} className="flex w-full max-w-[400px] flex-col gap-3.5 rounded-[18px] bg-lav-2 p-5">
            <h2 className={cx('font-display text-[26px] font-bold leading-tight', conferma.pericolo && !conferma.no && 'text-rosso')}>{conferma.titolo}</h2>
            <p className="whitespace-pre-line text-gesso-dim">{conferma.testo}</p>
            {conferma.no ? (
              <div className="grid grid-cols-2 gap-2">
                <Pulsante data-testid="conferma-no" onClick={() => ui.getState().chiudiConferma()}>{conferma.no}</Pulsante>
                <Pulsante
                  data-testid="conferma-si"
                  variante={conferma.pericolo ? 'pericolo' : 'principale'}
                  onClick={() => { ui.getState().chiudiConferma(); conferma.azione?.(); }}
                >
                  {conferma.si}
                </Pulsante>
              </div>
            ) : (
              <Pulsante grande variante="principale" data-testid="conferma-si" onClick={() => { ui.getState().chiudiConferma(); conferma.azione?.(); }}>
                {conferma.si}
              </Pulsante>
            )}
          </div>
        </div>
      )}

      {avviso && (
        <div
          role="status"
          data-testid="avviso"
          className="fixed bottom-[150px] left-1/2 z-[60] w-max max-w-[88%] -translate-x-1/2 rounded-xl bg-gesso px-4 py-2.5 text-center text-[13px] font-semibold text-lav shadow-[0_8px_24px_rgb(0_0_0/.4)] lg:bottom-8"
        >
          {avviso}
        </div>
      )}
    </>
  );
}
