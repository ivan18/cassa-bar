# Cassa Smart Bar & Pub — Funzionalità

Elenco delle funzionalità esposte dall'applicazione (versione **v4.2**: offline/PWA, PIN con hash, crediti, incasso per quantità, file di configurazione, Tavolo Generico, report stampabile, interfaccia adattata a telefono e tablet).
Sito: https://ivan18.github.io/cassa-bar/

Da aggiornare a ogni rilascio che cambia il comportamento dell'app.

## Generali
- Intestazione modificabile con un clic sul nome: si apre una finestra con nome dell'associazione e nome della cassa (Annulla / Salva), salvati nel dispositivo.
- Sette schede: Cassa, Conti aperti (badge con il numero dei conti), Crediti (badge con il numero dei crediti), Chiusura cassa, Prodotti, Soci, Storico. Sono sempre tutte visibili: su telefono in una griglia su due righe, da tablet su una riga.
- Area protetta da PIN per Chiusura cassa, Prodotti e Soci; il PIN serve anche per **Elimina** su conti aperti e crediti. Il PIN si inserisce con un tastierino numerico ed è verificato tramite hash SHA-256 (salt + PIN). Vale il PIN impostato con il file di configurazione o con un backup; se non c'è, quello della build. Nessun suggerimento del PIN a schermo.
- Dati salvati nel localStorage del dispositivo (chiavi `cassa_*`). Funziona offline ed è installabile come PWA.

## Cassa (POS)
- **Tavoli**: Banco più Tavolo 1–6. Un tavolo è "occupato" (rosso, con puntino lampeggiante) se ha soci seduti o un conto aperto. Selezionando un tavolo si caricano il suo conto aperto e il primo socio seduto.
- **Soci al tavolo**: finestra con l'elenco dei soci, **filtro alfabetico A–Z** su una riga scorrevole (le lettere senza soci sono disattivate), aggiunta o rimozione con un tocco, contatore dei soci seduti.
- **Socio attivo**: i soci seduti appaiono come pulsanti e ogni prodotto aggiunto viene assegnato al socio selezionato.
- **Tavolo Generico**: pulsante accanto ai soci; le voci battute senza socio (anche al Banco senza soci seduti) restano del tavolo: rientrano in "Intero tavolo" e in nessuna quota socio.
- **Modalità TUTTI**: un tocco su un prodotto ne aggiunge uno a ogni socio seduto (per offrire un giro a tutto il tavolo).
- **Prodotti**: filtro per categoria (TUTTI più le categorie presenti nel listino); pulsanti con un colore per prodotto e il prezzo.
- **Battuta rapida extra**: 20 importi da € 0,10 a € 2,00 che aggiungono una voce "EXTRA", oppure con la **descrizione facoltativa** scritta nel campo accanto (es. "Corretto", in maiuscolo; il campo si svuota dopo ogni battuta). Funziona anche in modalità TUTTI.
- **Comanda**: voci separate per socio, quantità con + e − (a zero la voce sparisce), riassegnazione di una voce a un altro socio del tavolo o al Tavolo Generico, tasto Svuota, totale sempre visibile.
- **Salva conto**: salva o aggiorna il conto aperto del tavolo e torna al Banco.
- **Incassa**: apre la finestra di pagamento.
- Su telefono e tablet in verticale c'è una barra fissa in basso con tavolo, socio, numero di articoli, totale e i tasti Salva e Incassa.

## Incasso (per quantità)
- All'apertura sono **selezionate tutte le quantità** di tutte le voci.
- **Chi paga**: preselezioni "Intero tavolo" o "Quota socio" (le voci di quel socio), più il tasto **Azzera selezione**. Con + e − si sceglie quante unità di ogni voce pagare; modificando a mano la preselezione diventa "Selezione manuale".
- **Importi**: totale da incassare ora e resto calcolato sul contante ricevuto.
- **Inserimento contante**: tastierino con decimali e cancella, più i tasti rapidi Esatto, €5, €10, €20, €50.
- Il tasto **CONFERMA INCASSO** è sempre visibile, mostra l'importo ed è disattivato se non è selezionato nulla.
- Dopo il pagamento:
  - nello Storico si registra chi ha pagato: "Intero Tavolo" se si paga tutto, il nome del socio se paga tutta la sua quota, "Nome (parziale)" se paga solo una parte della sua quota, "Parziale" se la selezione mescola più soci, "Credito del gg/mm" per i crediti;
  - le voci non pagate restano nel conto aperto;
  - un socio **esce dal tavolo** quando ha pagato e non ha più voci da pagare; se il conto è saldato del tutto il tavolo si libera.

## Conti aperti
- Elenco dei conti aperti **ordinati per tavolo** (Banco, poi Tavolo 1–6) con ora, totale e voci per socio.
- Azioni per ogni conto: Modifica (lo riapre nella cassa), Incassa, Elimina (chiede il PIN).

## Crediti
- Alla chiusura cassa i conti ancora aperti diventano **crediti**, con la data della chiusura e l'ora del conto.
- Elenco con il **totale dei sospesi**; per ogni credito: tavolo, data, voci per socio, totale.
- **Incassa credito**: stessa finestra di incasso per quantità, quindi anche parziale; il credito resta con le voci non pagate.
- **Elimina**: chiede il PIN, perché cancella un debito. Consultazione e incasso restano liberi.

## Chiusura cassa (con PIN)
- Riepiloghi: fondo cassa iniziale, totale incassato oggi, totale presente in cassa.
- **Fondo cassa manuale**: campo per impostarlo a mano (tasto Imposta) e tasto **Azzera** con conferma.
- **Chiusura**: nome del cassiere, importo consegnato al presidente (di default l'intero incasso), causale. Anteprima del fondo cassa per il giorno dopo.
- **Conferma**: se ci sono conti aperti chiede conferma; archivia la chiusura **insieme alle vendite della serata**, imposta il nuovo fondo cassa, svuota lo Storico (il totale del giorno riparte da zero), sposta i conti aperti nei Crediti e **libera tutti i tavoli**. L'avviso dice quanti conti sono passati nei crediti.
- Archivio delle chiusure registrate. Per ognuna: **Report** (rendiconto stampabile con totali e vendite; per le chiusure precedenti alla v4.2 solo i totali) ed Elimina (con conferma: si perdono anche le vendite archiviate).
- **Esporta backup**: salva tutti i dati in un file JSON, compresi i crediti e l'hash del PIN (mai il PIN in chiaro). **Importa backup**: li ripristina; i backup delle versioni precedenti restano importabili (un fondo cassa pari a 0 viene rispettato) e, se non contengono il PIN, il PIN del dispositivo non cambia.
- **Carica configurazione**: apre un file JSON con soci e PIN (formato in [PIANO-v4.md](PIANO-v4.md#formato-del-json-di-configurazione), esempio in [config.esempio.json](config.esempio.json)). I soci si aggiungono a quelli presenti senza doppioni; il PIN (solo cifre, almeno 4) viene salvato come hash. Un file non valido viene rifiutato per intero, senza modificare nulla.

## Prodotti (con PIN)
- Aggiunta, modifica ed eliminazione di prodotti: nome, categoria, prezzo.
- Categorie fisse: Birre, Bibite, Snack, Bar, Extra.

## Soci (con PIN)
- Iscrizione ed eliminazione dei soci; i duplicati vengono ignorati.
- Elenco in ordine alfabetico.
- Caricamento in blocco dal file di configurazione (vedi Chiusura cassa).

## Storico
- Vendite dall'ultima chiusura: ora, tavolo, chi ha pagato, voci, totale.
- **Stampa report**: rendiconto della serata in corso (fondo, incassato, totale in cassa, crediti da incassare, vendite e crediti in tabella). Si apre la stampa del browser: "Salva come PDF" per avere il file. Funziona offline.

## Limiti e comportamenti da tenere presenti
- Solo pagamenti in contanti: niente POS o carta, niente stampa dello scontrino.
- Il report usa la stampa del browser: su alcune app installate su iPhone/iPad la stampa può non essere disponibile; in quel caso aprire il sito in Safari.
- L'archivio delle chiusure cresce a ogni serata (con le vendite): dopo molti mesi conviene esportare un backup ed eliminare le chiusure più vecchie. Se la memoria si riempie l'app lo segnala.
- Lo Storico e la scheda Crediti non sono protetti dal PIN; c'è un unico PIN per tutte le aree protette.
- Le voci delle versioni precedenti assegnate al socio generico "Socio" restano così (compaiono come quota "Socio").
- I nuovi prodotti ricevono tutti lo stesso colore (ambra) e il colore non si può scegliere.
- Eliminare un socio dall'anagrafica non lo toglie dai tavoli dove è già seduto.
- Salva conto torna al Banco ma lascia i soci seduti al tavolo, che resta occupato (si libera all'incasso completo o alla chiusura cassa).
- Il PIN è controllato nel browser e l'hash della build è nel codice pubblico: un PIN di poche cifre si ricava per tentativi. Il PIN impostato con il file di configurazione non è pubblico, ma resta nel dispositivo come hash. Serve come deterrente, non come protezione vera.
