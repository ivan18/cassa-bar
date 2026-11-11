"""Test end-to-end della cassa (Chrome headless, rete esterna bloccata).

Uso:
    python3 tests/test_cassa.py dist/cassa_smart_bar_pub.html [PIN]

Verifica:
- base: nessuna richiesta esterna, nessun errore JS, incasso completo, PIN errato
  rifiutato / corretto accettato, nessun suggerimento del PIN, nessuno sforamento
  a 375 / 768 / 1024 px;
- v4.2: Tavolo Generico, descrizione della battuta extra, PIN su Elimina conto ed
  Elimina credito, chiusura che archivia le vendite, report stampabile;
- v4: incasso per quantità (preselezione, quota socio, parziale, socio che esce),
  conti aperti ordinati, filtro A-Z, fondo cassa manuale, chiusura con crediti e
  incasso parziale del credito, file di configurazione (soci + PIN), backup con
  crediti e PIN, import di backup vecchi.
"""
import json
import os
import re
import sys
import tempfile
from playwright.sync_api import sync_playwright

FILE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/cassa_smart_bar_pub.html')
PIN = sys.argv[2] if len(sys.argv) > 2 else os.environ.get('CASSA_PIN', '1234')
WRONG = '0' * len(PIN) if PIN != '0' * len(PIN) else '9' * len(PIN)
CONFIG_PIN = '482915' if PIN != '482915' else '615243'
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
URL = 'file://' + FILE
TMP = tempfile.mkdtemp(prefix='cassa_test_')

failures = []


def check(name, ok, detail=''):
    print(('OK   ' if ok else 'FAIL ') + name + (f' ({detail})' if detail else ''))
    if not ok:
        failures.append(name)


def open_page(browser, w=1280, h=900):
    """Pagina in un contesto nuovo (localStorage vuoto). Raccoglie richieste esterne, errori e dialoghi."""
    ctx = browser.new_context(viewport={'width': w, 'height': h}, accept_downloads=True)
    page = ctx.new_page()
    page.external, page.errors, page.dialogs = [], [], []

    def route(r):
        if r.request.url.startswith(('file:', 'data:', 'blob:')):
            r.continue_()
        else:
            page.external.append(r.request.url)
            r.abort()

    def on_dialog(d):
        page.dialogs.append(d.message)
        d.accept()

    page.route('**/*', route)
    page.on('pageerror', lambda e: page.errors.append(str(e)))
    page.on('dialog', on_dialog)
    page.goto(URL)
    page.wait_for_timeout(400)
    return page


def ls(page, key):
    raw = page.evaluate(f'localStorage.getItem("{key}")')
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except ValueError:
        return raw


TAB_IDS = {'CASSA': 'pos', 'CONTI APERTI': 'open-tabs', 'CREDITI': 'credits', 'CHIUSURA CASSA': 'daily-report',
           'PRODOTTI': 'products', 'SOCI': 'customers', 'STORICO': 'history'}


def tab(page, label):
    return page.locator(f'header [data-tab="{TAB_IDS[label]}"]')


def nav(page, label):
    tab(page, label).click()
    page.wait_for_timeout(150)


def enter_pin(page, code, tab='PRODOTTI', title='Gestione Listino Prodotti'):
    """Apre un'area protetta, digita il PIN e restituisce (entrato, testo della finestra PIN)."""
    nav(page, tab)
    modal_text = page.inner_text('text=Area Protetta >> xpath=../..')
    for d in code:
        page.click(f'button:text-is("{d}")')
    page.click('text=Accedi')
    page.wait_for_timeout(250)
    entered = page.locator(f'text={title}').count() > 0
    if not entered:
        modal_text += '\n' + page.inner_text('text=Area Protetta >> xpath=../..')
    if page.locator('text=Annulla').count():
        page.click('text=Annulla')
    return entered, modal_text


def open_closure(page, code=PIN):
    entered, _ = enter_pin(page, code, 'CHIUSURA CASSA', 'Chiusura Cassa e Rendicontazione')
    return entered


def select_table(page, table):
    page.get_by_role('button', name=table, exact=True).click()


def seat(page, table, names):
    nav(page, 'CASSA')
    select_table(page, table)
    page.click('button:has-text("SOCI AL TAVOLO")')
    for n in names:
        page.locator('.fixed button', has_text=f'👤 {n}').click()
    page.click('text=CONFERMA E CHIUDI')


def add(page, member, product, times=1):
    if member:
        page.locator('main button', has_text=re.compile(rf'^👤 {member}$')).click()
    for _ in range(times):
        page.click(f'button:has-text("{product}")')


def pin_action(page, code):
    """Finestra PIN già aperta da un'azione (es. Elimina): digita il PIN e conferma. Restituisce il motivo mostrato."""
    reason = page.inner_text('[data-testid="pin-motivo"]') if page.locator('[data-testid="pin-motivo"]').count() else ''
    for d in code:
        page.click(f'button:text-is("{d}")')
    page.click('text=Accedi')
    page.wait_for_timeout(250)
    if page.locator('text=Area Protetta').count():
        page.click('text=Annulla')
    return reason


def due(page):
    return page.inner_text('[data-testid="da-incassare"]').replace('€', '').strip()


def ls_cart_label(page):
    return page.locator('#comanda select').first.evaluate('s => s.options[s.selectedIndex].text')


def write_json(name, data):
    path = os.path.join(TMP, name)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f)
    return path


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME)

    # ---------- Base ----------
    page = open_page(browser)
    page.click('button:has-text("DREHER 66 cl")')
    page.click('button:has-text("COCA COLA")')
    total = page.inner_text('text=Totale Comanda >> xpath=..')
    check('totale comanda 3.50', '3.50' in total, total.replace('\n', ' '))
    page.click('button:has-text("INCASSA"):visible >> nth=-1')
    check('incasso si apre con tutto selezionato', due(page) == '3.50', due(page))
    page.click('text=ESATTO')
    page.click('button:has-text("CONFERMA INCASSO")')
    nav(page, 'STORICO')
    hist = page.inner_text('main')
    check('vendita registrata nello storico', '3.50' in hist and 'Intero Tavolo' in hist)

    ok_wrong, text_wrong = enter_pin(page, WRONG)
    check('PIN errato rifiutato', not ok_wrong)
    check('nessun suggerimento del PIN a schermo',
          PIN not in text_wrong and 'predefinit' not in text_wrong.lower(), text_wrong.replace('\n', ' ')[:120])
    ok_right, _ = enter_pin(page, PIN)
    check('PIN corretto accettato', ok_right)
    source = open(FILE, encoding='utf-8').read()
    # v2 confrontava il PIN in chiaro: e==="1234"||e==="admin"||e==="pub"
    leaks = [s for s in (f'==="{PIN}"', '==="admin"', '==="pub"', 'Password predefinita', 'es. 1234') if s in source]
    check('nessuna password in chiaro nel file', not leaks, ', '.join(leaks))
    page.context.close()

    # ---------- v4: incasso per quantità, conti ordinati, filtro A-Z ----------
    page = open_page(browser)
    page.click('button:has-text("SOCI AL TAVOLO")')
    page.locator('[data-testid="filtro-az"] button', has_text=re.compile('^M$')).click()
    names = page.locator('.fixed .grid button').all_inner_texts()
    q_disabled = page.locator('[data-testid="filtro-az"] button', has_text=re.compile('^Q$')).is_disabled()
    check('filtro A-Z: solo i soci con la M, lettere vuote disattivate',
          len(names) == 2 and all('M' in n for n in names) and q_disabled, ', '.join(n.replace('\n', ' ') for n in names))
    page.locator('[data-testid="filtro-az"] button', has_text='TUTTI').click()
    page.click('text=CONFERMA E CHIUDI')

    seat(page, 'Tavolo 2', ['Luca'])
    add(page, 'Luca', 'CAFF')
    page.click('button:has-text("SALVA CONTO")')
    seat(page, 'Tavolo 1', ['Andrea', 'Chiara'])
    add(page, 'Andrea', 'DREHER 66 cl', 4)
    add(page, 'Chiara', 'COCA COLA')
    page.click('button:has-text("SALVA CONTO")')
    select_table(page, 'Banco')
    add(page, None, 'ACQUA 500 ml')
    page.click('button:has-text("SALVA CONTO")')

    nav(page, 'CONTI APERTI')
    order = [o.title() for o in re.findall(r'(Banco|Tavolo \d)', page.inner_text('main'), re.I)]
    check('conti aperti ordinati per tavolo', order[:3] == ['Banco', 'Tavolo 1', 'Tavolo 2'], ' '.join(order))

    card = page.locator('main .grid > div', has_text='Tavolo 1')
    card.locator('button:has-text("Incassa")').click()
    check('incasso conto aperto con tutto selezionato (€ 9.50)', due(page) == '9.50', due(page))
    page.select_option('[data-testid="preset-incasso"]', 'Andrea')
    check('preselezione quota socio (€ 8.00)', due(page) == '8.00', due(page))
    page.locator('[data-testid="voce-incasso"]').first.locator('button[aria-label="meno"]').click()
    page.locator('[data-testid="voce-incasso"]').first.locator('button[aria-label="meno"]').click()
    check('quantità ridotta a mano (€ 4.00)', due(page) == '4.00', due(page))
    page.click('button:has-text("€5")')
    change = page.inner_text('text=Resto da dare: >> xpath=..')
    check('resto calcolato sul parziale (€ 1.00)', '1.00' in change, change.replace('\n', ' '))
    page.click('button:has-text("CONFERMA INCASSO")')
    tab1 = [t for t in ls(page, 'cassa_openTabs') if t['table'] == 'Tavolo 1'][0]
    check('conto residuo dopo incasso parziale (€ 5.50)', abs(tab1['total'] - 5.5) < 1e-9, tab1['total'])
    check('chi ha ancora voci resta al tavolo',
          ls(page, 'cassa_tableMembersMap')['Tavolo 1'] == ['Andrea', 'Chiara'])

    card = page.locator('main .grid > div', has_text='Tavolo 1')
    card.locator('button:has-text("Incassa")').click()
    page.select_option('[data-testid="preset-incasso"]', 'Chiara')
    check('quota di Chiara (€ 1.50)', due(page) == '1.50', due(page))
    page.click('button:has-text("CONFERMA INCASSO")')
    check('il socio che ha pagato tutto esce dal tavolo',
          ls(page, 'cassa_tableMembersMap')['Tavolo 1'] == ['Andrea'], ls(page, 'cassa_tableMembersMap')['Tavolo 1'])
    card = page.locator('main .grid > div', has_text='Tavolo 1')
    card.locator('button:has-text("Incassa")').click()
    page.click('text=Azzera')
    disabled = page.locator('button:has-text("Seleziona cosa incassare")').is_disabled()
    check('"Azzera selezione" porta a € 0.00 e blocca la conferma', due(page) == '0.00' and disabled)
    page.locator('.fixed button:has-text("×")').click()
    nav(page, 'STORICO')
    hist = page.inner_text('main')
    check('storico: nome del socio / parziale', 'Andrea (parziale)' in hist and '(Chiara)' in hist, hist[:200].replace('\n', ' '))

    # ---------- v4: fondo cassa manuale ----------
    check('accesso a Chiusura cassa', open_closure(page))
    page.fill('input[placeholder="Nuovo fondo..."]', '30')
    page.click('button:has-text("Imposta")')
    check('fondo cassa impostato a mano', '30.00' in page.inner_text('[data-testid="fondo-cassa"]'))
    page.click('button:text-is("Azzera")')
    check('fondo cassa azzerato (con conferma)', '0.00' in page.inner_text('[data-testid="fondo-cassa"]')
          and any('Azzerare' in d for d in page.dialogs))

    # ---------- v4: chiusura con crediti ----------
    page.click('button:has-text("CONFERMA ED REGISTRA")')
    credits = ls(page, 'cassa_creditTabs')
    check('chiusura: i conti aperti diventano crediti', len(credits) == 3 and not ls(page, 'cassa_openTabs'), len(credits))
    check('chiusura: tavoli liberati', ls(page, 'cassa_tableMembersMap') == {}, ls(page, 'cassa_tableMembersMap'))
    check("l'avviso di chiusura dice quanti conti sono passati ai crediti",
          any('3 conti aperti sono passati' in d for d in page.dialogs))
    nav(page, 'CREDITI')
    check('scheda Crediti: totale sospesi (€ 5.50)', '5.50' in page.inner_text('[data-testid="totale-crediti"]'))
    check('badge dei crediti', '3' in tab(page, 'CREDITI').inner_text())
    card = page.locator('main .grid > div', has_text='Tavolo 1')
    card.locator('button:has-text("Incassa credito")').click()
    check('incasso credito con tutto selezionato (€ 4.00)', due(page) == '4.00', due(page))
    page.locator('[data-testid="voce-incasso"]').first.locator('button[aria-label="meno"]').click()
    page.click('button:has-text("CONFERMA INCASSO")')
    t1 = [c for c in ls(page, 'cassa_creditTabs') if c['table'] == 'Tavolo 1'][0]
    check('incasso parziale del credito (resta € 2.00)', abs(t1['total'] - 2) < 1e-9, t1['total'])
    nav(page, 'STORICO')
    check('storico: "Credito del gg/mm"', re.search(r'Credito del \d\d/\d\d', page.inner_text('main')) is not None)
    nav(page, 'CREDITI')
    page.locator('main .grid > div', has_text='Tavolo 2').locator('button:has-text("Elimina")').click()
    reason = pin_action(page, WRONG)
    check('elimina credito: con PIN errato il credito resta', len(ls(page, 'cassa_creditTabs')) == 3 and 'Tavolo 2' in reason, reason)
    page.locator('main .grid > div', has_text='Tavolo 2').locator('button:has-text("Elimina")').click()
    pin_action(page, PIN)
    check('elimina credito: con il PIN giusto viene cancellato', len(ls(page, 'cassa_creditTabs')) == 2)

    # ---------- v4: file di configurazione ----------
    open_closure(page)
    before = ls(page, 'cassa_customerList')
    for name, cfg, why in [
        ('cfg_pin_lettere.json', {'tipo': 'cassa-bar-config', 'versione': 1, 'soci': ['Nuovo Socio'], 'pin': '12a4'}, 'PIN con lettere'),
        ('cfg_pin_corto.json', {'tipo': 'cassa-bar-config', 'versione': 1, 'pin': '123'}, 'PIN corto'),
        ('cfg_pin_numero.json', {'tipo': 'cassa-bar-config', 'versione': 1, 'pin': 482915}, 'PIN numerico'),
        ('cfg_tipo.json', {'tipo': 'altro', 'versione': 1, 'soci': ['Nuovo Socio']}, 'tipo sbagliato'),
    ]:
        page.dialogs.clear()
        page.set_input_files('[data-testid="carica-configurazione"]', write_json(name, cfg))
        page.wait_for_timeout(300)
        rejected = any('non caricata' in d for d in page.dialogs)
        unchanged = ls(page, 'cassa_customerList') == before and ls(page, 'cassa_pinHash') is None
        check(f'configurazione rifiutata senza modifiche: {why}', rejected and unchanged, ' | '.join(page.dialogs))

    page.dialogs.clear()
    cfg = {'tipo': 'cassa-bar-config', 'versione': 1, 'soci': ['Zeno Prova', 'andrea', '  ', 'Zeno Prova'], 'pin': CONFIG_PIN}
    page.set_input_files('[data-testid="carica-configurazione"]', write_json('cfg_ok.json', cfg))
    page.wait_for_timeout(400)
    after = ls(page, 'cassa_customerList')
    check('configurazione: soci aggiunti senza duplicati',
          'Zeno Prova' in after and len(after) == len(before) + 1, ' | '.join(page.dialogs))
    check("configurazione: l'avviso riepiloga", any('Soci aggiunti: 1 (1 già presente)' in d and 'PIN aggiornato' in d for d in page.dialogs),
          ' | '.join(page.dialogs))
    storage = page.evaluate('JSON.stringify(Object.assign({}, localStorage))')
    check('il PIN della configurazione non è salvato in chiaro', CONFIG_PIN not in storage and ls(page, 'cassa_pinHash') is not None)
    check('dopo la configurazione il PIN della build non vale più', not enter_pin(page, PIN)[0])
    check('dopo la configurazione vale il PIN del file', enter_pin(page, CONFIG_PIN)[0])

    # ---------- v4: backup con crediti e PIN ----------
    open_closure(page, CONFIG_PIN)
    with page.expect_download() as dl:
        page.click('button:has-text("Esporta Backup")')
    backup_path = os.path.join(TMP, 'backup.json')
    dl.value.save_as(backup_path)
    backup_text = open(backup_path, encoding='utf-8').read()
    backup = json.loads(backup_text)
    check('backup: contiene crediti e hash del PIN, non il PIN in chiaro',
          len(backup.get('creditTabs', [])) == 2 and backup.get('pinHash') and CONFIG_PIN not in backup_text)
    check('nessuna richiesta esterna (v4)', not page.external, ', '.join(page.external[:3]))
    check('nessun errore JavaScript (v4)', not page.errors, '; '.join(page.errors[:3]))
    page.context.close()

    page = open_page(browser)
    open_closure(page)
    page.set_input_files('[data-testid="importa-backup"]', backup_path)
    page.wait_for_timeout(300)
    check('import backup: crediti ripristinati', len(ls(page, 'cassa_creditTabs')) == 2)
    check('import backup: vale il PIN del backup', not enter_pin(page, PIN)[0] and enter_pin(page, CONFIG_PIN)[0])
    page.context.close()

    page = open_page(browser)
    open_closure(page)
    old = {'products': backup['products'], 'customerList': ['Vecchio Socio'], 'openTabs': [], 'salesHistory': [],
           'dailyClosuresHistory': [], 'initialFund': 0, 'clubName': 'ASD TEST', 'registerName': 'CASSA', 'tableMembersMap': {}}
    page.set_input_files('[data-testid="importa-backup"]', write_json('backup_vecchio.json', old))
    page.wait_for_timeout(300)
    check('import backup vecchio: fondo cassa a 0 rispettato', page.evaluate('localStorage.getItem("cassa_initialFund")') == '0')
    check('import backup vecchio: PIN invariato e nessun credito',
          ls(page, 'cassa_pinHash') is None and ls(page, 'cassa_creditTabs') == [] and enter_pin(page, PIN)[0])
    open_closure(page)
    page.dialogs.clear()
    page.set_input_files('[data-testid="importa-backup"]', write_json('cfg_come_backup.json', cfg))
    page.wait_for_timeout(300)
    check('una configurazione importata come backup viene rifiutata',
          any('Carica configurazione' in d for d in page.dialogs) and ls(page, 'cassa_pinHash') is None)
    page.context.close()

    # ---------- v4.2: Tavolo Generico, descrizione extra, elimina conto con PIN ----------
    page = open_page(browser)
    page.click('button:has-text("COCA COLA")')
    check('al Banco senza soci la voce va al Tavolo Generico', ls_cart_label(page) == 'Tavolo Generico', ls_cart_label(page))
    seat(page, 'Tavolo 3', ['Andrea'])
    add(page, 'Andrea', 'DREHER 66 cl')
    page.click('main button:has-text("📌 Tavolo Generico")')
    page.click('button:has-text("PATATINE")')
    page.fill('[data-testid="descrizione-extra"]', 'gelato')
    page.click('button:text-is("€ 1.00")')
    cart = page.inner_text('#comanda')
    check('battuta extra con descrizione (GELATO) al Tavolo Generico', 'GELATO' in cart and cart.count('Tavolo Generico') >= 2, cart[:200].replace('\n', ' '))
    check('la descrizione si svuota dopo la battuta', page.input_value('[data-testid="descrizione-extra"]') == '')
    page.click('button:text-is("€ 0.50")')
    check('senza descrizione resta EXTRA', 'EXTRA' in page.inner_text('#comanda'))
    page.click('button:has-text("INCASSA"):visible >> nth=-1')
    opts = page.locator('[data-testid="preset-incasso"] option').all_inner_texts()
    check('incasso: nessuna "quota" per il Tavolo Generico', not any('Generico' in o for o in opts), ' | '.join(opts))
    page.select_option('[data-testid="preset-incasso"]', 'Andrea')
    check('quota di Andrea senza le voci del tavolo (€ 2.00)', due(page) == '2.00', due(page))
    page.locator('.fixed button:has-text("×")').click()
    page.click('button:has-text("SALVA CONTO")')
    nav(page, 'CONTI APERTI')
    page.locator('main .grid > div', has_text='Tavolo 3').locator('button:has-text("Elimina")').click()
    reason = pin_action(page, WRONG)
    check('elimina conto aperto: chiede il PIN e con PIN errato resta',
          len(ls(page, 'cassa_openTabs')) == 1 and 'Tavolo 3' in reason, reason)
    page.locator('main .grid > div', has_text='Tavolo 3').locator('button:has-text("Elimina")').click()
    pin_action(page, PIN)
    check('elimina conto aperto: con il PIN giusto viene cancellato', ls(page, 'cassa_openTabs') == [])
    check('nessun errore JavaScript (v4.2 cassa)', not page.errors, '; '.join(page.errors[:3]))
    page.context.close()

    # ---------- v4.2: chiusura che archivia le vendite, report stampabile ----------
    page = open_page(browser)
    page.evaluate('() => { window.__stampe = 0; window.print = () => { window.__stampe++; }; }')
    for prod in ('DREHER 66 cl', 'COCA COLA'):
        page.click(f'button:has-text("{prod}")')
        page.click('button:has-text("INCASSA"):visible >> nth=-1')
        page.click('button:has-text("CONFERMA INCASSO")')
    nav(page, 'STORICO')
    page.click('[data-testid="stampa-serata"]')
    page.wait_for_timeout(200)
    rep_txt = page.evaluate("document.getElementById('report-stampa')?.innerText || ''")
    check('report della serata: stampa avviata con vendite e totale',
          page.evaluate('window.__stampe') == 1 and 'COCA COLA' in rep_txt and '3.50' in rep_txt, rep_txt[:150].replace('\n', ' '))
    check('il report non si vede sullo schermo', not page.locator('#report-stampa').is_visible())
    check('nessun "Azzera storico" nella scheda Storico', page.locator('text=/azzera storico/i').count() == 0)
    open_closure(page)
    page.fill('input[placeholder="Nuovo fondo..."]', '50')
    page.click('button:has-text("Imposta")')
    page.click('button:has-text("CONFERMA ED REGISTRA")')
    closures = ls(page, 'cassa_dailyClosuresHistory')
    sales = closures[0].get('sales', [])
    check('chiusura: le vendite sono archiviate nella chiusura, in ordine',
          len(sales) == 2 and sales[0]['items'][0]['name'] == 'DREHER 66 cl' and 'color' not in sales[0]['items'][0], json.dumps(sales)[:150])
    check('chiusura: lo storico si svuota', ls(page, 'cassa_salesHistory') == [])
    check('dopo la chiusura il totale di oggi riparte da 0 (nessun doppio conteggio)',
          '€ 0.00' in page.inner_text('text=Totale Incassato Oggi >> xpath=..'))
    page.click('button:has-text("CONFERMA ED REGISTRA")')
    second = ls(page, 'cassa_dailyClosuresHistory')[0]
    check('seconda chiusura senza vendite: incasso 0 e fondo invariato',
          second['totalSales'] == 0 and abs(second['newInitialFundForNextDay'] - 50) < 1e-9, f"{second['totalSales']} {second['newInitialFundForNextDay']}")
    page.locator('[data-testid="stampa-chiusura"]').nth(1).click()
    page.wait_for_timeout(200)
    rep_txt = page.evaluate("document.getElementById('report-stampa')?.innerText || ''")
    check('report di una chiusura archiviata: totali e vendite',
          'Consegnato al presidente' in rep_txt and 'DREHER 66 cl' in rep_txt and '3.50' in rep_txt, rep_txt[:200].replace('\n', ' '))
    page.dialogs.clear()
    page.locator('main button:text-is("Elimina")').first.click()
    check("eliminare una chiusura dall'archivio chiede conferma",
          len(ls(page, 'cassa_dailyClosuresHistory')) == 1 and any('Si perdono anche le vendite' in d for d in page.dialogs))
    page.context.close()

    page = open_page(browser)
    page.evaluate('() => { window.print = () => {}; }')
    open_closure(page)
    old_closure = {'id': 1, 'date': '01/11/2026', 'time': '23:30', 'cashierName': 'Op', 'initialFund': 50, 'totalSales': 20,
                   'presidentAmount': 20, 'reasonNotes': 'Consegna', 'newInitialFundForNextDay': 50}
    page.set_input_files('[data-testid="importa-backup"]', write_json('backup_v41.json', {'dailyClosuresHistory': [old_closure]}))
    page.wait_for_timeout(300)
    page.click('[data-testid="stampa-chiusura"]')
    page.wait_for_timeout(200)
    rep_txt = page.evaluate("document.getElementById('report-stampa')?.innerText || ''")
    check('report di una chiusura vecchia (senza vendite): solo totali', 'Dettaglio non disponibile' in rep_txt and '20.00' in rep_txt, rep_txt[:150].replace('\n', ' '))
    check('nessun errore JavaScript (v4.2 chiusura)', not page.errors, '; '.join(page.errors[:3]))
    page.context.close()

    # ---------- Responsive ----------
    seed = {
        'cassa_customerList': json.dumps(['Andrea', 'Chiara']),
        'cassa_creditTabs': json.dumps([{'creditId': 'c1', 'table': 'Tavolo 3', 'time': '23:10', 'closureDate': '11/11', 'total': 7.6,
                                         'items': [{'id': 1, 'name': 'BAVARIA 66 cl', 'price': 2, 'qty': 3, 'assignedCustomer': 'Andrea'},
                                                   {'id': 13, 'name': 'SALATINI', 'price': 0.3, 'qty': 2, 'assignedCustomer': 'Chiara'},
                                                   {'id': 'x', 'name': 'EXTRA', 'price': 1, 'qty': 1, 'assignedCustomer': 'Chiara'}]}]),
    }
    for w, h in [(360, 740), (375, 812), (768, 1024), (1024, 768), (1280, 800)]:
        page = open_page(browser, w, h)
        sw = page.evaluate('document.documentElement.scrollWidth')
        check(f'nessuno sforamento a {w}px', sw <= w, f'scrollWidth {sw}')
        boxes = [tab(page, l).bounding_box() for l in TAB_IDS]
        hidden = [l for l, b in zip(TAB_IDS, boxes) if not b or b['x'] < 0 or b['x'] + b['width'] > w]
        check(f'tutte le 7 schede visibili a {w}px', not hidden, ', '.join(hidden))
        page.click('button[aria-label="Modifica intestazione"]')
        sw = page.evaluate('document.documentElement.scrollWidth')
        over = page.evaluate("() => { const f = document.querySelector('form'); return f.scrollWidth - f.clientWidth; }")
        check(f'modifica intestazione in finestra senza sforamento a {w}px', sw <= w and over <= 0, f'scrollWidth {sw}, eccesso {over}')
        page.locator('form input').first.fill('ASD PROVA')
        page.click('form button:has-text("Annulla")')
        title_after_cancel = page.inner_text('header h1')
        page.click('button[aria-label="Modifica intestazione"]')
        page.locator('form input').first.fill('ASD PROVA')
        page.locator('form input').nth(1).fill('CASSA 2')
        page.click('form button:has-text("Salva")')
        check(f'intestazione: Annulla scarta, Salva applica ({w}px)',
              'PROVA' not in title_after_cancel and 'ASD PROVA' in page.inner_text('header h1')
              and page.evaluate('localStorage.getItem("cassa_registerName")') == 'CASSA 2')
        for k, v in seed.items():
            page.evaluate('([k, v]) => localStorage.setItem(k, v)', [k, v])
        page.reload()
        page.wait_for_timeout(300)
        nav(page, 'CREDITI')
        sw = page.evaluate('document.documentElement.scrollWidth')
        check(f'scheda Crediti senza sforamento a {w}px', sw <= w, f'scrollWidth {sw}')
        page.click('button:has-text("Incassa credito")')
        over = page.evaluate('''() => { const m = document.querySelector('.fixed > div');
                                        return m.scrollWidth - m.clientWidth; }''')
        visible = page.locator('button:has-text("CONFERMA INCASSO")').is_visible()
        check(f'finestra di incasso senza sforamento e CONFERMA visibile a {w}px', over <= 0 and visible, f'eccesso {over}px')
        page.locator('.fixed button:has-text("×")').click()
        open_closure(page)
        sw = page.evaluate('document.documentElement.scrollWidth')
        check(f'Chiusura cassa (fondo, configurazione) senza sforamento a {w}px', sw <= w, f'scrollWidth {sw}')
        page.context.close()

    browser.close()

print('\n' + ('TUTTI I TEST SUPERATI' if not failures else f'{len(failures)} TEST FALLITI: ' + ', '.join(failures)))
sys.exit(1 if failures else 0)
