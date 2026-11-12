# Piano di lavoro — v5: riscrittura da zero (React + TypeScript + Vite)

Lavorare per fasi: per ogni fase un branch `feat/v5-…` aperto da `sviluppo/v5` e una PR verso `sviluppo/v5`. Su `main` la v5 arriva solo alla fine, con un'unica PR `sviluppo/v5` → `main`. All'inizio di ogni fase unire `main` in `sviluppo/v5`. Aggiornare questo file spuntando i punti man mano, e [STATO.md](STATO.md) a fine sessione.

Stato: ☐ da fare · ◐ in corso · ☑ fatto

**Avanzamento (2026-11-12):** piano approvato; Fase 0 chiusa (prototipo, D10–D14 approvate, D8–D9 da discutere). Fasi 1 e 2 chiuse (scheletro; dominio e store con 52 test verdi). D8 e D9 decise; Fasi 3 e 4 chiuse (Cassa, conti, incasso per quantità). Fase 5 chiusa (chiusura in tre passi, fondo, archivio, Storico, report stampabile). Fase 6 chiusa (Prodotti, Soci, Dati, intestazione, memoria piena). Fase 7 chiusa: parità con la v4.2 verificata voce per voce (103 test verdi). Restano i punti aperti: file unico / PWA / pubblicazione e import dei backup v4.

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
- ☑ Decisioni D8–D14 approvate (D8 e D9 il 2026-11-12, dopo la Fase 2).

### Decisioni della v5

| # | Decisione | Stato |
|---|-----------|-------|
| D8 | Navigazione: **4 sezioni** (Cassa, Conti, Storico, Gestione) invece di 7 schede. **Un solo PIN** per tutta la Gestione, che si richiude cambiando sezione, con "Blocca" oppure **da sola dopo 2 minuti senza tocchi** | ☑ Approvata (2026-11-12) |
| D9 | Battuta extra: riquadro "Extra" che apre un foglio con 4 importi rapidi (0,50 / 1,00 / 1,50 / 2,00), tastierino per importi liberi e descrizione facoltativa, al posto dei 20 pulsanti fissi | ☑ Approvata (2026-11-12) |
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

**☑ Fase 2 — Dominio, stato, persistenza** — chiusa il 2026-11-12
- ☑ `src/dominio/` (TypeScript puro, senza React né localStorage; l'ora entra come parametro): `costanti`, `tipi`, `formato`, `comanda`, `incasso`, `conti`, `chiusura`, `soci`, `prodotti`, `pin` (+ `pinBuild`), `configurazione`, `backup`. Regole riprese da `src/orig.html` della v4.2.
- ☑ **Importi in centesimi interi** ovunque (`200` = € 2,00): niente errori dei decimali (0,1 + 0,2). Conversione solo in `formato.euro` / `formato.leggiImporto`.
- ☑ `src/stato/`: store Zustand 5.0.16 creato da `creaStore({ archivio, pinBuild })` (`store.ts`), archivio su localStorage che non si blocca se la memoria è piena (`archivio.ts`), istanza dell'app con il PIN della build (`cassa.ts`, hook `useCassa`). Un'unica chiave `cassa5_stato`, versione 1; lo stato della UI (`memoriaPiena`) non si salva.
- ☑ Backup nel formato v5 (`tipo: "cassa-bar-backup"`, `versione: 5`, `dati`), con controllo della forma dei dati campo per campo; un backup v4 viene riconosciuto e per ora rifiutato con un messaggio (import nel punto aperto sulla migrazione).
- ☑ Test: 42 nuovi in `e2e/dominio/`, girano con Playwright **senza browser** (scelta del 2026-11-12: nessuna libreria in più). Totale 52 verdi, anche con PIN diverso; una prova con due errori introdotti di proposito li ha fatti fallire come previsto.
- Differenze di comportamento rispetto alla v4.2 (piccole, da confermare guardando le schermate):
  - la comanda in corso si salva sul dispositivo: non si perde se il telefono si ricarica;
  - riassegnare una voce a un socio che ha già lo stesso prodotto unisce le righe (come nel prototipo);
  - eliminare un conto aperto svuota anche la comanda di quel tavolo, se è aperta (nella v4.2 restava a schermo);
  - l'iscrizione manuale di un socio ignora i doppioni anche con maiuscole diverse (nella v4.2 lo faceva solo il file di configurazione);
  - un prodotto deve costare più di zero; cassiere e causale della chiusura possono restare vuoti (nella v4.2 c'erano testi predefiniti);
  - etichette con la sola iniziale maiuscola: "Intero tavolo", "Tavolo generico".

**☑ Fase 3 — Cassa e conti aperti** — chiusa il 2026-11-12
- ☑ Struttura (`src/ui/App.tsx`): 4 sezioni (D8), menu in basso sotto i 1024 px e a sinistra da 1024 px; comanda come barra + foglio su telefono (D11), pannello fisso a destra da 1024 px. Layout con le normali media query di Tailwind (nessun plugin).
- ☑ Stato dell'interfaccia separato e non salvato (`src/stato/ui.ts`): sezione, socio attivo (automatico = primo seduto), TUTTI, categoria, fogli, conferme, richiesta PIN, avvisi. Azioni che toccano entrambi gli store in `src/ui/azioni.ts`.
- ☑ Componenti comuni: `Foglio` (dal basso / centrato; si chiude toccando fuori solo dove non si perdono dati), `Finestre` (conferme e avvisi dell'app al posto di `confirm`/`alert`, D12; richiesta PIN; avviso breve), `Tastierino`, `InserimentoPin`, `Pulsante`.
- ☑ Cassa: tavoli con "occupato", soci al tavolo con filtro A–Z, Generico, TUTTI, categorie, prodotti, Extra con rapidi + tastierino + descrizione (D9), comanda per socio con quantità, riassegnazione e Svuota con conferma, Salva conto.
- ☑ Conti: aperti ordinati per tavolo con Modifica ed Elimina con PIN; vista Crediti con totale dei sospesi ed Elimina con PIN. "Incassa" apre un segnaposto (Fase 4 per i conti, Fase 5 per i crediti); Storico segnaposto (Fase 5).
- ☑ Gestione: PIN unico (anche più lungo di 4 cifre, si conferma con "Accedi"), si richiude cambiando sezione, con "Blocca" o da solo dopo 2 minuti senza tocchi (D8). Le voci del menu arrivano nelle Fasi 5 e 6.
- ☑ Test nel browser: `cassa`, `conti`, `gestione` (orologio finto di Playwright per il blocco automatico), `responsive` (320 / 360 / 375 / 768 / 1024 / 1280 px: nessuno sforamento, caselle dei tavoli ≥ 44 px, fogli interi). Totale 65 test verdi con PIN 1234 e 482915.
- Differenze dal prototipo emerse dai test: i tavoli vanno su due righe da 4 fino a 479 px (a 375 px su una riga erano larghi 41 px, sotto i 44 raccomandati per le dita); il PIN si conferma con "Accedi" perché può avere più di 4 cifre.
- Corretto anche: il messaggio d'errore della configurazione citava un PIN di esempio ("482915") che sarebbe finito nel codice pubblico.

**☑ Fase 4 — Incasso per quantità** — chiusa il 2026-11-12
- ☑ `src/ui/incasso/FoglioIncasso.tsx`: tutto selezionato all'apertura; "Tavolo intero", quota di ogni socio, "Niente"; + e − per voce ("1 di 2"), "selezione manuale"; contante con tastierino e tasti rapidi (Esatto, € 5, 10, 20, 50); resto o "Mancano"; conferma sempre visibile con l'importo, disattivata se non è selezionato nulla.
- ☑ Da tre origini (`incasso` nello stato dell'interfaccia): comanda in Cassa, conto aperto (Conti → Incassa), **credito** (Conti → Crediti → Incassa credito, anche parziale). L'incasso dei crediti era previsto in Fase 5: è lo stesso foglio, quindi è stato anticipato.
- ☑ Dopo la conferma: avviso con chi ha pagato e resto; chi ha pagato tutto esce dal tavolo; a conto saldato il tavolo si libera e si torna al Banco. Il foglio non si chiude toccando fuori.
- ☑ Su telefono contante e resto stanno affiancati sopra il tastierino: il resto si vede senza scorrere (verificato dai test a ogni larghezza).
- ☑ Test: `e2e/incasso.spec.ts` (8 scenari, ripresi dalla v4.2) e controlli dell'incasso in `responsive`. Totale 72 verdi con PIN 1234 e 482915. Lo Storico che mostra le vendite arriva in Fase 5: per ora i test leggono le vendite salvate.

**☑ Fase 5 — Crediti, chiusura, fondo, storico** — chiusa il 2026-11-12
- ☑ Crediti: incasso anche parziale (Fase 4), Elimina con PIN (Fase 3).
- ☑ Storico (`src/ui/storico/`): vendite dall'ultima chiusura, la più recente in alto, con ora, chi ha pagato, tavolo, voci e totale; fondo, incassato e totale in cassa in cima; "Report della serata". Non protetto dal PIN, come nella v4.2.
- ☑ Gestione (`src/ui/gestione/`): il menu apre Chiusura cassa e Archivio chiusure (voce scelta nello stato dell'interfaccia; si torna al menu cambiando sezione o quando la Gestione si richiude). Prodotti, Soci e Dati restano "in arrivo".
- ☑ Chiusura in tre passi (D12): **Riepilogo** (fondo iniziale, incassato, in cassa; "Modifica fondo cassa" apre un foglio con tastierino, Imposta e Azzera con conferma; avviso dei conti aperti che passeranno nei crediti), **Consegna** (cassiere, consegnato, che se vuoto vale tutto l'incasso e se non è un importo blocca "Avanti", causale), **Conferma** (riepilogo, fondo per domani, avviso se il consegnato supera il contante). "Registra chiusura" chiama `chiudiCassa` del dominio, poi una finestra riassume conti passati nei crediti, consegnato e nuovo fondo e propone "Stampa report". I dati inseriti restano nel componente: una chiusura lasciata a metà non registra nulla.
- ☑ Archivio chiusure (D14): la più recente in alto, con consegnato, fondo dopo, vendite archiviate e crediti creati; Report; Elimina con conferma, che avvisa delle vendite che si perdono. Le chiusure senza vendite (versioni precedenti) mostrano solo i totali.
- ☑ Report stampabile (`src/ui/report/`), anticipato dalla Fase 6 perché serve ad archivio e chiusura: anteprima su carta bianca in un foglio; "Stampa o salva PDF" apre la stampa del browser. La copia stampata è montata direttamente sotto `<body>` e in stampa l'app è nascosta (`index.css`), così lo scorrimento del foglio non taglia il PDF. Il report di una chiusura si chiude quando la Gestione si richiude (contiene le vendite archiviate).
- ☑ Dominio: `riepilogoSerata` e `totaleCrediti` (stessi numeri in Storico, Chiusura e report), `descriviVoci` ("2× Dreher 66 cl (Andrea), 1× Caffè").
- ☑ Test: `e2e/storico.spec.ts`, `e2e/chiusura.spec.ts` (tre passi, fondo, Azzera, consegna oltre il contante, chiusura a metà, archivio, blocco automatico con orologio finto, stampa con `emulateMedia('print')`), nuovi casi del dominio e di `responsive`. Totale 89 verdi con PIN 1234 e 482915.

**☑ Fase 6 — Gestione e dati** — chiusa il 2026-11-12
- ☑ Menu della Gestione completo: Chiusura cassa, Archivio chiusure, Prodotti, Soci, Dati.
- ☑ Prodotti (`src/ui/gestione/Prodotti.tsx`): listino per categoria; scheda con nome, prezzo (maggiore di zero), categoria, colore dalla tavolozza (D10) e anteprima del pulsante della Cassa; Salva disattivato finché i dati non sono validi; Elimina con conferma (le voci già battute restano nei conti).
- ☑ Soci (`Soci.tsx`): iscrizione (spazi ripuliti, doppioni ignorati senza differenze di maiuscole), filtro A–Z (componente comune `FiltroAZ`, lo stesso del foglio dei soci al tavolo), tavolo dove il socio è seduto, Elimina con conferma che lo toglie anche dal tavolo (D10).
- ☑ Dati (`Dati.tsx`): Esporta backup (file `backup_cassa_aaaa-mm-gg.json` scaricato con un Blob, PIN solo come hash); Importa backup (il file si controlla prima, poi si chiede conferma: config e backup v4 vengono rifiutati con il motivo); Carica configurazione (soci senza doppioni e PIN, tutto o niente); Intestazione; memoria usata dal dispositivo con barra.
- ☑ Intestazione modificabile anche toccando il nome in cima a ogni sezione, senza PIN come nella v4.2; un campo vuoto lascia il valore attuale.
- ☑ Memoria piena (D14): avviso in cima a ogni sezione con "Libera spazio" (porta all'archivio, dopo il PIN) e avviso breve quando succede; sparisce al primo salvataggio riuscito (`creaArchivio` ora segnala anche i salvataggi riusciti).
- ☑ Test: `e2e/dati.spec.ts` (prodotti, soci, intestazione, backup con download e reimport, configurazione, memoria piena simulata), caso del dominio sulla memoria, `responsive` esteso. Totale 101 verdi con PIN 1234 e 482915; nessun PIN in chiaro nel bundle.

**☑ Fase 7 — Collaudo di parità** — chiusa il 2026-11-12
- ☑ Tabella qui sotto: ogni voce di `docs/FUNZIONALITA.md` (v4.2) con il test della v5 che la copre, la decisione che la cambia o il punto aperto che la rimanda. I test sono in `v5/e2e/` (`dominio/` = senza browser).
- ☑ Garanzie trasversali, in ogni test nel browser (`e2e/supporto.ts`): nessuna richiesta di rete verso l'esterno, nessun errore JavaScript o in console, localStorage vuoto all'inizio. Responsive a 320 / 360 / 375 / 768 / 1024 / 1280 px senza sforamenti (`responsive`). Nessun PIN in chiaro nel bundle (`avvio`), provato con due PIN diversi.
- ☑ Lacuna trovata e chiusa: il filtro per categoria della Cassa non aveva test. Scrivendolo è emerso un difetto: una categoria rimasta senza prodotti lasciava la Cassa vuota con un filtro senza pulsante; ora si torna a "Tutti" (`cassa`, due test nuovi).

Legenda: ☑ coperta da test · ↻ cambiata da una decisione approvata · ⏳ rimandata a un punto aperto.

| Funzionalità v4.2 | v5 | Test |
|---|---|---|
| **Generali** | | |
| Intestazione modificabile con un clic sul nome (Annulla / Salva) | ☑ anche da Gestione → Dati | `dati` › intestazione |
| Sette schede sempre visibili, badge conti e crediti | ↻ D8: 4 sezioni; badge conti (rosso) e crediti (ambra) su Conti | `responsive`, `conti`, `chiusura` |
| Aree protette da PIN; PIN anche per Elimina su conti e crediti; tastierino; hash SHA-256; PIN da configurazione/backup, altrimenti della build; nessun suggerimento | ☑ ↻ D8: un PIN per tutta la Gestione, che si richiude da sola | `gestione` (3 test), `conti` › Elimina conto, `dominio/dati` › PIN, `dominio/store` › PIN |
| Dati nel localStorage, offline, installabile come PWA | ☑ dati su una chiave `cassa5_stato`; ⏳ offline/PWA: punto aperto 1 | `cassa` › Salva conto (ricaricamento), `dominio/store` › chiave unica; ogni test blocca la rete |
| **Cassa** | | |
| Banco + Tavolo 1–6; tavolo occupato con soci seduti o conto aperto; il tavolo carica conto e primo socio seduto | ☑ | `cassa` › soci al tavolo, › Salva conto; `conti` › Modifica |
| Soci al tavolo: filtro A–Z (lettere vuote spente), un tocco siede o alza, contatore | ☑ | `cassa` › soci al tavolo |
| Socio attivo: ogni prodotto va al socio scelto | ☑ | `cassa` › comanda |
| Tavolo Generico: voci senza socio, in "Intero tavolo" e in nessuna quota | ☑ | `cassa` › comanda, `dominio/comanda` › Tavolo generico, `incasso` › quota socio |
| Modalità TUTTI | ☑ | `cassa` › comanda, `dominio/comanda` › TUTTI |
| Filtro per categoria (Tutti + categorie presenti), pulsanti con colore e prezzo | ☑ | `cassa` › categorie (2 test) |
| Battuta extra: 20 importi rapidi, descrizione facoltativa in maiuscolo, anche in TUTTI | ↻ D9: foglio con 4 importi rapidi e tastierino | `cassa` › extra, `dominio/comanda` › battuta extra |
| Comanda: voci per socio, + e − (a zero sparisce), riassegnazione, Svuota, totale | ☑ Svuota chiede conferma | `cassa` › quantità e riassegnazione, `dominio/comanda` (4 test) |
| Salva conto: salva o aggiorna e torna al Banco | ☑ | `cassa` › Salva conto, `dominio/chiusura` › conti aperti |
| Barra fissa su telefono e tablet in verticale | ↻ D11: barra sotto i 1024 px, pannello da 1024 | `cassa` › barra della comanda, `responsive` |
| **Incasso** | | |
| Tutto selezionato all'apertura | ☑ | `incasso` › si apre con tutto selezionato |
| Intero tavolo, quota socio, Azzera selezione; + e −; "Selezione manuale" | ☑ "Azzera" si chiama "Niente" | `incasso` › quota socio, › selezione manuale, › Niente |
| Totale da incassare e resto | ☑ anche "Mancano" | `incasso` › contante dal tastierino |
| Tastierino con decimali e cancella; Esatto, € 5, 10, 20, 50 | ☑ | `incasso` › Esatto, › quota socio, › tastierino |
| Conferma sempre visibile, con l'importo, disattivata se non c'è niente | ☑ | `incasso` › Niente, `responsive` (conferma in vista a ogni larghezza) |
| Chi ha pagato: Intero tavolo, socio, "Nome (parziale)", "Parziale", "Credito del gg/mm" | ☑ | `incasso` (4 test), `dominio/incasso` › le cinque etichette |
| Voci non pagate nel conto; socio che esce; tavolo libero a conto saldato | ☑ | `incasso` › quota socio, `dominio/incasso` › chi ha pagato tutto esce, `dominio/store` › una serata |
| **Conti aperti** | | |
| Ordinati per tavolo, con ora, totale, voci per socio | ☑ | `conti` › ordinati per tavolo |
| Modifica, Incassa, Elimina con PIN | ☑ | `conti` (2 test), `incasso` › da un conto aperto |
| **Crediti** | | |
| Alla chiusura i conti aperti diventano crediti (data della chiusura, ora del conto) | ☑ | `chiusura` › tre passi, `dominio/chiusura` › chiusura |
| Totale dei sospesi; tavolo, data, voci per socio, totale | ☑ | `conti` › crediti |
| Incassa credito, anche parziale | ☑ | `incasso` › da un credito, `dominio/store` › credito |
| Elimina con PIN; consultazione e incasso liberi | ☑ | `conti` › crediti |
| **Chiusura cassa** | | |
| Riepiloghi: fondo iniziale, incassato, in cassa | ☑ | `chiusura` › tre passi |
| Fondo manuale: Imposta, Azzera con conferma | ☑ foglio con tastierino | `chiusura` › tre passi, › Azzera |
| Cassiere, consegnato (predefinito: tutto l'incasso), causale, anteprima del fondo | ↻ D12: tre passi; cassiere e causale possono restare vuoti | `chiusura` › tre passi, › consegna vuota, `dominio/chiusura` › fondo per domani |
| Conferma con conti aperti; archivio con le vendite; nuovo fondo; Storico vuoto; conti → crediti; tavoli liberi; avviso con proposta di stampa | ↻ D12: i conti aperti sono annunciati al passo 1 e riepilogati al passo 3 | `chiusura` › tre passi, `dominio/chiusura` (2 test) |
| Archivio: Report (solo totali per le chiusure vecchie), Elimina con conferma | ↻ D14: voce propria in Gestione | `chiusura` › archivio, › blocco automatico |
| Esporta backup (crediti e hash del PIN, mai in chiaro) | ☑ | `dati` › backup, `dominio/dati` › backup |
| Importa backup; backup senza PIN non cambia il PIN | ☑ | `dati` › backup, `dominio/dati` › backup senza PIN, `dominio/store` › backup |
| Backup delle versioni precedenti importabili (fondo 0 rispettato) | ⏳ punto aperto 2: oggi la v5 li riconosce e li rifiuta con il motivo | `dati` › backup (rifiuto del v4), `dominio/dati` › file sbagliati |
| Carica configurazione: soci senza doppioni, PIN come hash, file non valido rifiutato per intero | ☑ | `dati` › configurazione, `dominio/dati` (2 test), `dominio/store` (2 test) |
| **Prodotti** | | |
| Aggiunta, modifica, eliminazione (nome, categoria, prezzo); categorie fisse | ☑ ↻ D10: colore dalla tavolozza, conferma prima di eliminare | `dati` › prodotti, `dominio/anagrafiche` › prodotti |
| **Soci** | | |
| Iscrizione ed eliminazione, doppioni ignorati, ordine alfabetico | ☑ ↻ D10: conferma; il socio eliminato lascia i tavoli | `dati` › soci, `dominio/anagrafiche` (4 test) |
| Caricamento in blocco dal file di configurazione | ☑ | `dati` › configurazione |
| **Storico** | | |
| Vendite dall'ultima chiusura: ora, tavolo, chi ha pagato, voci, totale | ☑ con fondo, incassato, in cassa in cima | `storico` (2 test) |
| Stampa report della serata (fondo, incassato, in cassa, crediti, tabelle); offline | ☑ anteprima in un foglio; in stampa solo il report | `storico` › report della serata |
| **Limiti della v4.2** | | |
| Solo contanti; report con la stampa del browser (iPhone: Safari) | ☑ invariato; la nota su iPhone è sotto l'anteprima | — |
| L'archivio cresce; avviso di memoria piena | ☑ ↻ D14: avviso in ogni sezione con "Libera spazio", barra della memoria in Dati | `dati` › memoria piena, `dominio/store` › memoria piena |
| Storico e Crediti senza PIN; un solo PIN | ☑ | `storico`, `conti` |
| Voci del socio generico "Socio" delle versioni vecchie | ⏳ punto aperto 2 (riguarda solo i dati importati) | — |
| Nuovi prodotti tutti color ambra | ↻ D10: risolto | `dati` › prodotti |
| Socio eliminato resta seduto | ↻ D10: risolto | `dati` › soci, `dominio/store` |
| Salva conto lascia il tavolo occupato | ☑ invariato (comportamento voluto) | `cassa` › Salva conto |
| PIN controllato nel browser, deterrente e non protezione | ☑ invariato: nel bundle solo salt e hash | `avvio` › PIN non in chiaro |

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
