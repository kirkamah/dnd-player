import { loadBundle, type LoadedScene } from './bundle-loader';
import { SceneRenderer, SCENE_W, SCENE_H } from './scene-renderer';
import { stateAt } from './scene-state';
import { MultiTrackPlayer } from './audio-player';
import { IS_TRIAL } from './trial';
import './style.css';

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`нет элемента ${sel}`);
  return el;
};

const dropZone = $('#drop-zone');
const dropError = $('#drop-error');
const playerView = $('#player');
const canvas = $('#scene') as unknown as HTMLCanvasElement;
const playBtn = $('#play-btn') as unknown as HTMLButtonElement;
const seekBar = $('#seek') as unknown as HTMLInputElement;
const timecode = $('#timecode');
const sessionInfo = $('#session-info');
const fileInput = $('#file-input') as unknown as HTMLInputElement;

canvas.width = SCENE_W;
canvas.height = SCENE_H;

// Контекст создаём один раз при старте: если 2D недоступен (GPU/драйвер),
// говорим об этом сразу и понятно, а не после выбора файла.
const ctx2d =
  canvas.getContext('2d') ?? canvas.getContext('2d', { willReadFrequently: true });
if (!ctx2d) {
  dropError.textContent =
    'Браузер не смог создать 2D-канвас (обычно это аппаратное ускорение/драйвер видеокарты).';
}

let scene: LoadedScene | null = null;
let renderer: SceneRenderer | null = null;
let player: MultiTrackPlayer | null = null;
let seeking = false;

// ---------- загрузка ----------

async function openFile(file: File): Promise<void> {
  dropError.textContent = '';
  dropZone.classList.add('loading');
  try {
    if (!ctx2d) throw new Error('Canvas 2D недоступен — см. сообщение выше');
    scene = await loadBundle(await file.arrayBuffer());
    renderer = new SceneRenderer(ctx2d, scene);
    player = new MultiTrackPlayer(scene.audio, scene.manifest.durationMs);
    player.onEnded = updatePlayButton;

    seekBar.max = String(scene.manifest.durationMs);
    seekBar.value = '0';
    const d = new Date(scene.manifest.recordedAt);
    sessionInfo.textContent =
      `${d.toLocaleDateString('ru-RU')} · ${scene.participants.length} участников · ` +
      `${scene.manifest.speakingEvents.length} реплик`;

    dropZone.classList.add('hidden');
    playerView.classList.remove('hidden');
    updatePlayButton();
  } catch (e) {
    console.error(e);
    dropError.textContent = `Не удалось открыть: ${(e as Error).message}`;
  } finally {
    dropZone.classList.remove('loading');
  }
}

fileInput.addEventListener('change', () => {
  const f = fileInput.files?.[0];
  if (f) void openFile(f);
});

for (const ev of ['dragover', 'dragenter'] as const) {
  document.addEventListener(ev, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag');
  });
}
document.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) dropZone.classList.remove('drag');
});
document.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag');
  const f = e.dataTransfer?.files?.[0];
  if (f) void openFile(f);
});

// ---------- контролы ----------

function updatePlayButton(): void {
  playBtn.textContent = player?.playing ? '⏸' : '▶';
}

playBtn.addEventListener('click', () => {
  if (!player) return;
  if (player.playing) player.pause();
  else void player.play();
  updatePlayButton();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && player) {
    e.preventDefault();
    playBtn.click();
  }
});

seekBar.addEventListener('input', () => {
  seeking = true;
  if (player) renderFrame(Number(seekBar.value)); // мгновенный превью-кадр при перемотке
});
seekBar.addEventListener('change', () => {
  if (player) player.seek(Number(seekBar.value));
  seeking = false;
});

// ---------- цикл рендера ----------

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function renderFrame(tMs: number): void {
  if (!scene || !renderer) return;
  renderer.render(stateAt(scene.manifest, tMs));
  timecode.textContent = `${fmt(tMs)} / ${fmt(scene.manifest.durationMs)}`;
}

function loop(): void {
  if (scene && renderer && player) {
    player.tick();
    const t = seeking ? Number(seekBar.value) : player.timeMs;
    if (!seeking) seekBar.value = String(t);
    renderFrame(t);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- пробная версия ----------
// Плеер не ограничен по функциям — только пометка и ссылка на полный набор.
if (IS_TRIAL) {
  document.title = 'DnD Player Trial — плеер .dndsession';
  const note = document.createElement('div');
  note.id = 'trial-note';
  note.innerHTML =
    'Пробная версия · полный набор приложений no harm org — ' +
    '<a href="https://boosty.to/no.harm.org" target="_blank" rel="noopener">Boosty</a>';
  document.body.append(note);
}
