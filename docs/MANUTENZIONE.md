# Manutenzione: build, test, rilascio

## Prerequisiti

- Node 18+ (testato con Node 22).
- Per i test: Python 3, `pip install playwright` e Google Chrome. Se Chrome non è in `/usr/bin/google-chrome`, impostare `CHROME=/percorso/chrome`.

```bash
npm ci        # installa le versioni fissate in package-lock.json
```

## Modificare l'app

1. Creare un branch: `git switch -c feat/nome-modifica`.
2. Modificare **solo `src/orig.html`**. Per un'anteprima veloce si può aprire direttamente nel browser (usa le CDN; il PIN non funziona perché i segnaposto non sono sostituiti).
3. Se si aggiunge un'icona, usare `<Icon name="NomeLucide" />` con il nome esatto di Lucide (es. `CreditCard`), oppure `icon: 'NomeLucide'` in un elenco (come la barra delle schede): la build le incorpora, e si ferma con un errore se il nome non esiste. Un nome passato in altro modo (variabile calcolata) non viene visto e l'icona non compare.
4. Build e test (sotto). Non modificare a mano `index.html`, `sw.js`, `manifest.webmanifest`: vengono riscritti.

## Build

```bash
CASSA_PIN=1234 npm run build
```

Genera nella root `index.html`, `sw.js`, `manifest.webmanifest`, `.nojekyll`, e la copia `dist/cassa_smart_bar_pub.html`.

- `CASSA_PIN`: solo cifre, almeno 4. Se manca usa `1234` e stampa un avviso.
- **Prima di fare commit compilare sempre con il PIN di produzione**: il PIN finisce (come hash) in `index.html`.
- Il salt è casuale: `index.html` cambia a ogni build anche se il sorgente non cambia.

## Test

```bash
python3 tests/test_cassa.py dist/cassa_smart_bar_pub.html 1234
# equivalente: npm test -- 1234
```

Il secondo argomento è il PIN usato nella build. Il test verifica:
- nessuna richiesta di rete esterna e nessun errore JavaScript;
- una comanda (DREHER 66 cl + COCA COLA = € 3,50), incasso con ESATTO e registrazione nello Storico;
- PIN errato rifiutato, PIN corretto accettato, nessun suggerimento del PIN a schermo e nessuna password in chiaro nel file;
- incasso per quantità: preselezione completa, quota socio, riduzione a mano, resto, conto residuo, socio che esce dal tavolo, nomi nello Storico;
- conti aperti ordinati per tavolo, filtro A–Z, fondo cassa manuale e Azzera;
- chiusura con conti aperti → crediti, tavoli liberati, incasso parziale ed eliminazione di un credito;
- file di configurazione: rifiuto dei file non validi senza modifiche, soci aggiunti senza doppioni, PIN del file attivo e non salvato in chiaro;
- backup: esportazione con crediti e hash del PIN, reimportazione su un dispositivo nuovo, import di un backup vecchio (fondo a 0, PIN invariato);
- nessuno sforamento orizzontale a 360 / 375 / 768 / 1024 / 1280 px, anche su Crediti, finestra di incasso e Chiusura cassa;
- le 7 schede tutte dentro lo schermo e la finestra di modifica dell'intestazione (Annulla scarta, Salva applica) a ogni larghezza;
- v4.2: Tavolo Generico (anche escluso dalle quote socio), descrizione della battuta extra, PIN su Elimina conto ed Elimina credito, vendite archiviate nella chiusura senza doppio conteggio, report stampabile della serata e delle chiusure (la stampa è simulata).

Esce con codice 1 se qualcosa fallisce. Per controllare anche il file pubblicato: `python3 tests/test_cassa.py index.html 1234`.

## Rilascio

1. Build con il PIN di produzione, test superati.
2. Aggiornare `docs/CHANGELOG.md`, `docs/STATO.md` e, se cambiano funzioni, `docs/FUNZIONALITA.md`.
3. Commit di sorgente **e** file generati, push del branch, pull request su `main`.
4. Merge: GitHub Pages (branch `main`, cartella root) pubblica in circa un minuto.
5. Tag della versione: `git switch main && git pull && git tag vN && git push origin vN`, oppure da GitHub → Releases → Draft a new release (tag nuovo `vN` su `main`). Dalle sessioni Claude il push dei tag è bloccato: si usa la pagina Releases nel browser.

Il service worker cambia nome di cache a ogni build: i dispositivi scaricano la nuova versione alla prima apertura con la rete.

## Cambiare il PIN

1. `CASSA_PIN=<nuovo> npm run build` e test con il nuovo PIN.
2. Rilascio come sopra. Comunicare il nuovo PIN a chi gestisce la cassa (mai scriverlo nel repo, nelle issue o nei commit).

Il PIN vale per tutte le aree protette. Dalla v4 il modo consigliato è il **file di configurazione** (Chiusura cassa → Carica configurazione, vedi [config.esempio.json](config.esempio.json)): non richiede una nuova build e il PIN non finisce nel codice pubblico. Il PIN della build resta quello iniziale, valido finché sul dispositivo non si carica una configurazione o un backup che ne contiene uno.

## Aggiornare il dispositivo del bar

I dati restano nel browser e un aggiornamento normale non li tocca. Per sicurezza, prima di ogni rilascio importante:
1. sul dispositivo del bar: Chiusura cassa → **Esporta backup** (file `backup_cassa_AAAA-MM-GG.json`);
2. aprire il sito con la rete, ricaricare la pagina: si attiva la nuova versione;
3. controllare che prodotti, soci e conti aperti ci siano; se mancano, **Importa backup**.

I file di backup contengono i nomi dei soci: non vanno caricati nel repo (sono già esclusi da `.gitignore`).

## Problemi comuni

| Problema | Causa e soluzione |
|----------|-------------------|
| Il dispositivo mostra ancora la versione vecchia | Il service worker serve la cache se la rete è lenta o assente. Aprire con la rete e ricaricare; in ultima istanza chiudere e riaprire l'app installata. |
| "Verifica PIN non supportata da questo browser" | `crypto.subtle` richiede HTTPS o `file://`. Usare il sito su `https://` o il file locale, non un indirizzo `http://`. |
| La build si ferma con "Icona lucide mancante" | Nome icona sbagliato in `<Icon name="…">`: va usato il nome esatto di Lucide 0.460. |
| La build si ferma con "Componente Icon non trovato" | È cambiata l'indentazione della funzione `Icon` in `src/orig.html`: la build la cerca con una regex (`build.mjs`, passo 2). |
| La pubblicazione su Pages resta in "Queued" su Actions | Problema di GitHub (verificare githubstatus.com e Billing). Annullare l'esecuzione bloccata e rilanciarla; se non si sblocca, un nuovo merge su `main` fa partire una pubblicazione nuova; se persiste, supporto GitHub con il request ID dell'errore. |
| Dati spariti dopo aver cambiato browser o indirizzo | `localStorage` è legato a browser e dominio: usare Esporta/Importa backup. |

## Aggiornare le dipendenze

Le versioni sono fissate apposta (la build deve essere riproducibile). Per aggiornarle: cambiare la versione in `package.json`, `npm install`, build, test e controllo visivo a 375 / 768 / 1024 px. Tailwind va tenuto alla 3.x: la 4 cambia configurazione.
