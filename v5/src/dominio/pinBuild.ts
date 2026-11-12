// PIN della build: salt e hash inseriti da vite.config.ts. Vale finché il dispositivo non ne ha uno suo.
// Separato da pin.ts perché esiste solo nel codice compilato da Vite (i test del dominio non lo importano).
import type { PinSalvato } from './tipi';

export const PIN_BUILD: PinSalvato = { salt: __PIN_SALT__, hash: __PIN_HASH__ };
