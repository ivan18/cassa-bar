# CHANGELOG — Cassa Smart Bar & Pub

Ogni versione pubblicata corrisponde a un tag git (`v3`, `v4`…). Le versioni precedenti a v3 sono descritte qui ma non hanno un tag.

## v4 — 2026-11-11 — in revisione ([PR #2](https://github.com/ivan18/cassa-bar/pull/2))
App (rispetto a v3):
- Scheda **CREDITI**: alla chiusura cassa i conti aperti diventano crediti (con data), i tavoli si liberano; totale dei sospesi, badge, incasso anche parziale, Elimina con conferma.
- **Incasso per quantità**: tutto preselezionato all'apertura, preselezioni Intero tavolo / Quota socio, Azzera selezione, +/− per voce; nello storico "Intero Tavolo", nome del socio, "Nome (parziale)", "Parziale" o "Credito del gg/mm"; un socio esce dal tavolo quando non ha più voci da pagare; tasto CONFERMA con l'importo, disattivato se non c'è nulla da incassare.
- **Conti aperti ordinati per tavolo** (Banco, poi 1–6).
- **Fondo cassa manuale** con Imposta e Azzera (con conferma).
- **Carica configurazione**: file JSON con soci (aggiunti senza doppioni) e PIN (salvato come hash nel dispositivo); file non validi rifiutati senza modifiche.
- **Filtro alfabetico A–Z** nella scelta dei soci al tavolo (sostituisce la ricerca testuale).
- **Backup**: include crediti e hash + salt del PIN; i backup vecchi restano importabili; corretto l'import che ignorava un fondo cassa pari a 0; un file di configurazione importato come backup viene rifiutato.
- La chiusura cassa chiede conferma se ci sono conti aperti.

Non incluso (decisioni aperte): "Tavolo Generico" (D4), PIN su Elimina credito (D3).

Progetto: test end-to-end estesi a tutte le funzioni nuove (incasso parziale, crediti, configurazione, backup, responsive a 375/768/1024 px).

## v3 — 2026-11-11 — pubblicata ([PR #1](https://github.com/ivan18/cassa-bar/pull/1), merge `23eb5c2`)
App (rispetto a v2):
- PIN dell'area protetta verificato con hash SHA-256 (salt casuale + PIN) generato in build: `CASSA_PIN=xxxx npm run build`.
- Rimosse le password `admin`/`pub` (non digitabili dal tastierino) e i suggerimenti "es. 1234" / "Password predefinita: 1234".
- Dopo un PIN errato il campo si svuota.
- PIN pubblicato: invariato (`1234`), da cambiare con una nuova build.

Progetto:
- Nel repo: sorgente `src/orig.html`, `build.mjs` (scrive direttamente i file di Pages nella root), `package.json`/`package-lock.json` con versioni fissate, test end-to-end `tests/test_cassa.py`.
- Verificato che la build riproduce identica la v2 pubblicata, a meno della logica del PIN.
- Documentazione: `README.md`, `docs/` (stato, contesto, piano v4, funzionalità, manutenzione, changelog), `CLAUDE.md`.

## Input utente — 2026-11-11 — versione "crediti" (solo nel Progetto Claude)
Nuova versione fornita dall'utente, **basata su v1** (CDN, senza responsive e senza PIN con hash). Non ancora integrata: vedi [PIANO-v4.md](PIANO-v4.md). Non è nel repo perché contiene i nomi reali dei soci.

Aggiunte:
- Scheda CREDITI: alla chiusura cassa i conti aperti diventano crediti sospesi, incassabili anche a rate.
- Incasso per quantità (+/− per voce), con preselezione intero tavolo / quota socio.
- Voci "Tavolo Generico" (non assegnate a un socio).
- Conti aperti ordinati per tavolo.
- Fondo cassa modificabile a mano e tasto Azzera (con password).
- Cambio password dall'app.
- Filtro alfabetico A–Z nella scelta dei soci.
- Anagrafica iniziale con 24 soci reali (da non pubblicare nel sorgente: dati personali).

Rimosse rispetto a v1 (da non perdere nella v4):
- Esporta/Importa backup.
- Nome di chi paga nello storico.
- Rimozione del socio dal tavolo dopo il pagamento della sua quota.
- Battuta rapida EXTRA in modalità TUTTI.

Bug rilevati:
- L'incasso si apre a € 0,00 con "INTERO TAVOLO" selezionato; riselezionarlo non fa nulla.
- Il cambio password accetta lettere, ma il tastierino ha solo cifre: si resta chiusi fuori.
- La password è salvata in chiaro e l'errore mostra "Predefinita: 1234".
- Dopo la chiusura i soci restano seduti: i tavoli restano occupati.

## v2 — 2026-11-10 — pubblicata su Pages (commit iniziale del repo)
v1 più:
- Tutto in locale, un solo file HTML: React 18.3.1 inline, CSS Tailwind 3 generato con le sole classi usate, JSX precompilato con esbuild, icone Lucide come SVG inline, font Inter incorporato. Nessuna richiesta di rete.
- Responsive: barra schede scorrevole, tavoli su 4 colonne su telefono, barra comanda fissa in basso sotto 1024 px, tasto CONFERMA INCASSO sempre visibile, finestre adattate, nessuno zoom sui tap o sui campi iOS.
- PWA: manifest, service worker (rete prima, cache se offline), icone 192/512, richiesta di storage persistente.
- PIN ancora in chiaro nel codice (`1234`, `admin`, `pub`) e suggerito a schermo.

## v1 — 2026-11-10 — file originale (solo nel Progetto Claude)
File fornito dall'utente: React + Babel + Tailwind + Lucide caricati da CDN, JSX compilato nel browser.
