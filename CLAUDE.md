# Istruzioni per le sessioni di Claude

Progetto: app di cassa offline (PWA) per il bar di un'associazione. Lingua: **italiano** (codice, interfaccia, documenti, commit).

## All'inizio di ogni sessione
1. Leggere `docs/STATO.md` (pubblicato, in corso, task, decisioni aperte) e `docs/CONTESTO.md` (vincoli e architettura).
2. Se il lavoro riguarda la v4, seguire `docs/PIANO-v4.md`.

## Regole
- Si modifica solo `src/orig.html`; `index.html`, `sw.js`, `manifest.webmanifest` sono generati da `build.mjs`.
- Dopo ogni modifica: `CASSA_PIN=<pin> npm run build` e `python3 tests/test_cassa.py dist/cassa_smart_bar_pub.html <pin>`. Non consegnare con test falliti.
- Il PIN di produzione non si scrive mai in chiaro nel repo, nei commit o nelle PR (unica eccezione: il predefinito `1234`, già pubblico in `build.mjs`). Se non è noto, chiederlo all'utente prima di compilare per il rilascio.
- Repo pubblico: niente nomi reali dei soci, niente backup JSON.
- Nessuna richiesta di rete a runtime, nessuna libreria nuova senza motivo, backup vecchi sempre importabili.
- Pubblicazione solo tramite branch + pull request su `main`.
- Se un'operazione su GitHub è bloccata dal proxy (tag, release, impostazioni), farla tramite il browser (Claude in Chrome, sessione già loggata dell'utente).
- Con le modifiche di codice indicare sempre i comandi per lanciare i test.

## A fine sessione
Aggiornare `docs/STATO.md` (situazione, task, una riga nel registro sessioni) e, se serve, `docs/CHANGELOG.md`, `docs/FUNZIONALITA.md`, `docs/PIANO-v4.md`.
Poi riallineare le copie nel Progetto Claude: `claude/funzionalita.md`, `claude/CHANGELOG.md`, `claude/PIANO.md` (= PIANO-v4), `claude/LEGGIMI.md` (= MANUTENZIONE), `claude/STATO.md`.
