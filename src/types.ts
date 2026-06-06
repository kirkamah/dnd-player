/**
 * Типы манифеста .dndsession — зеркало FORMAT.md v1.0 (источник правды
 * живёт в проекте dnd-recorder, копия спеки приложена в корне).
 */

export type PlayerSlot = 0 | 1 | 2 | 3 | 4 | 5;
export type Slot = PlayerSlot | 'master';

export interface ArtRefs {
  idle?: string;
  speaking?: string;
}

export interface ParticipantEntry {
  userId: string;
  displayName: string;
  characterId: string;
  characterName: string;
  slot: Slot | null;
  audioFile: string;
  art?: ArtRefs;
}

export interface SpeakingEvent {
  userId: string;
  startMs: number;
  endMs: number;
}

export interface SceneCue {
  tMs: number;
  bricksOpacity?: number;
  background?: string;
}

export interface Layers {
  background?: string;
  bricks?: string;
  frame?: string;
}

export interface Manifest {
  formatVersion: string;
  sessionId: string;
  recordedAt: string;
  durationMs: number;
  sampleRate: number;
  channels: number;
  master: ParticipantEntry | null;
  players: ParticipantEntry[];
  speakingEvents: SpeakingEvent[];
  layers: Layers;
  sceneCues: SceneCue[];
}
