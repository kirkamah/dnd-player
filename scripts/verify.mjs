/**
 * Автопроверка плеера в реальном Chromium: открывает собранный плеер,
 * загружает .dndsession, мотает на момент речи, проверяет воспроизведение
 * и снимает скриншоты в .verify/.
 * Запуск: node scripts/verify.mjs [путь к .dndsession]
 * (нужен запущенный `vite preview` на 4173 — скрипт поднимет его сам)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const bundle =
  process.argv[2] ??
  'C:/projects/dnd-recorder/recordings/session-2026-06-06T15-08-38.dndsession';
if (!fs.existsSync(bundle)) {
  console.error('Бандл не найден:', bundle);
  process.exit(2);
}
fs.mkdirSync('.verify', { recursive: true });

// vite preview
const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4173', '--strictPort'], {
  stdio: 'pipe',
  shell: true,
});
await new Promise((resolve, reject) => {
  preview.stdout.on('data', (d) => d.toString().includes('4173') && resolve());
  preview.on('exit', () => reject(new Error('vite preview не стартовал')));
  setTimeout(() => reject(new Error('vite preview: таймаут')), 15000);
});

const failures = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  page.on('console', (m) => m.type() === 'error' && failures.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));

  await page.goto('http://localhost:4173/');
  await page.setInputFiles('#file-input', bundle);
  await page.waitForSelector('#player:not(.hidden)', { timeout: 20000 });
  console.log('✓ бандл загрузился, плеер открылся');
  console.log('  инфо:', await page.textContent('#session-info'));

  // кадр на t=0 (никто не говорит)
  await page.screenshot({ path: '.verify/t0.png' });

  // перемотка на 9.0 c — внутри speakingEvent 8.38–10.04 (мастер говорит)
  await page.locator('#seek').evaluate((el) => {
    el.value = '9000';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '.verify/t9-speaking.png' });
  console.log('✓ кадр на 9.0 с снят (мастер должен подсвечиваться и быть в speaking-арте)');

  // воспроизведение: таймкод должен двигаться
  await page.click('#play-btn');
  await page.waitForTimeout(1700);
  const tc = await page.textContent('#timecode');
  await page.click('#play-btn'); // пауза
  const sec = Number(tc.split(':')[1].split(' ')[0]);
  if (sec >= 10 && sec <= 12) console.log(`✓ воспроизведение идёт (таймкод ${tc.trim()})`);
  else failures.push(`таймкод после play выглядит неверно: "${tc}"`);

  // конец записи: перемотка за длительность останавливается корректно
  await page.locator('#seek').evaluate((el) => {
    el.value = el.max;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  console.log('✓ перемотка в конец не падает');
} finally {
  await browser.close();
  preview.kill();
}

if (failures.length) {
  for (const f of failures) console.error('✗', f);
  process.exit(1);
}
console.log('VERIFY OK — скриншоты в .verify/');
process.exit(0);
