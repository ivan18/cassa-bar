# Cassa Smart Bar & Pub

App di cassa (POS) per il bar di un'associazione: tavoli, soci al tavolo, comande, incasso in contanti con resto (anche parziale, per quantità), conti aperti, crediti, chiusura cassa con consegna al presidente, backup dei dati.

**Sito:** https://ivan18.github.io/cassa-bar/

- Un solo file HTML, funziona **offline** e si installa come app (PWA) su telefono, tablet e PC.
- Nessun server: i dati restano nel browser del dispositivo (`localStorage`, chiavi `cassa_*`). Per spostarli si usa **Esporta / Importa backup** in Chiusura cassa.
- Chiusura cassa, Prodotti e Soci sono protetti da un PIN numerico, impostabile con il file di configurazione.

## Per chi lo usa al bar

1. Aprire il sito con Chrome o Safari e scegliere "Aggiungi a schermata Home" / "Installa app".
2. Alla prima apertura si parte con listino e soci di esempio. Per i soci reali e il PIN usare **Chiusura cassa → Carica configurazione** con un file JSON privato (modello: [docs/config.esempio.json](docs/config.esempio.json)); per spostare tutti i dati da un altro dispositivo usare **Importa backup**.
3. Prima di cambiare dispositivo o browser fare sempre **Esporta backup**.

L'elenco completo delle funzioni è in [docs/FUNZIONALITA.md](docs/FUNZIONALITA.md).

## Per chi lo sviluppa

Requisiti: Node 18+, Python 3 con Playwright, Google Chrome (solo per i test).

```bash
npm ci                                   # dipendenze di build (versioni fissate)
CASSA_PIN=1234 npm run build             # genera index.html, sw.js, manifest + dist/
pip install playwright                   # una volta sola
npm test -- 1234                         # test end-to-end (il PIN usato nella build)
# oppure: python3 tests/test_cassa.py dist/cassa_smart_bar_pub.html 1234
```

- Il sorgente è **`src/orig.html`** (React + JSX + classi Tailwind). Si modifica solo quello: `index.html`, `sw.js` e `manifest.webmanifest` sono generati dalla build.
- Pubblicare = fare merge su `main` dei file generati (GitHub Pages serve la root di `main`).

Procedura completa (build, test, PIN, rilascio, migrazione dati): [docs/MANUTENZIONE.md](docs/MANUTENZIONE.md).

## Struttura

```
src/orig.html          sorgente dell'app (si può aprire direttamente nel browser, usa le CDN)
build.mjs              build offline: JSX compilato, Tailwind ridotto, font e icone inline, hash del PIN
tests/test_cassa.py    test end-to-end in Chrome headless
index.html             app generata (pubblicata)
sw.js                  service worker generato (cache offline, versione per build)
manifest.webmanifest   manifest PWA generato
icon-192.png, icon-512.png   icone PWA (fisse)
docs/                  contesto, stato, piano, procedure (vedi sotto)
```

## Documentazione

| File | A cosa serve |
|------|--------------|
| [docs/STATO.md](docs/STATO.md) | **Da leggere per primo.** Cosa è pubblicato, cosa è in corso, task in sospeso, decisioni aperte. |
| [docs/CONTESTO.md](docs/CONTESTO.md) | Il progetto, i vincoli, l'architettura e le scelte fatte (e perché). |
| [docs/PIANO-v4.md](docs/PIANO-v4.md) | Piano della prossima versione (crediti, incasso per quantità, cambio PIN…). |
| [docs/FUNZIONALITA.md](docs/FUNZIONALITA.md) | Cosa fa l'app oggi, scheda per scheda, e i limiti noti. |
| [docs/MANUTENZIONE.md](docs/MANUTENZIONE.md) | Build, test, cambio PIN, rilascio, migrazione dei dati, problemi comuni. |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Storia delle versioni. |

## Limiti di sicurezza

Il PIN è verificato nel browser confrontando un hash SHA-256 (salt + PIN). Il repo è pubblico, quindi un PIN di poche cifre si può ricavare per tentativi: serve a scoraggiare l'uso da parte di chi è al bancone, non a proteggere dati sensibili. Per lo stesso motivo **non vanno mai messi nel repo** i backup o l'anagrafica dei soci reali.
