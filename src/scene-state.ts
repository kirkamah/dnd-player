/**
 * scene-state: чистая функция «манифест + время t -> состояние сцены».
 * Ни рендера, ни звука — переиспользуется редактором и экспортом (Проект 3).
 */
import type { Manifest } from './types';

export interface SceneState {
  tMs: number;
  /** userId участников, говорящих в момент t */
  speaking: ReadonlySet<string>;
  bricksOpacity: number;
  /** путь к фону внутри zip (учитывая смены через sceneCues) */
  background?: string;
}

export function stateAt(manifest: Manifest, tMs: number): SceneState {
  const speaking = new Set<string>();
  for (const ev of manifest.speakingEvents) {
    if (ev.startMs > tMs) break; // отсортированы по startMs
    if (tMs < ev.endMs) speaking.add(ev.userId);
  }

  // Cues — ступенчатые ключи: действует последнее значение с cue.tMs <= t.
  let bricksOpacity = 1.0;
  let background = manifest.layers?.background;
  for (const cue of manifest.sceneCues ?? []) {
    if (cue.tMs > tMs) break;
    if (cue.bricksOpacity !== undefined) bricksOpacity = cue.bricksOpacity;
    if (cue.background !== undefined) background = cue.background;
  }

  return { tMs, speaking, bricksOpacity, background };
}
