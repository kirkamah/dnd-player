/**
 * bundle-loader: .dndsession (zip) -> объект сцены.
 * Чистый модуль без логики воспроизведения и рендера — переиспользуется
 * редактором (Проект 3) как есть.
 */
import { unzipSync } from 'fflate';
import type { Manifest, ParticipantEntry } from './types';

export interface LoadedScene {
  manifest: Manifest;
  /** master (если есть) + players, в порядке отрисовки */
  participants: ParticipantEntry[];
  /** userId -> моно-сэмплы float32 [-1..1], 48 кГц */
  audio: Map<string, Float32Array<ArrayBuffer>>;
  /** путь внутри zip -> готовая картинка (арты, слои, фоны cues) */
  images: Map<string, ImageBitmap>;
}

export async function loadBundle(data: ArrayBuffer): Promise<LoadedScene> {
  const files = unzipSync(new Uint8Array(data));

  const manifestRaw = files['manifest.json'];
  if (!manifestRaw) throw new Error('В архиве нет manifest.json — это не .dndsession');
  const manifest = JSON.parse(new TextDecoder().decode(manifestRaw)) as Manifest;

  const major = manifest.formatVersion?.split('.')[0];
  if (major !== '1') {
    throw new Error(`Неподдерживаемая версия формата: ${manifest.formatVersion} (ожидается 1.x)`);
  }
  if (manifest.sampleRate !== 48000 || manifest.channels !== 1) {
    throw new Error(
      `Ожидается mono 48kHz, в манифесте ${manifest.channels}ch ${manifest.sampleRate}Hz`,
    );
  }

  const participants: ParticipantEntry[] = [
    ...(manifest.master ? [manifest.master] : []),
    ...manifest.players,
  ];

  // --- аудио ---
  const audio = new Map<string, Float32Array<ArrayBuffer>>();
  for (const p of participants) {
    const wav = files[p.audioFile];
    if (!wav) throw new Error(`Нет дорожки ${p.audioFile}`);
    audio.set(p.userId, decodeCanonicalWav(wav));
  }

  // --- картинки: арты участников + слои + фоны из cues ---
  const imagePaths = new Set<string>();
  for (const p of participants) {
    if (p.art?.idle) imagePaths.add(p.art.idle);
    if (p.art?.speaking) imagePaths.add(p.art.speaking);
  }
  for (const ref of Object.values(manifest.layers ?? {})) if (ref) imagePaths.add(ref);
  for (const cue of manifest.sceneCues ?? []) if (cue.background) imagePaths.add(cue.background);

  const images = new Map<string, ImageBitmap>();
  await Promise.all(
    [...imagePaths].map(async (path) => {
      const raw = files[path];
      if (!raw) {
        console.warn(`[bundle] манифест ссылается на ${path}, но файла нет в архиве`);
        return;
      }
      images.set(path, await createImageBitmap(new Blob([raw.slice().buffer])));
    }),
  );

  return { manifest, participants, audio, images };
}

/** PCM s16le mono из канонического 44-байтного WAV (гарантия FORMAT.md). */
function decodeCanonicalWav(wav: Uint8Array): Float32Array<ArrayBuffer> {
  const ascii = (off: number, len: number) =>
    String.fromCharCode(...wav.subarray(off, off + len));
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WAVE' || ascii(36, 4) !== 'data') {
    throw new Error('WAV не в каноническом виде из FORMAT.md');
  }
  // slice() выравнивает данные в собственном буфере с byteOffset 0
  const pcmBytes = wav.slice(44);
  const pcm = new Int16Array(pcmBytes.buffer, 0, Math.floor(pcmBytes.length / 2));
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 32768;
  return out;
}
