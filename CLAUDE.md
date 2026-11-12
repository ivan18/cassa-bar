# Istruzioni per le sessioni di Claude

Progetto: app di cassa offline (PWA) per il bar di un'associazione. Lingua: **italiano** (codice, interfaccia, documenti, commit).

## All'inizio di ogni sessione
1. Leggere `docs/STATO.md` (pubblicato, in corso, task, decisioni aperte) e `docs/CONTESTO.md` (vincoli e architettura).
2. Se il lavoro riguarda la v4, seguire `docs/PIANO-v4.md`.
3. Se il lavoro riguarda la v5, passare al branch `sviluppo/v5` (`git switch sviluppo/v5 && git pull`) e leggere lì `docs/STATO.md` e `docs/PIANO-v5.md`: l'avanzamento della v5 è registrato solo su quel branch.

## Regole
- Si modifica solo `src/orig.html`; `index.html`, `sw.js`, `manifest.webmanifest` sono generati da `build.mjs`.
- Dopo ogni modifica: `CASSA_PIN=<pin> npm run build` e `python3 tests/test_cassa.py dist/cassa_smart_bar_pub.html <pin>`. Non consegnare con test falliti.
- Il PIN di produzione non si scrive mai in chiaro nel repo, nei commit o nelle PR (unica eccezione: il predefinito `1234`, già pubblico in `build.mjs`). Se non è noto, chiederlo all'utente prima di compilare per il rilascio.
- Repo pubblico: niente nomi reali dei soci, niente backup JSON.
- Nessuna richiesta di rete a runtime, nessuna libreria nuova senza motivo, backup vecchi sempre importabili.
- Pubblicazione solo tramite branch + pull request su `main`. `main` contiene sempre e solo la versione pubblicata (Pages serve la sua root).
- v5, sviluppo **trunk-based** (dal 2026-11-12): il trunk è `sviluppo/v5`. Ogni modifica parte dal trunk aggiornato su un ramo breve (`feat/v5-…`, `fix/v5-…`, `docs/v5-…`) che vive ore, non giorni; PR verso `sviluppo/v5` e merge appena i test sono verdi (`gh pr merge N --merge --delete-branch`), poi si riparte dal trunk. Modifiche piccole e frequenti; mai un merge con test rossi. Su `main` la v5 arriva con un'unica PR `sviluppo/v5` → `main` quando è completa. Le correzioni urgenti alla v4.2 partono da `main` e tornano su `main`; poi si unisce `main` dentro `sviluppo/v5` (`git switch sviluppo/v5 && git merge main`).
- v5, modifiche di interfaccia o di flusso: prima si aggiorna la proposta di interfaccia (`docs/prototipo-v5.html`: comportamento, note, copertura, decisioni D# anche in `docs/PIANO-v5.md`), poi il codice in `v5/` e i test.
- Mai creare un branch con lo stesso nome di un tag di versione (`v5`, `v4.2`…): rende ambigui i comandi git.
- In locale (VS Code) tag e release si fanno con `git`/`gh`. Solo nelle sessioni cloud, se un'operazione su GitHub è bloccata dal proxy (tag, release, impostazioni), farla tramite il browser (Claude in Chrome, sessione già loggata dell'utente).
- Il file di configurazione con soci reali e PIN (`config-cassa.json`) sta fuori dal repo; `.gitignore` esclude comunque `config*.json`.
- Con le modifiche di codice indicare sempre i comandi per lanciare i test.

## A fine sessione
Aggiornare `docs/STATO.md` (situazione, task, una riga nel registro sessioni) e, se serve, `docs/CHANGELOG.md`, `docs/FUNZIONALITA.md`, `docs/PIANO-v4.md`.
I documenti in `docs/` sono l'unica fonte di verità. Le vecchie copie nel Progetto Claude su claude.ai (`claude/*.md`) non si aggiornano più.
