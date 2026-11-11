# Stato del progetto e task in sospeso

> Da leggere all'inizio di ogni sessione e da aggiornare alla fine (sezioni "Situazione", "Task" e "Registro sessioni").

Ultimo aggiornamento: **2026-11-11**

## Situazione

| | |
|---|---|
| Pubblicato su Pages | **v4.1** — v4 (crediti, incasso per quantità, configurazione) + correzioni responsive ([PR #3](https://github.com/ivan18/cassa-bar/pull/3), tag `v4.1`) |
| In preparazione | **v4.2** — Tavolo Generico, descrizione extra, PIN su Elimina, chiusura che archivia le vendite, report stampabile (branch `feat/v4.2`, PR da aprire/mergiare) |
| Versione precedente | **v3** (PIN con hash, [PR #1](https://github.com/ivan18/cassa-bar/pull/1), tag `v3`) |
| PIN della build | `1234` (il PIN vero si imposterà con il JSON di configurazione) |

## Task

Stato: ☐ da fare · ◐ in corso · ☑ fatto

### Subito
- ☑ Merge della PR #1 (v3) su `main`.
- ☑ Pubblicazione della v4.1 su Pages: le esecuzioni n. 4 e n. 5 di `pages-build-deployment` sono rimaste bloccate in "Queued" (errore interno di GitHub; githubstatus senza incidenti; quote e fatturazione a posto; "Cancel run" non funziona). Risolto con un nuovo merge (PR #5): la n. 6 è andata a buon fine in 26 s e il sito è alla v4.1 (verificato il 2026-11-11 alle 22:23). Le n. 4 e 5 restano appese in coda: si possono ignorare o annullare quando GitHub lo permette.
- ☐ Merge della PR della v4.2 e tag `v4.2` (da Releases nel browser).
- ☐ Aggiornare il dispositivo del bar alla v4.2 (o v4.1 se la 4.2 non è ancora pubblicata): Esporta backup, ricaricare il sito, Carica configurazione (`config/config-cassa.json` del Progetto Claude), eliminare i soci di esempio, Esporta backup.
- ☑ Tag `v3` su `23eb5c2` (creato come release da GitHub via browser: dalle sessioni Claude il push dei tag è bloccato).
- ☑ Merge della PR #2 (v4) e tag `v4`.

### v4 (vedi il piano completo)
- ☑ Fase 0: decise D1–D5.
- ☑ Fasi 1–4 (dettaglio spuntato nel [piano v4](PIANO-v4.md)).
- ☑ 2.3 Tavolo Generico (D4) e PIN su Elimina credito e conto (D3): nella v4.2.
- ☑ 5.3 JSON di configurazione con i 24 soci reali e PIN provvisorio `1234`: nel Progetto Claude in `config/config-cassa.json` (istruzioni in `config/LEGGIMI.md`), **non nel repo**. Verificato che la v4 lo carica.
- ☐ Scegliere il PIN definitivo (oggi `1234`, pubblico) e aggiornare il file di configurazione.
- ☐ 5.5 Migrazione sul dispositivo del bar (vedi "Subito").
- ◐ v4.2 (vedi [piano, fase 6](PIANO-v4.md#fase-6--v42)): implementata e testata, da pubblicare.
- ☐ Report con la chiusura cassa: decidere D7 (sotto), poi implementare.

### Manutenzione (non urgenti)
- ☐ Valutare una GitHub Action che esegua build + test a ogni PR (oggi si lanciano a mano).
- ☐ Limiti noti in [FUNZIONALITA.md](FUNZIONALITA.md#limiti-e-comportamenti-da-tenere-presenti): decidere quali correggere (colore dei nuovi prodotti, socio eliminato che resta seduto).
- ☐ Archivio chiusure: con le vendite archiviate cresce di ~15 KB a serata; valutare un tasto per esportare ed eliminare le chiusure vecchie.

## Decisioni per la v4

### Prese (2026-11-11)

| # | Domanda | Decisione |
|---|---------|-----------|
| D1 | Come caricare i soci reali | Da un **JSON di configurazione** caricato dall'app (tasto "Carica configurazione" in Chiusura cassa, quindi dietro PIN). Il file sta solo sul dispositivo, **mai nel repo né nella build**. I soci del file **si aggiungono** a quelli presenti, ignorando i duplicati. |
| D2 | Come si imposta il PIN | Dallo **stesso JSON di configurazione**: PIN scritto **in chiaro** nel file (solo cifre, almeno 4); al caricamento l'app salva nel dispositivo solo hash + salt. Senza configurazione vale il PIN della build. Niente schermata di cambio PIN nell'app. |
| D3 | Protezione dei crediti | Consultazione e incasso liberi; **Elimina credito** chiede il PIN, e per coerenza anche **Elimina conto aperto** (deciso il 2026-11-11 sera, v4.2). Regola: ciò che cancella soldi già registrati chiede il PIN. |
| D4 | Voce senza socio | Va al **Tavolo Generico**: resta del tavolo, rientra in "Intero tavolo" e in nessuna quota socio (v4.2). |
| D6 | Storico e chiusura | La chiusura **archivia le vendite** nella chiusura e svuota lo Storico; niente "Azzera storico". Report stampabile della serata e di ogni chiusura (v4.2). |
| D5 | Hash + salt del PIN nel backup | **Sì**: Esporta backup include `pinSalt`/`pinHash` (mai il PIN in chiaro); Importa backup li ripristina, così su un nuovo dispositivo il PIN resta lo stesso. Un backup senza questi campi lascia invariato il PIN del dispositivo. |

Formato del file: vedi [config.esempio.json](config.esempio.json) e il [piano v4](PIANO-v4.md#formato-del-json-di-configurazione).

### Aperte

| # | Domanda | Opzioni (non decisa) |
|---|---------|----------------------|
| D7 | "Aggiungere la chiusura cassa nel report" (richiesta dell'utente, 2026-11-11) | Il report di ogni chiusura esiste già dalla v4.2 (tasto "Report" nell'archivio). Da chiarire cosa aggiungere: **a)** alla conferma della chiusura proporre subito la stampa del suo report; **b)** nel report della serata (Storico) mostrare anche cassiere, importo al presidente e fondo per domani presi dal modulo di chiusura; **c)** un report riepilogativo di più chiusure (archivio o periodo) con i totali. |

## Registro sessioni

Una riga per sessione, la più recente in alto: cosa è stato fatto e cosa è rimasto a metà.

- **2026-11-11 (notte, 5)** — Analizzata la versione "asd_cassa_bar (6)" dell'utente; decise D3, D4, D6. Implementata la v4.2 sul branch `feat/v4.2` (Tavolo Generico, descrizione extra, PIN su Elimina conto/credito, chiusura che archivia le vendite, report stampabile) e corretto un bug della build che troncava il CSS personalizzato. Test estesi (tutti superati). Da fare: PR, merge, tag.

- **2026-11-11 (notte, 3)** — v4.1 responsive: modifica dell'intestazione in una finestra (su richiesta dell'utente, prima sforava su telefono), barra delle 7 schede sempre visibile (griglia su telefono, etichette brevi su tablet), select della comanda, nomi soci, piccoli a capo; fix della build sulle icone in elenco. Test estesi (83 controlli). Merge della PR #3, tag `v4.1`. Allineati i documenti del Progetto Claude (`claude/*.md`) a quelli del repo.
- **2026-11-11 (notte, 4)** — Pubblicazione della v4.1 bloccata da GitHub (esecuzioni n. 4/5 in coda, annullamento impossibile; quote verificate: nessun problema). Ripubblicato con un nuovo merge (PR #5): esecuzione n. 6 riuscita, sito alla v4.1.

- **2026-11-11 (notte, 2)** — Creato il JSON di configurazione (24 soci reali, PIN provvisorio 1234) nel Progetto Claude, `config/config-cassa.json`; provato nella v4. Merge della PR #2: v4 pubblicata, tag `v4`.
- **2026-11-11 (notte)** — Merge PR #1: v3 pubblicata, tag/release `v3` creato via browser. Implementata la v4 sul branch `feat/v4-crediti`: crediti, incasso per quantità, conti ordinati, fondo manuale, configurazione JSON (soci + PIN), filtro A–Z, backup con crediti e PIN, fix fondo 0. Test e2e estesi (tutti superati, anche con PIN diverso). Esclusi in attesa di decisione: Tavolo Generico (D4), PIN su Elimina credito (D3).

- **2026-11-11 (sera)** — Decise D1 e D2: soci e PIN da un JSON di configurazione caricato dall'app (file privato, PIN in chiaro nel file e salvato come hash, soci aggiunti senza duplicati). D3 e D4 restano aperte. Decisa D5: hash + salt del PIN inclusi nel backup. Aggiornati piano v4 e aggiunto `docs/config.esempio.json`.

- **2026-11-11** — Verificato che il sito pubblicato (v2) ha tutte le funzioni di `FUNZIONALITA.md` tranne il PIN con hash. Portati nel repo sorgente v3 (`src/orig.html`, verificato identico al pubblicato a meno del PIN), `build.mjs` (output nella root), `package.json` con versioni fissate, test e2e, README e `docs/`. Build con PIN 1234, test superati. Aperta la PR #1, in attesa di merge.
- **2026-11-10** — v2 (offline, responsive, PWA) pubblicata; v3 (PIN con hash) preparata ma non pubblicata. Ricevuta la versione "crediti" dell'utente e scritto il piano v4.
