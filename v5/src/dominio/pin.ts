// PIN: verifica con SHA-256 (salt + PIN), creazione di un PIN nuovo. Il PIN in chiaro non si salva mai.
import { esadecimaleCasuale } from './formato';
import type { PinSalvato } from './tipi';

export const pinVerificabile = () => typeof crypto !== 'undefined' && !!crypto.subtle;

export async function sha256Hex(testo: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

/** Solo cifre, almeno 4: si digita col tastierino. */
export const pinValido = (pin: string) => /^\d{4,}$/.test(pin);

export async function verificaPin(inserito: string, pin: PinSalvato): Promise<boolean> {
  if (!inserito) return false;
  return (await sha256Hex(pin.salt + inserito)) === pin.hash;
}

export async function creaPin(pin: string): Promise<PinSalvato> {
  const salt = esadecimaleCasuale(16);
  return { salt, hash: await sha256Hex(salt + pin) };
}
