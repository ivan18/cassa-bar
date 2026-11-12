import { createHash } from 'node:crypto';
import { digitaPin, expect, PIN, PIN_ERRATO, preparaStato, test } from './supporto';

test('Gestione: un solo PIN, si richiude cambiando sezione o con Blocca (D8)', async ({ app }) => {
  const { page } = app;
  await page.click('[data-testid=nav-gestione]');
  await expect(page.getByTestId('gestione-bloccata')).toBeVisible();
  await expect(page.getByTestId('accedi')).toBeDisabled(); // servono almeno 4 cifre
  await digitaPin(page, PIN_ERRATO);
  await expect(page.getByTestId('gestione-bloccata').getByRole('alert')).toHaveText('PIN errato. Riprova.');
  await digitaPin(page, PIN);
  await expect(page.getByTestId('gestione-menu')).toBeVisible();

  await page.click('[data-testid=nav-cassa]');
  await page.click('[data-testid=nav-gestione]');
  await expect(page.getByTestId('gestione-bloccata')).toBeVisible();

  await digitaPin(page, PIN);
  await page.click('[data-testid=blocca]');
  await expect(page.getByTestId('gestione-bloccata')).toBeVisible();
});

test('un PIN del dispositivo più lungo di 4 cifre prende il posto di quello della build', async ({ app }) => {
  const { page } = app;
  const salt = 'abc123';
  const nuovo = PIN === '482915' ? '615243' : '482915';
  await preparaStato(page, { pin: { salt, hash: createHash('sha256').update(salt + nuovo).digest('hex') } });
  await page.click('[data-testid=nav-gestione]');
  await digitaPin(page, PIN);
  await expect(page.getByTestId('gestione-bloccata').getByRole('alert')).toHaveText('PIN errato. Riprova.');
  await digitaPin(page, nuovo);
  await expect(page.getByTestId('gestione-menu')).toBeVisible();
});

test.describe('blocco automatico', () => {
  test.use({ orologioFinto: true });

  test('la Gestione si richiude dopo 2 minuti senza tocchi; ogni tocco riparte da zero', async ({ app }) => {
    const { page } = app;
    await page.click('[data-testid=nav-gestione]');
    await digitaPin(page, PIN);
    await expect(page.getByTestId('gestione-menu')).toBeVisible();

    await page.clock.fastForward('01:50');
    await expect(page.getByTestId('gestione-menu')).toBeVisible();
    await page.getByRole('heading', { name: 'Gestione' }).click(); // un tocco qualsiasi
    await page.clock.fastForward('01:50');
    await expect(page.getByTestId('gestione-menu')).toBeVisible();

    await page.clock.fastForward('00:20');
    await expect(page.getByTestId('gestione-bloccata')).toBeVisible();
    await expect(page.getByTestId('avviso')).toHaveText('Gestione bloccata dopo 2 minuti senza tocchi.');
  });
});
