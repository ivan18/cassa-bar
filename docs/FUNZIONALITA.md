# Cassa Smart Bar & Pub — Funzionalità

Elenco delle funzionalità esposte dall'applicazione (versione v3: offline/PWA con PIN verificato tramite hash).
Sito: https://ivan18.github.io/cassa-bar/

Da aggiornare a ogni rilascio che cambia il comportamento dell'app.

## Generali
- Intestazione modificabile con un clic: nome dell'associazione e nome della cassa, salvati nel dispositivo.
- Sei schede: Cassa, Conti aperti (con badge che conta i conti), Chiusura cassa, Prodotti, Soci, Storico.
- Area protetta da PIN per Chiusura cassa, Prodotti e Soci. Il PIN si inserisce con un tastierino numerico ed è verificato tramite hash SHA-256 (salt + PIN). Nessun suggerimento del PIN a schermo.
- Dati salvati nel localStorage del dispositivo (chiavi `cassa_*`). Funziona offline ed è installabile come PWA.

## Cassa (POS)
- **Tavoli**: Banco più Tavolo 1–6. Un tavolo è "occupato" (rosso, con puntino lampeggiante) se ha soci seduti o un conto aperto. Selezionando un tavolo si caricano il suo conto aperto e il primo socio seduto.
- **Soci al tavolo**: finestra con l'elenco dei soci, ricerca per iniziale del nome, aggiunta o rimozione con un tocco, contatore dei soci seduti.
- **Socio attivo**: i soci seduti appaiono come pulsanti e ogni prodotto aggiunto viene assegnato al socio selezionato.
- **Modalità TUTTI**: un tocco su un prodotto ne aggiunge uno a ogni socio seduto (per offrire un giro a tutto il tavolo).
- **Prodotti**: filtro per categoria (TUTTI più le categorie presenti nel listino); pulsanti con un colore per prodotto e il prezzo.
- **Battuta rapida extra**: 20 importi da € 0,10 a € 2,00 che aggiungono una voce "EXTRA". Funziona anche in modalità TUTTI.
- **Comanda**: voci separate per socio, quantità con + e − (a zero la voce sparisce), riassegnazione di una voce a un altro socio del tavolo, tasto Svuota, totale sempre visibile.
- **Salva conto**: salva o aggiorna il conto aperto del tavolo e torna al Banco.
- **Incassa**: apre la finestra di pagamento.
- Su telefono e tablet in verticale c'è una barra fissa in basso con tavolo, socio, numero di articoli, totale e i tasti Salva e Incassa.

## Incasso
- **Chi paga**: l'intero tavolo oppure la sola quota di un socio, con l'elenco delle sue voci.
- **Importi**: totale da pagare e resto calcolato sul contante ricevuto.
- **Inserimento contante**: tastierino con decimali e cancella, più i tasti rapidi Esatto, €5, €10, €20, €50.
- **Pagamento del tavolo intero**: registra la vendita, chiude il conto e libera il tavolo.
- **Pagamento di un socio**: registra solo la sua quota, lo toglie dal tavolo e lascia aperto il conto con le voci degli altri.

## Conti aperti
- Elenco dei conti aperti con tavolo, ora, totale e voci per socio.
- Azioni per ogni conto: Modifica (lo riapre nella cassa), Incassa, Elimina.

## Chiusura cassa (con PIN)
- Riepiloghi: fondo cassa iniziale, totale incassato oggi, totale presente in cassa.
- **Chiusura**: nome del cassiere, importo consegnato al presidente (di default l'intero incasso), causale. Anteprima del fondo cassa per il giorno dopo.
- **Conferma**: archivia la chiusura, imposta il nuovo fondo cassa e azzera lo storico delle vendite.
- Archivio delle chiusure registrate, ognuna eliminabile.
- **Esporta backup**: salva tutti i dati in un file JSON. **Importa backup**: li ripristina.

## Prodotti (con PIN)
- Aggiunta, modifica ed eliminazione di prodotti: nome, categoria, prezzo.
- Categorie fisse: Birre, Bibite, Snack, Bar, Extra.

## Soci (con PIN)
- Iscrizione ed eliminazione dei soci; i duplicati vengono ignorati.
- Elenco in ordine alfabetico.

## Storico
- Vendite dall'ultima chiusura: ora, tavolo, chi ha pagato, voci, totale.

## Limiti e comportamenti da tenere presenti
- Solo pagamenti in contanti: niente POS o carta, niente stampa dello scontrino.
- Il fondo cassa iniziale non si imposta a mano: si aggiorna solo con la chiusura o importando un backup (un fondo pari a 0 nel backup viene ignorato).
- Lo Storico non è protetto dal PIN; c'è un unico PIN per tutte e tre le aree protette.
- Il PIN si cambia solo con una nuova build (`CASSA_PIN`), non dall'app.
- I nuovi prodotti ricevono tutti lo stesso colore (ambra) e il colore non si può scegliere.
- Eliminare un socio dall'anagrafica non lo toglie dai tavoli dove è già seduto.
- Salva conto torna al Banco ma lascia i soci seduti al tavolo, che resta occupato.
- Il PIN è controllato nel browser e l'hash è nel codice pubblico: un PIN di poche cifre si ricava per tentativi. Serve come deterrente, non come protezione vera.
