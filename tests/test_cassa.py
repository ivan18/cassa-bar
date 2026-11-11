"""Test end-to-end della cassa (Chrome headless, rete esterna bloccata).

Uso:
    python3 tests/test_cassa.py dist/cassa_smart_bar_pub.html [PIN]

Verifica: nessuna richiesta esterna, nessun errore JS, incasso completo,
PIN errato rifiutato e PIN corretto accettato, nessun suggerimento del PIN
a schermo, nessuno sforamento orizzontale a 375 / 768 / 1024 px.
"""
import os
import sys
from playwright.sync_api import sync_playwright

FILE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/cassa_smart_bar_pub.html')
PIN = sys.argv[2] if len(sys.argv) > 2 else os.environ.get('CASSA_PIN', '1234')
WRONG = '0' * len(PIN) if PIN != '0' * len(PIN) else '9' * len(PIN)
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
URL = 'file://' + FILE

failures = []

def check(name, ok, detail=''):
    print(('OK   ' if ok else 'FAIL ') + name + (f' ({detail})' if detail else ''))
    if not ok:
        failures.append(name)

def open_page(browser, w, h):
    page = browser.new_page(viewport={'width': w, 'height': h})
    external, errors = [], []
    def route(r):
        if r.request.url.startswith(('file:', 'data:', 'blob:')):
            r.continue_()
        else:
            external.append(r.request.url)
            r.abort()
    page.route('**/*', route)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    page.goto(URL)
    page.wait_for_timeout(500)
    return page, external, errors

def enter_pin(page, code):
    """Apre PRODOTTI, digita il PIN e restituisce (entrato, testo della finestra PIN)."""
    page.click('button:has-text("PRODOTTI")')
    modal_text = page.inner_text('text=Area Protetta >> xpath=../..')
    for d in code:
        page.click(f'button:text-is("{d}")')
    page.click('text=Accedi')
    page.wait_for_timeout(200)
    entered = page.locator('text=Gestione Listino Prodotti').count() > 0
    if not entered:
        modal_text += '\n' + page.inner_text('text=Area Protetta >> xpath=../..')
    if page.locator('text=Annulla').count():
        page.click('text=Annulla')
    return entered, modal_text

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME)

    page, external, errors = open_page(browser, 1280, 900)
    page.click('button:has-text("DREHER 66 cl")')
    page.click('button:has-text("COCA COLA")')
    total = page.inner_text('text=Totale Comanda >> xpath=..')
    check('totale comanda 3.50', '3.50' in total, total.replace('\n', ' '))
    page.click('button:has-text("INCASSA"):visible >> nth=-1')
    page.click('text=ESATTO')
    page.click('button:has-text("CONFERMA INCASSO")')
    page.click('button:has-text("STORICO")')
    page.wait_for_timeout(200)
    check('vendita registrata nello storico', '3.50' in page.inner_text('main'))

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
    check('nessuna richiesta esterna', not external, ', '.join(external[:3]))
    check('nessun errore JavaScript', not errors, '; '.join(errors[:3]))
    page.close()

    for w, h in [(375, 812), (768, 1024), (1024, 768)]:
        page, _, _ = open_page(browser, w, h)
        sw = page.evaluate('document.documentElement.scrollWidth')
        check(f'nessuno sforamento a {w}px', sw <= w, f'scrollWidth {sw}')
        page.close()

    browser.close()

print('\n' + ('TUTTI I TEST SUPERATI' if not failures else f'{len(failures)} TEST FALLITI: ' + ', '.join(failures)))
sys.exit(1 if failures else 0)
