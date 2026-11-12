# Piano di lavoro — v5: riscrittura da zero (React + TypeScript + Vite)

Lavorare per fasi: per ogni fase un branch `feat/v5-…` aperto da `sviluppo/v5` e una PR verso `sviluppo/v5`. Su `main` la v5 arriva solo alla fine, con un'unica PR `sviluppo/v5` → `main`. All'inizio di ogni fase unire `main` in `sviluppo/v5`. Aggiornare questo file spuntando i punti man mano, e [STATO.md](STATO.md) a fine sessione.

Stato: ☐ da fare · ◐ in corso · ☑ fatto

**Avanzamento (2026-11-12):** piano approvato; Fase 0 chiusa (prototipo, D10–D14 approvate, D8–D9 da discutere). Fase 1 chiusa (scheletro, 10 test e2e verdi). Prossimo passo: Fase 2 (dominio, stato, persistenza).

## Contesto

Oggi l'app è un unico componente React `App` di ~1.700 righe in `src/orig.html` (JSX non tipizzato, stato in ~30 `useState`, logica di business mescolata alla UI, dialoghi nativi `confirm/alert`). Funziona (v4.2 pubblicata), ma ogni modifica tocca tutto il file e la logica (quote, incasso parziale, chiusura, crediti) non è isolabile.

Obiettivo: una **v5 riscritta da zero** con architettura a strati, TypeScript, Vite e **UI riprogettata**, che raggiunga la parità funzionale con la v4.2 (elenco in `docs/FUNZIONALITA.md`).

Decisioni già prese con l'utente (2026-11-12):
- riscrittura da zero, UI e flussi riprogettati (i test e2e vanno riscritti);
- **niente Python nella v5**: test e2e in TypeScript con `@playwright/test`;
- Vite + TypeScript; niente test unitari per ora (restano e2e + `tsc`);
- **migrazione del dispositivo v4.2 → v5: rimandata**, il dispositivo può ripartire da zero;
- **file unico offline / PWA / pubblicazione: punto aperto**, da discutere quando tutte le funzionalità esistenti sono implementate correttamente.

Fino al passaggio, la v4.2 resta pubblicata e intatta: root del repo, `src/orig.html`, `build.mjs` e `tests/test_cassa.py` non si toccano.

## Perché questa architettura

- **Branch di sviluppo `sviluppo/v5`** (deciso il 2026-11-12): `main` resta uguale al sito pubblicato (Pages serve tutta la root di `main`, cartelle comprese), le correzioni alla v4.2 restano indipendenti e il passaggio alla v5 è una sola PR finale.
- **Cartella separata `v5/`** con il suo `package.json`: anche sul branch di sviluppo la v4.2 continua a compilarsi e a passare i test com'è.
- **Dominio puro in TS, separato dalla UI**: le regole che contano (chi paga, quote, resto, chiusura, crediti, validazione di backup e configurazione) diventano funzioni senza React, tipizzate, leggibili e riusabili da ogni schermata.
- **Un solo store Zustand** (deciso con l'utente il 2026-11-12, dopo il confronto con `useReducer` e Jotai) al posto di 30 `useState` con 12 `useEffect` di salvataggio. Lo stato è un dominio unico e molto legato (un incasso tocca storico, conto, soci seduti, crediti), quindi serve uno store con transizioni atomiche, non atomi separati: per questo Jotai è stato scartato. Ogni azione dello store (es. `incassa`, `chiudiCassa`) è un solo `set` che chiama una funzione pura di `dominio/`; i componenti leggono con selettori e si ridisegnano solo quando cambia ciò che usano. Lo store non contiene logica di business, quindi resta sostituibile.
- **Persistenza con il middleware `persist` di Zustand su un'unica chiave `cassa5_stato`** (`version: 1` + `migrate` per i formati futuri): salvataggio atomico e, soprattutto, **nessuna collisione con le chiavi `cassa_*` della v4.2** sullo stesso dominio, che restano intatte per la migrazione futura. Nello stato persistito va solo il dato del dominio (`partialize`); restano fuori lo stato della UI: scheda attiva, finestre aperte, bozze dei form.
- **Dialoghi in-app** al posto di `confirm/alert`: coerenti con la UI nuova, testabili e funzionanti anche nelle PWA su iOS.
- **Test e2e in TypeScript con `@playwright/test`** (dipendenza di sviluppo, versione fissata) al posto di Python: un solo linguaggio nel progetto, `webServer` avvia `vite preview` da solo, `channel: 'chrome'` usa il Chrome di sistema senza scaricare browser. Nei test: blocco di ogni richiesta non locale (`page.route`), raccolta degli errori JS, contesto nuovo (localStorage vuoto) per ogni test, `window.print` sostituito da un contatore.
- **Dipendenze minime**: `vite`, `typescript`, `@types/react`, `@types/react-dom`, `zustand`, `@playwright/test` (versioni fissate), più quelle già presenti (`react`, `react-dom`, `tailwindcss` 3.4.17, `lucide` per gli SVG, font Inter). Niente `@vitejs/plugin-react` (Vite compila già TSX con esbuild; il Fast Refresh non è indispensabile), niente router, niente librerie di stato o di form.
- **PIN invariato nel principio**: `vite.config.ts` legge `CASSA_PIN` (default `1234`), genera salt + `sha256` e li inietta con `define`; nel bundle solo l'hash.

## Struttura

```
v5/
  package.json, tsconfig.json (strict), vite.config.ts, tailwind.config.ts, index.html
  src/
    main.tsx
    dominio/          # TS puro, nessun import di React
      tipi.ts         # Prodotto, Voce, Conto, Credito, Vendita, Chiusura, Stato
      costanti.ts     # tavoli, categorie, listino e soci di esempio
      comanda.ts      # aggiungi voce / extra / modalità TUTTI, Tavolo Generico, riassegna
      incasso.ts      # selezione per quantità, preselezioni, split pagato/rimanente, etichetta pagatore, resto
      chiusura.ts     # totali serata, fondo successivo, conti → crediti, archivio vendite compatto
      pin.ts          # sha256(salt + pin), verifica
      configurazione.ts  # validazione JSON config (tutto o niente)
      backup.ts       # esporta/importa formato v5 (`tipo: "cassa-bar-backup", versione: 5`)
      formato.ts      # euro, date gg/mm, iniziale per filtro A–Z
    stato/
      store.ts        # create() + persist: dati del dominio e azioni (ognuna chiama dominio/*)
      archivio.ts     # storage per persist su localStorage, con avviso "memoria piena"
      ui.ts           # store separato e non persistito: scheda, finestre, richiesta PIN
    ui/
      comuni/         # Finestra, Conferma, Avviso, Tastierino, RichiestaPin, Icona, Badge
      cassa/          # Tavoli, SociAlTavolo, Prodotti, Extra, Comanda, BarraMobile
      incasso/        # FinestraIncasso
      schede/         # ContiAperti, Crediti, Chiusura, Prodotti, Soci, Storico
      report/         # ReportStampa (serata e chiusura)
      App.tsx         # intestazione + navigazione + area protetta
  playwright.config.ts  # webServer: vite preview; channel: chrome; viewport per i test responsive
  e2e/
    supporto.ts       # fixture: rete esterna bloccata, errori JS, stampa finta, helper (PIN, tavolo, aggiungi)
    cassa.spec.ts, incasso.spec.ts, crediti.spec.ts, chiusura.spec.ts,
    gestione.spec.ts, dati.spec.ts, responsive.spec.ts
```

Regola per i selettori dei test: ogni elemento interattivo usato dai test ha un `data-testid` stabile; i test non dipendono dai testi.

## Fasi (ognuna = branch `feat/v5-…` + PR su `sviluppo/v5`, test verdi)

**☑ Fase 0 — Progetto della UI (nessun codice)** — chiusa il 2026-11-12, con D8 e D9 rinviate
- ☑ Prototipo cliccabile di tutte le funzioni della v4.2, telefono e tablet, con dati di esempio: [prototipo-v5.html](prototipo-v5.html) (si apre nel browser; usa Google Fonts, è un documento e non l'app). Verificato con Chrome a 320 / 375 / 1024 px: nessuno sforamento, pulsanti ≥ 36 px (≥ 40 px da 340 px in su), flussi di incasso e chiusura con importi corretti.
- ☑ Aspetto approvato: "lavagna del bar", fondo verde scuro, testo gesso, ambra per le azioni principali, rosso per occupato ed eliminazioni; Barlow Condensed per numeri, prezzi e titoli, Inter per il testo.
- ☑ Decisioni D10–D14 approvate, D8–D9 da discutere (vedi sotto).

### Decisioni della v5

| # | Decisione | Stato |
|---|-----------|-------|
| D8 | Navigazione: 4 sezioni (Cassa, Conti, Storico, Gestione) invece di 7 schede; un solo PIN per tutta la Gestione, valido finché non si cambia sezione | ◐ **Da discutere** prima della Fase 3. Nel prototipo è applicata, ma non è decisa. |
| D9 | Battuta extra: tastierino con importo libero + 4 importi rapidi, al posto dei 20 pulsanti fissi | ◐ **Da discutere** prima della Fase 3. |
| D10 | Limiti noti corretti: colore del prodotto da tavolozza; socio eliminato tolto anche dai tavoli; conferma per eliminare prodotti e soci | ☑ Approvata (2026-11-12) |
| D11 | Comanda su telefono come barra fissa che apre il pannello; su tablet sempre visibile | ☑ Approvata (2026-11-12) |
| D12 | Chiusura in tre passi (Riepilogo, Consegna, Conferma); avvisi e conferme in finestre dell'app, non `confirm`/`alert` | ☑ Approvata (2026-11-12) |
| D13 | Importi con la virgola (€ 2,00) in app e report | ☑ Approvata (2026-11-12) |
| D14 | Archivio chiusure come voce propria in Gestione, con Report ed Elimina; l'avviso di memoria piena porta lì | ☑ Approvata (2026-11-12) |

Resta com'è nella v4.2, salvo decisione diversa: "Salva conto" torna al Banco ma lascia i soci seduti (il tavolo resta occupato).

**☑ Fase 1 — Scheletro** — chiusa il 2026-11-12
- ☑ `v5/` con Vite 8.3.5, TypeScript 7.0.2 strict (`tsconfig.json` per `src/`, `tsconfig.node.json` per configurazioni e test), React 19.3.1, Tailwind 3.4.17 con i token del prototipo (`tailwind.config.ts`), Icona (SVG da `lucide` 1.62.0, solo le icone importate finiscono nel bundle), PIN da `CASSA_PIN` come salt + hash (`vite.config.ts`, costanti `__PIN_SALT__`/`__PIN_HASH__`), Inter (solo latino) e Barlow Condensed locali da `@fontsource`.
- ☑ `playwright.config.ts` ed `e2e/supporto.ts` (`@playwright/test` 1.64.1, Chrome di sistema): rete esterna bloccata e registrata, errori JS e di console, stampa finta, contesto nuovo per test. Verificato con una prova negativa che una richiesta esterna fa fallire il test.
- ☑ `e2e/avvio.spec.ts`, 10 test: l'app parte, caratteri locali caricati, icone SVG inline, nessuno sforamento a 320 / 360 / 375 / 768 / 1024 / 1280 px, PIN non in chiaro nel bundle. Superati anche con un PIN diverso da 1234.
- Note per le fasi successive: React 19 invece della 18 della v4.2 (codice nuovo, versione stabile corrente); Tailwind 3 non ha le container query del prototipo: in Fase 3 si sceglie tra il plugin ufficiale `@tailwindcss/container-queries` e media query normali; `zustand` si aggiunge in Fase 2.

**☐ Fase 2 — Dominio, stato, persistenza**
- `dominio/*` e lo store Zustand (`stato/*`) completi per tutte le regole della v4.2, ripresi da `src/orig.html` come specifica (es. `paymentLabel` ~L481, `confirmPayment` ~L490, `handlePerformDailyClosure` ~L584, `handleLoadConfig` ~L717, `compactSale` ~L82).
- UI minima di prova solo dove serve ai test.

**☐ Fase 3 — Cassa e conti aperti**
- Tavoli (occupato), soci al tavolo con filtro A–Z, socio attivo, Tavolo Generico, modalità TUTTI, categorie, battuta extra con descrizione, comanda (quantità, riassegnazione, svuota), Salva conto, barra fissa su telefono.
- Conti aperti ordinati per tavolo: Modifica, Incassa, Elimina con PIN.

**☐ Fase 4 — Incasso per quantità**
- Tutto selezionato all'apertura, preselezioni Intero tavolo / Quota socio / Azzera, + e −, contante con tastierino e tasti rapidi, resto, conferma sempre visibile; etichetta del pagatore nello storico; socio che esce; tavolo che si libera.

**☐ Fase 5 — Crediti, chiusura, fondo, storico**
- Crediti (incasso anche parziale, Elimina con PIN), fondo cassa manuale e Azzera, chiusura (cassiere, consegnato, causale, anteprima fondo, conti → crediti, tavoli liberati, archivio con vendite, proposta di stampa), archivio con Report ed Elimina, Storico.

**☐ Fase 6 — Gestione e dati**
- Aree protette da PIN, intestazione modificabile, Prodotti e Soci, Esporta/Importa backup (formato v5), Carica configurazione (stesso formato `cassa-bar-config` v1, rifiuto totale se non valido), report stampabile della serata e della chiusura.

**☐ Fase 7 — Collaudo di parità**
- Tabella in `docs/PIANO-v5.md`: ogni voce di `docs/FUNZIONALITA.md` → test in `v5/e2e/` che la copre (o decisione D8+ che la cambia).
- Responsive a 360 / 375 / 768 / 1024 / 1280 px senza sforamenti; nessuna richiesta di rete; nessuna password in chiaro nel bundle.

## Punti aperti (dopo la Fase 7, da discutere con l'utente)
1. **File unico offline, PWA e pubblicazione**: come ottenere un solo HTML da Vite (script nostro o plugin), service worker, manifest, passaggio della root di Pages dalla v4.2 alla v5.
2. **Migrazione v4.2 → v5**: lettura delle chiavi `cassa_*` e **import dei backup v4** (obbligatorio prima del rilascio: vincolo "backup vecchi sempre importabili").
3. Eventuali test unitari del dominio (`node:test`), se in seguito servono.
4. Al passaggio: eliminare `tests/test_cassa.py` (ultimo file Python), `build.mjs` e `src/orig.html`, e aggiornare `CLAUDE.md` con i nuovi comandi.

## File critici
- Da creare: `v5/**` (test compresi in `v5/e2e/`), `docs/PIANO-v5.md`.
- Specifica di riferimento (sola lettura): `src/orig.html`, `docs/FUNZIONALITA.md`, `tests/test_cassa.py`, `docs/config.esempio.json`.
- Da aggiornare a fine sessione: `docs/STATO.md` (task v5, registro), `docs/CONTESTO.md` (architettura v5 quando diventa quella pubblicata).
- Da non toccare fino al passaggio: `src/orig.html`, `build.mjs`, `index.html`, `sw.js`, `manifest.webmanifest`, `tests/test_cassa.py`.

## Verifica (a ogni PR)
```
# v4.2 invariata
CASSA_PIN=1234 npm run build && python3 tests/test_cassa.py dist/cassa_smart_bar_pub.html 1234
# v5 (build + preview avviati da Playwright)
cd v5 && npm ci && npm run verifica && CASSA_PIN=1234 npm test
```
Prova manuale su `npm run dev` a 375 e 1024 px per i flussi della fase.
