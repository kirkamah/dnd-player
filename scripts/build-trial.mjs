/**
 * Сборка ПРОБНОЙ версии DnD Player.
 * Плеер не ограничен по функциям — это просто отдельная trial-сборка
 * (свой appId/productName, ставится рядом с полной) с пометкой и ссылкой на
 * Boosty. Выход: release-trial/DnD-Player-Trial-<version>.exe
 *
 * Запуск:  npm run dist:trial
 * NB: закрой запущенный DnD Player перед сборкой.
 */
import { spawnSync } from 'node:child_process';

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DND_TRIAL: '1' },
  });
  if (r.status !== 0) {
    console.error(`\nШаг упал: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

console.log('— Сборка пробной версии DnD Player (DND_TRIAL=1) —');
run('npm', ['run', 'build']);
run('npx', ['electron-builder', '--win', '--config', 'electron-builder.trial.json']);
console.log('\nГотово: release-trial/');
