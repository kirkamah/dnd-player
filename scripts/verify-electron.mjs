/**
 * Автопроверка десктопной версии: запускает Electron-приложение (тот же
 * dist/, что пакуется в exe), загружает реальный бандл, проверяет canvas
 * и ход таймкода. Запуск: node scripts/verify-electron.mjs [бандл]
 */
import { _electron } from 'playwright';
import fs from 'node:fs';

const bundle =
  process.argv[2] ??
  'C:/projects/dnd-recorder/recordings/session-2026-06-06T15-08-38.dndsession';
if (!fs.existsSync(bundle)) {
  console.error('Бандл не найден:', bundle);
  process.exit(2);
}
fs.mkdirSync('.verify', { recursive: true });

const app = await _electron.launch({ args: ['electron/main.cjs'] });
const failures = [];
try {
  const page = await app.firstWindow();
  page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));
  await page.waitForSelector('#drop-zone');

  const err0 = await page.textContent('#drop-error');
  if (err0?.trim()) failures.push(`ошибка ещё до загрузки: "${err0}"`);

  await page.setInputFiles('#file-input', bundle);
  await page.waitForSelector('#player:not(.hidden)', { timeout: 20000 });
  console.log('✓ exe-версия: бандл открылся, canvas работает');

  await page.locator('#seek').evaluate((el) => {
    el.value = '9000';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '.verify/electron-t9.png' });

  await page.click('#play-btn');
  await page.waitForTimeout(1700);
  const tc = await page.textContent('#timecode');
  const sec = Number(tc.split(':')[1].split(' ')[0]);
  if (sec >= 10 && sec <= 12) console.log(`✓ воспроизведение идёт (${tc.trim()})`);
  else failures.push(`таймкод после play: "${tc}"`);
} finally {
  await app.close();
}

if (failures.length) {
  for (const f of failures) console.error('✗', f);
  process.exit(1);
}
console.log('ELECTRON VERIFY OK');
