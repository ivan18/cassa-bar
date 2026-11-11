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
- ☐ Decidere se e quando cambiare il PIN (oggi `1234`): serve una nuova build, vedi [MANUTENZIONE.md](MANUTENZIONE.md#cambiare-il-pin). Consigliate almeno 6 cifre.

### v4 (vedi il piano completo)
- ☐ Fase 0: prendere le decisioni D1–D4 (sotto).
- ☐ Fasi 1–5 del [piano v4](PIANO-v4.md).

### Manutenzione (non urgenti)
- ☐ Correggere l'import del backup che ignora un fondo cassa pari a 0 (`if (data.initialFund)`): è già nel piano v4 (1.4).
- ☐ Valutare una GitHub Action che esegua build + test a ogni PR (oggi si lanciano a mano).
- ☐ Limiti noti in [FUNZIONALITA.md](FUNZIONALITA.md#limiti-e-comportamenti-da-tenere-presenti): decidere quali correggere (colore dei nuovi prodotti, socio eliminato che resta seduto, Storico senza PIN).

## Decisioni aperte (servono all'utente prima della v4)

| # | Domanda | Proposta |
|---|---------|----------|
| D1 | Come caricare i 24 soci reali | Fuori dal codice pubblico: file di backup JSON da importare una volta |
| D2 | Cambio PIN dall'app o solo in build | Modificabile dall'app, salvato come hash + salt nel dispositivo; solo cifre, minimo 4, doppio inserimento, serve il PIN attuale |
| D3 | Protezione della scheda Crediti | Consultazione e incasso liberi; "Elimina credito" chiede il PIN |
| D4 | Voce senza socio | Va a "Tavolo Generico" |

## Registro sessioni

Una riga per sessione, la più recente in alto: cosa è stato fatto e cosa è rimasto a metà.

- **2026-11-11** — Verificato che il sito pubblicato (v2) ha tutte le funzioni di `FUNZIONALITA.md` tranne il PIN con hash. Portati nel repo sorgente v3 (`src/orig.html`, verificato identico al pubblicato a meno del PIN), `build.mjs` (output nella root), `package.json` con versioni fissate, test e2e, README e `docs/`. Build con PIN 1234, test superati. Aperta la PR #1, in attesa di merge.
- **2026-11-10** — v2 (offline, responsive, PWA) pubblicata; v3 (PIN con hash) preparata ma non pubblicata. Ricevuta la versione "crediti" dell'utente e scritto il piano v4.
