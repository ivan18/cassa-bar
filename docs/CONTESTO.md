# Contesto del progetto

Documento stabile: cambia solo quando cambiano vincoli, architettura o decisioni di fondo. Lo stato corrente e i task sono in [STATO.md](STATO.md).

## Cos'è

App di cassa per il bar di un'associazione sportiva (ASD/APS). Al bancone c'è un volontario con un telefono o un tablet: deve battere consumazioni per tavolo e per socio, incassare in contanti, tenere aperti i conti e a fine serata fare la chiusura consegnando l'incasso al presidente.

Proprietario: Ivan (`ivan18` su GitHub). Lingua del progetto, dell'interfaccia e dei documenti: **italiano**.

## Vincoli (da rispettare in ogni modifica)

1. **Offline e senza server.** Nel bar la rete può mancare. Tutto sta in un file HTML con dentro React, CSS, font e icone; nessuna richiesta di rete (lo verifica il test).
2. **Dati solo sul dispositivo.** `localStorage`, chiavi `cassa_*`. Nessun backend, nessun account. Il passaggio di dati avviene con Esporta/Importa backup (JSON).
3. **Repo pubblico.** Niente dati personali (nomi reali dei soci, backup) nel repo. Il PIN è presente solo come hash + salt.
4. **Uso con le dita.** Tastierini numerici a schermo (PIN e contante), pulsanti grandi, layout funzionante a 375 / 768 / 1024 px, barra comanda fissa in basso su telefono.
5. **Compatibilità dei backup.** Un backup esportato da una versione vecchia deve restare importabile nelle nuove.
6. **Codice snello.** Niente librerie aggiunte se non servono davvero; la build resta un singolo script.

## Architettura

```
src/orig.html ──build.mjs──▶ index.html (+ sw.js, manifest.webmanifest)   → GitHub Pages (root di main)
                         └─▶ dist/cassa_smart_bar_pub.html               → test e uso locale
```

- `src/orig.html` è il sorgente "storico" dell'app: un unico componente React `App` scritto in JSX dentro `<script type="text/babel">`, con classi Tailwind. Aperto nel browser funziona così com'è (carica React, Babel, Tailwind e Lucide dalle CDN), tranne il PIN, che vale solo nella build.
- `build.mjs`:
  1. estrae il JSX e sostituisce `__PIN_SALT__` / `__PIN_HASH__` con salt casuale e `sha256(salt + CASSA_PIN)`;
  2. sostituisce il componente `Icon` (Lucide via DOM) con SVG inline delle sole icone usate;
  3. compila e minifica con esbuild (React resta globale, UMD inline);
  4. genera il CSS Tailwind con le sole classi usate;
  5. incorpora il font Inter (woff2 in base64);
  6. scrive `index.html`, `sw.js` (versione = hash del file, così la cache si aggiorna), `manifest.webmanifest`, `.nojekyll` nella root e una copia in `dist/`.
- Il salt è casuale a ogni build: `index.html` cambia sempre, anche senza modifiche al sorgente. È normale.
- Versioni delle dipendenze fissate in `package.json` (con `@fontsource-variable/inter` 5.2.8 la build v2 si riproduce identica byte per byte).

### Modello dati (localStorage)

| Chiave | Contenuto |
|--------|-----------|
| `cassa_products` | listino `[{id, name, category, price, color}]` |
| `cassa_customerList` | nomi dei soci, ordinati |
| `cassa_tableMembersMap` | `{ "Tavolo 1": ["Marco", …] }` soci seduti |
| `cassa_openTabs` | conti aperti `[{id, table, items, total, time, members}]` |
| `cassa_salesHistory` | vendite dall'ultima chiusura `[{id, time, table, customerName, items, total}]` |
| `cassa_creditTabs` | crediti `[{creditId, closureDate, table, items, total, time, members}]` (v4) |
| `cassa_dailyClosuresHistory` | chiusure registrate (da v4 con `creditsCreated`) |
| `cassa_pinSalt`, `cassa_pinHash` | PIN del dispositivo (da configurazione o backup, v4); se mancano vale quello della build |
| `cassa_initialFund` | fondo cassa |
| `cassa_clubName`, `cassa_registerName` | intestazione |

Ogni voce di comanda: `{...prodotto, cartItemId, qty, assignedCustomer}`. Il backup JSON contiene le stesse informazioni con nomi senza prefisso (`products`, `customerList`, `creditTabs`, `pinSalt`, `pinHash`, …). Il file di configurazione è diverso: `{tipo: "cassa-bar-config", versione: 1, soci?, pin?}`.

## Decisioni prese

| Data | Decisione | Perché |
|------|-----------|--------|
| 2026-11-10 | Tutto inline in un file, niente CDN (v2) | Funzionamento offline e nessuna dipendenza esterna a runtime |
| 2026-11-10 | PIN come hash SHA-256 + salt generato in build, solo cifre (v3) | Le password `admin`/`pub` non erano digitabili dal tastierino e il PIN era scritto in chiaro e suggerito a schermo |
| 2026-11-10 | Service worker "rete prima, cache se offline" | Gli aggiornamenti arrivano alla prima apertura online, ma l'app funziona senza rete |
| 2026-11-11 | Sorgente, build, test e documenti spostati nel repo (prima erano solo nel Progetto Claude) | Manutenzione e ripresa del contesto da qualunque sessione |
| 2026-11-11 | Le versioni si identificano con i tag git (`v3`, `v4`…) invece delle cartelle `versioni/` | Evita copie duplicate del sorgente |
| 2026-11-11 | Pubblicazione tramite pull request su `main` | Revisione prima che la modifica arrivi al bar |
| 2026-11-11 | v4: soci reali e PIN da un JSON di configurazione caricato dall'app (D1, D2) | Il sito e il repo sono pubblici: nomi e PIN devono restare in un file privato sul dispositivo |

## Dove si trovano le cose

- **Repo GitHub `ivan18/cassa-bar`**: fonte di verità per sorgente, build, test e documenti.
- **Progetto Claude "cassa-bar"**: storico delle sessioni e file di riferimento non pubblicabili, in particolare `versioni/input-2026-11-11-crediti/asd_cassa_bar.html` (versione con i crediti fornita dall'utente, contiene i nomi reali dei soci: **non copiarla nel repo**). Le copie dei documenti che stanno lì (`claude/*.md`) sono superate da quelle in `docs/`.

## Glossario

- **Conto aperto**: comanda salvata su un tavolo, da incassare più tardi.
- **Quota socio**: le voci assegnate a un socio, incassabili separatamente.
- **Modalità TUTTI**: un tocco su un prodotto ne aggiunge uno a ogni socio seduto.
- **Fondo cassa**: contante iniziale; alla chiusura diventa `fondo + incasso − consegnato al presidente`.
- **JSON di configurazione** (v4): file privato con soci e PIN, caricato dall'app.
- **Credito** (v4): conto rimasto aperto alla chiusura, da incassare nei giorni seguenti.
