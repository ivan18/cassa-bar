# Stato del progetto e task in sospeso

> Da leggere all'inizio di ogni sessione e da aggiornare alla fine (sezioni "Situazione", "Task" e "Registro sessioni").

Ultimo aggiornamento: **2026-11-11**

## Situazione

| | |
|---|---|
| Pubblicato su Pages | **v2** (PIN in chiaro `1234`/`admin`/`pub`, suggerito a schermo) |
| In revisione | **v3**: PIN con hash, sorgente/build/test/documenti nel repo ([PR #1](https://github.com/ivan18/cassa-bar/pull/1)) |
| Prossima versione | **v4** — crediti e altre funzioni dalla versione fornita dall'utente, vedi [PIANO-v4.md](PIANO-v4.md) |
| PIN della build in revisione | `1234` (scelta dell'utente: invariato per ora) |

## Task

Stato: ☐ da fare · ◐ in corso · ☑ fatto

### Subito
- ☐ **Merge della [PR #1](https://github.com/ivan18/cassa-bar/pull/1)** (v3) su `main` → Pages si aggiorna in circa un minuto. Poi verificare dal telefono del bar che il PIN funzioni e che non compaia più "1234".
- ☐ Dopo il merge: creare il tag `v3` su `main` (`git tag v3 && git push origin v3`).
- ☐ Decidere se cambiare il PIN (oggi `1234`) prima della v4 con una nuova build ([MANUTENZIONE.md](MANUTENZIONE.md#cambiare-il-pin)), oppure aspettare la v4 e impostarlo dal JSON di configurazione. Consigliate almeno 6 cifre.

### v4 (vedi il piano completo)
- ◐ Fase 0: D1 e D2 decise (JSON di configurazione); restano aperte D3 e D4 (sotto); D5 decisa. Si può partire con le parti che non dipendono da queste.
- ☐ Fasi 1–5 del [piano v4](PIANO-v4.md).

### Manutenzione (non urgenti)
- ☐ Correggere l'import del backup che ignora un fondo cassa pari a 0 (`if (data.initialFund)`): è già nel piano v4 (1.4).
- ☐ Valutare una GitHub Action che esegua build + test a ogni PR (oggi si lanciano a mano).
- ☐ Limiti noti in [FUNZIONALITA.md](FUNZIONALITA.md#limiti-e-comportamenti-da-tenere-presenti): decidere quali correggere (colore dei nuovi prodotti, socio eliminato che resta seduto, Storico senza PIN).

## Decisioni per la v4

### Prese (2026-11-11)

| # | Domanda | Decisione |
|---|---------|-----------|
| D1 | Come caricare i soci reali | Da un **JSON di configurazione** caricato dall'app (tasto "Carica configurazione" in Chiusura cassa, quindi dietro PIN). Il file sta solo sul dispositivo, **mai nel repo né nella build**. I soci del file **si aggiungono** a quelli presenti, ignorando i duplicati. |
| D2 | Come si imposta il PIN | Dallo **stesso JSON di configurazione**: PIN scritto **in chiaro** nel file (solo cifre, almeno 4); al caricamento l'app salva nel dispositivo solo hash + salt. Senza configurazione vale il PIN della build. Niente schermata di cambio PIN nell'app. |
| D5 | Hash + salt del PIN nel backup | **Sì**: Esporta backup include `pinSalt`/`pinHash` (mai il PIN in chiaro); Importa backup li ripristina, così su un nuovo dispositivo il PIN resta lo stesso. Un backup senza questi campi lascia invariato il PIN del dispositivo. |

Formato del file: vedi [config.esempio.json](config.esempio.json) e il [piano v4](PIANO-v4.md#formato-del-json-di-configurazione).

### Aperte

| # | Domanda | Proposta (non decisa) |
|---|---------|-----------------------|
| D3 | Protezione della scheda Crediti | Consultazione e incasso liberi; "Elimina credito" chiede il PIN |
| D4 | Voce senza socio | Va a "Tavolo Generico" |

## Registro sessioni

Una riga per sessione, la più recente in alto: cosa è stato fatto e cosa è rimasto a metà.

- **2026-11-11 (sera)** — Decise D1 e D2: soci e PIN da un JSON di configurazione caricato dall'app (file privato, PIN in chiaro nel file e salvato come hash, soci aggiunti senza duplicati). D3 e D4 restano aperte. Decisa D5: hash + salt del PIN inclusi nel backup. Aggiornati piano v4 e aggiunto `docs/config.esempio.json`.

- **2026-11-11** — Verificato che il sito pubblicato (v2) ha tutte le funzioni di `FUNZIONALITA.md` tranne il PIN con hash. Portati nel repo sorgente v3 (`src/orig.html`, verificato identico al pubblicato a meno del PIN), `build.mjs` (output nella root), `package.json` con versioni fissate, test e2e, README e `docs/`. Build con PIN 1234, test superati. Aperta la PR #1, in attesa di merge.
- **2026-11-10** — v2 (offline, responsive, PWA) pubblicata; v3 (PIN con hash) preparata ma non pubblicata. Ricevuta la versione "crediti" dell'utente e scritto il piano v4.
