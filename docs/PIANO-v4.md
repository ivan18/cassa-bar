# Piano di lavoro — v4: integrazione delle nuove funzionalità

**Obiettivo:** portare nella v3 (offline, responsive, PIN con hash) solo le funzionalità nuove della versione "crediti" fornita dall'utente, senza perdere nulla di ciò che c'è già. Backup, nome di chi paga nello storico, rimozione del socio dopo il pagamento ed EXTRA in modalità TUTTI **restano**.

**Base di partenza:** `src/orig.html` (v3). La versione dell'utente serve solo come riferimento funzionale e non si copia così com'è: sta nel Progetto Claude in `versioni/input-2026-11-11-crediti/asd_cassa_bar.html` e **non va nel repo** perché contiene i nomi reali dei soci.

Lavorare su un branch (`feat/v4-crediti`) e pubblicare con una PR. Aggiornare questo file spuntando i punti man mano, e [STATO.md](STATO.md) a fine sessione.

Stato: ☐ da fare · ◐ in corso · ☑ fatto

---

## Fase 0 — Decisioni da prendere prima di scrivere codice

Le proposte e lo stato delle risposte sono in [STATO.md → Decisioni aperte](STATO.md#decisioni-aperte-servono-allutente-prima-della-v4).

| # | Decisione | Proposta |
|---|-----------|----------|
| D1 | Anagrafica dei 24 soci reali | Fuori dal codice pubblico; si caricano una volta con **Importa backup** (file JSON preparato a parte, mai nel repo). |
| D2 | Cambio PIN dall'app vs PIN fissato in build | PIN modificabile dall'app, salvato come **hash + salt** nel dispositivo; solo cifre, minimo 4, va inserito due volte e serve il PIN attuale. Il PIN di build resta quello iniziale. |
| D3 | Protezione della scheda Crediti | Consultazione e incasso liberi; **Elimina credito** chiede il PIN, perché equivale a cancellare un debito. |
| D4 | Voce senza socio | Come nella versione dell'utente: senza socio selezionato la voce va a "Tavolo Generico". |

## Fase 1 — Dati e persistenza
- ☐ 1.1 Nuovo stato `creditTabs` salvato in `cassa_creditTabs`.
- ☐ 1.2 PIN dell'app: `cassa_pinSalt` + `cassa_pinHash`; se assenti si usano quelli di build.
- ☐ 1.3 Backup: aggiungere `creditTabs` a export e import. I backup vecchi (senza crediti) devono restare importabili.
- ☐ 1.4 Correggere l'import: oggi `if (data.initialFund)` ignora un fondo pari a 0.

## Fase 2 — Nuove funzionalità
- ☐ 2.1 **Scheda CREDITI**
  - alla chiusura cassa i conti aperti diventano crediti, con data e ora;
  - si **liberano i tavoli** (soci seduti azzerati), bug della versione dell'utente;
  - elenco con totale sospesi e badge nella barra delle schede;
  - incasso del credito anche parziale; Elimina con PIN (D3);
  - l'avviso di chiusura dice quanti conti sono passati ai crediti.
- ☐ 2.2 **Incasso per quantità**
  - +/− per voce sulle quantità da pagare;
  - all'apertura sono **preselezionate tutte le quantità** (bug della versione dell'utente: si apriva a € 0,00);
  - preselezioni Intero tavolo / Quota socio, e un tasto "Azzera selezione";
  - nello storico: nome del socio se paga la sua quota, "Intero Tavolo" se paga tutto, "Parziale" se la selezione è mista, "Credito del gg/mm" per i crediti;
  - un socio esce dal tavolo quando **non ha più voci da pagare**;
  - il tasto CONFERMA resta sempre visibile (come in v3).
- ☐ 2.3 **Tavolo Generico**: voci senza socio, selezionabile tra i soci del tavolo e nel menu di assegnazione delle voci.
- ☐ 2.4 **Conti aperti ordinati per tavolo** (Banco, poi 1–6), ordinando in visualizzazione e non solo al salvataggio.
- ☐ 2.5 **Fondo cassa manuale** in Chiusura cassa, con campo numerico e tasto **Azzera** (con conferma).
- ☐ 2.6 **Cambio PIN** (D2) in Chiusura cassa, con tastierino numerico per non restare chiusi fuori. Nessun suggerimento del PIN a schermo.
- ☐ 2.7 **Filtro alfabetico A–Z** nella scelta dei soci; le lettere senza soci sono disattivate.
- ☐ 2.8 **EXTRA in modalità TUTTI**: mantenuto, da verificare insieme a Tavolo Generico.

## Fase 3 — Responsive per le parti nuove
- ☐ 3.1 Barra delle schede con 7 voci: scorrimento su telefono, badge visibili.
- ☐ 3.2 Scheda Crediti e finestra di incasso per quantità a 375 / 768 / 1024 px.
- ☐ 3.3 Filtro A–Z su una riga scorrevole su telefono.
- ☐ 3.4 Campo del fondo cassa e cambio PIN su telefono.

## Fase 4 — Test (estendere `tests/test_cassa.py`)
- ☐ 4.1 Incasso parziale per quantità: resto corretto, conto residuo, nome nello storico.
- ☐ 4.2 Apertura dell'incasso con tutto preselezionato (regressione del bug).
- ☐ 4.3 Chiusura con conti aperti: compaiono i crediti, tavoli liberi, incasso parziale del credito.
- ☐ 4.4 Cambio PIN: il vecchio non funziona più, il nuovo sì, rifiutate le lettere e i PIN corti.
- ☐ 4.5 Backup: esporta e reimporta con i crediti; import di un backup vecchio.
- ☐ 4.6 Elimina credito chiede il PIN.
- ☐ 4.7 Nessuna richiesta esterna, nessun errore JS, nessuno sforamento a 375 / 768 / 1024 px, anche su Crediti e incasso.

Comandi:
```bash
CASSA_PIN=1234 npm run build
python3 tests/test_cassa.py dist/cassa_smart_bar_pub.html 1234
```

## Fase 5 — Rilascio
- ☐ 5.1 Build con il PIN scelto: `CASSA_PIN=xxxx npm run build`.
- ☐ 5.2 Aggiornare `docs/CHANGELOG.md`, `docs/FUNZIONALITA.md`, `docs/CONTESTO.md` (modello dati) e `docs/STATO.md`.
- ☐ 5.3 Preparare il file di backup con l'anagrafica soci (D1), **fuori dal repo**.
- ☐ 5.4 PR su `main`, merge, tag `v4`.
- ☐ 5.5 Migrazione sul dispositivo del bar: Esporta backup dalla versione online attuale, aggiornare e reimportare (vedi [MANUTENZIONE.md](MANUTENZIONE.md#aggiornare-il-dispositivo-del-bar)).
