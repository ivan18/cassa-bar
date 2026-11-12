// Dati del tavolo su cui si sta lavorando, letti con riferimenti stabili (vincolo dei selettori di Zustand).
import { useCassa } from '../../stato/cassa';
import { socioEffettivo, useUi } from '../../stato/ui';
import { NESSUNO } from '../comuni/cx';

export function useTavolo() {
  const comanda = useCassa(s => s.comanda);
  const seduti = useCassa(s => s.seduti[s.comanda.tavolo] ?? NESSUNO) as readonly string[];
  const scelto = useUi(s => s.socioAttivo);
  const tutti = useUi(s => s.tutti) && seduti.length > 0;
  return { tavolo: comanda.tavolo, voci: comanda.voci, seduti, attivo: socioEffettivo(seduti, scelto), tutti };
}
