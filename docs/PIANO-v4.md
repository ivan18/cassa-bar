# Piano di lavoro — v4: integrazione delle nuove funzionalità

**Obiettivo:** portare nella v3 (offline, responsive, PIN con hash) solo le funzionalità nuove della versione "crediti" fornita dall'utente, senza perdere nulla di ciò che c'è già. Backup, nome di chi paga nello storico, rimozione del socio dopo il pagamento ed EXTRA in modalità TUTTI **restano**.

**Base di partenza:** `src/orig.html` (v3). La versione dell'utente serve solo come riferimento funzionale e non si copia così com'è: sta nel Progetto Claude in `versioni/input-2026-11-11-crediti/asd_cassa_bar.html` e **non va nel repo** perché contiene i nomi reali dei soci.

Lavorare su un branch (`feat/v4-crediti`) e pubblicare con una PR. Aggiornare questo file spuntando i punti man mano, e [STATO.md](STATO.md) a fine sessione.

Stato: ☐ da fare · ◐ in corso · ☑ fatto

**Avanzamento (2026-11-11):** implementato tutto ciò che non dipende da D3/D4, sul branch `feat/v4-crediti` ([PR #2](https://github.com/ivan18/cassa-bar/pull/2)). Restano: 2.3 Tavolo Generico (D4), protezione di Elimina credito (D3, oggi solo conferma), 5.3 e 5.5.

---

## Fase 0 — Decisioni da prendere prima di scrivere codice

Lo stato aggiornato è in [STATO.md → Decisioni per la v4](STATO.md#decisioni-per-la-v4).

| # | Decisione | Stato |
|---|-----------|-------|
| D1 | Anagrafica dei soci reali | ☑ **JSON di configurazione** caricato dall'app (dietro PIN); i soci si **aggiungono** a quelli presenti, senza duplicati. Il file non va mai nel repo né nella build. |
| D2 | Come si imposta il PIN | ☑ Dallo **stesso JSON**: PIN in chiaro nel file, l'app salva solo hash + salt. Senza configurazione vale il PIN della build. Nessuna schermata di cambio PIN. |
| D3 | Protezione della scheda Crediti | ☐ Aperta. Proposta: consultazione e incasso liberi; **Elimina credito** chiede il PIN, perché equivale a cancellare un debito. |
| D4 | Voce senza socio | ☐ Aperta. Proposta: come nella versione dell'utente, senza socio selezionato la voce va a "Tavolo Generico". |
| D5 | Hash + salt del PIN nel backup | ☑ **Sì**: export include `pinSalt`/`pinHash` (mai il PIN in chiaro), import li ripristina; un backup senza questi campi lascia invariato il PIN del dispositivo. |

I punti che dipendono da decisioni aperte sono segnati con *(dipende da Dn)*: si possono rimandare senza bloccare il resto.

### Formato del JSON di configurazione

Esempio completo: [config.esempio.json](config.esempio.json) (nomi inventati; il PIN dell'esempio è pubblico, non va usato davvero).

```json
{
  "tipo": "cassa-bar-config",
  "versione": 1,
  "soci": ["Mario Rossi", "Giulia Bianchi"],
  "pin": "482915"
}
```

- `tipo` e `versione` obbligatori: servono a distinguere il file da un backup e a gestire formati futuri. Un file con `tipo` diverso viene rifiutato con un messaggio chiaro.
- `soci` (facoltativo): array di stringhe; si tolgono gli spazi ai lati, si scartano i vuoti, si **aggiungono** all'anagrafica esistente ignorando i duplicati (confronto senza differenze tra maiuscole e minuscole), poi si riordina.
- `pin` (facoltativo): stringa di sole cifre, almeno 4. Se non valido si rifiuta **tutto** il file, senza applicare nemmeno i soci, così non si resta a metà.
- Al termine un avviso riepiloga: "Aggiunti N soci (M già presenti). PIN aggiornato." Il PIN non viene mai mostrato.
- Il file resta sul dispositivo o in un posto privato dell'associazione: contiene nomi e PIN in chiaro. `.gitignore` esclude `config*.json` tranne l'esempio.

## Fase 1 — Dati e persistenza
- ☑ 1.1 Nuovo stato `creditTabs` salvato in `cassa_creditTabs`.
- ☑ 1.2 PIN del dispositivo: `cassa_pinSalt` + `cassa_pinHash`, scritti dal caricamento della configurazione; se assenti si usano salt e hash della build. La verifica del PIN usa i primi se presenti.
- ☑ 1.3 Backup: aggiungere `creditTabs` a export e import. I backup vecchi (senza crediti) devono restare importabili. Includere `pinSalt`/`pinHash` (D5); se il backup non li ha, il PIN del dispositivo non cambia.
- ☑ 1.4 Correggere l'import: oggi `if (data.initialFund)` ignora un fondo pari a 0.

## Fase 2 — Nuove funzionalità
- ☑ 2.1 **Scheda CREDITI**
  - alla chiusura cassa i conti aperti diventano crediti, con data e ora;
  - si **liberano i tavoli** (soci seduti azzerati), bug della versione dell'utente;
  - elenco con totale sospesi e badge nella barra delle schede;
  - incasso del credito anche parziale; Elimina *(protezione: dipende da D3 — per ora chiede solo conferma)*;
  - l'avviso di chiusura dice quanti conti sono passati ai crediti.
- ☑ 2.2 **Incasso per quantità**
  - +/− per voce sulle quantità da pagare;
  - all'apertura sono **preselezionate tutte le quantità** (bug della versione dell'utente: si apriva a € 0,00);
  - preselezioni Intero tavolo / Quota socio, e un tasto "Azzera selezione";
  - nello storico: nome del socio se paga la sua quota, "Intero Tavolo" se paga tutto, "Parziale" se la selezione è mista, "Credito del gg/mm" per i crediti;
  - un socio esce dal tavolo quando **non ha più voci da pagare**;
  - il tasto CONFERMA resta sempre visibile (come in v3).
- ☐ 2.3 **Tavolo Generico** *(dipende da D4)*: voci senza socio, selezionabile tra i soci del tavolo e nel menu di assegnazione delle voci.
- ☑ 2.4 **Conti aperti ordinati per tavolo** (Banco, poi 1–6), ordinando in visualizzazione e non solo al salvataggio.
- ☑ 2.5 **Fondo cassa manuale** in Chiusura cassa, con campo numerico e tasto **Azzera** (con conferma).
- ☑ 2.6 **Carica configurazione** (D1, D2) in Chiusura cassa, accanto a Esporta/Importa backup: apre un file JSON, lo valida e applica soci e PIN secondo il [formato](#formato-del-json-di-configurazione). Nessun suggerimento del PIN a schermo.
- ☑ 2.7 **Filtro alfabetico A–Z** nella scelta dei soci; le lettere senza soci sono disattivate.
- ◐ 2.8 **EXTRA in modalità TUTTI**: mantenuto (invariato da v3); da riverificare quando si fa Tavolo Generico.

## Fase 3 — Responsive per le parti nuove
- ☑ 3.1 Barra delle schede con 7 voci: scorrimento su telefono, badge visibili.
- ☑ 3.2 Scheda Crediti e finestra di incasso per quantità a 375 / 768 / 1024 px.
- ☑ 3.3 Filtro A–Z su una riga scorrevole su telefono.
- ☑ 3.4 Campo del fondo cassa e tasto Carica configurazione su telefono (la riga dei tasti backup non deve sforare).

## Fase 4 — Test (estendere `tests/test_cassa.py`)
- ☑ 4.1 Incasso parziale per quantità: resto corretto, conto residuo, nome nello storico.
- ☑ 4.2 Apertura dell'incasso con tutto preselezionato (regressione del bug).
- ☑ 4.3 Chiusura con conti aperti: compaiono i crediti, tavoli liberi, incasso parziale del credito.
- ☑ 4.4 Configurazione: dopo il caricamento il PIN della build non funziona più e quello del file sì; i soci vengono aggiunti senza duplicati; un file con PIN non valido (lettere, meno di 4 cifre) o con `tipo` sbagliato è rifiutato senza modificare nulla; nel localStorage non c'è il PIN in chiaro.
- ☑ 4.5 Backup: esporta e reimporta con i crediti e con il PIN della configurazione (dopo l'import vale lo stesso PIN); import di un backup vecchio senza crediti né PIN; il file esportato non contiene il PIN in chiaro.
- ◐ 4.6 Elimina credito: testata la conferma; il controllo del PIN dipende da D3.
- ☑ 4.7 Nessuna richiesta esterna, nessun errore JS, nessuno sforamento a 375 / 768 / 1024 px, anche su Crediti e incasso.

Comandi:
```bash
CASSA_PIN=1234 npm run build
python3 tests/test_cassa.py dist/cassa_smart_bar_pub.html 1234
```

## Fase 5 — Rilascio
- ☑ 5.1 Build con il PIN scelto: `CASSA_PIN=xxxx npm run build` (per ora `1234`; il PIN vero arriverà dal JSON di configurazione).
- ☑ 5.2 Aggiornare `docs/CHANGELOG.md`, `docs/FUNZIONALITA.md`, `docs/CONTESTO.md` (modello dati) e `docs/STATO.md`.
- ☐ 5.3 Preparare il JSON di configurazione con i soci reali e il PIN (D1, D2), **fuori dal repo**, e caricarlo sul dispositivo del bar.
- ◐ 5.4 PR su `main`, merge, tag `v4`.
- ☐ 5.5 Migrazione sul dispositivo del bar: Esporta backup dalla versione online attuale, aggiornare e reimportare (vedi [MANUTENZIONE.md](MANUTENZIONE.md#aggiornare-il-dispositivo-del-bar)).
