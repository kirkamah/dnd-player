/**
 * SceneRenderer: чистый Canvas-рендер «состояние сцены на момент t -> кадр».
 * Никакой логики воспроизведения/редактирования — модуль переиспользуется
 * редактором и экспортом видео (Проект 3).
 *
 * Слои снизу вверх: background -> bricks -> frame -> портреты -> overlay (зарезервировано).
 */
import type { LoadedScene } from './bundle-loader';
import type { ParticipantEntry, PlayerSlot } from './types';
import type { SceneState } from './scene-state';

export const SCENE_W = 1920;
export const SCENE_H = 1080;

const ACCENT = '#2FA37C'; // подсветка говорящего

interface Box {
  x: number;
  y: number;
  w: number;
  h: number; // высота портрета (таблички с именем — ниже бокса)
  nameH: number;
}

/** Лейаут: мастер крупно в левом нижнем углу, игроки колонкой у правого края. */
export const LAYOUT: { master: Box; players: Box[] } = (() => {
  const master: Box = { x: 40, y: SCENE_H - 40 - 340 - 36, w: 340, h: 340, nameH: 36 };
  const players: Box[] = [];
  const w = 220;
  const h = 130;
  const nameH = 24;
  const gap = 12;
  const slotH = h + nameH;
  const total = 6 * slotH + 5 * gap;
  const y0 = (SCENE_H - total) / 2;
  for (let i = 0; i < 6; i++) {
    players.push({ x: SCENE_W - w - 28, y: y0 + i * (slotH + gap), w, h, nameH });
  }
  return { master, players };
})();

/**
 * Распределение участников по боксам: явные слоты — по своим местам,
 * участники без слота занимают свободные игровые слоты по порядку.
 */
export function placeParticipants(
  participants: ParticipantEntry[],
): Map<ParticipantEntry, Box> {
  const placed = new Map<ParticipantEntry, Box>();
  const freeSlots = new Set<PlayerSlot>([0, 1, 2, 3, 4, 5]);

  for (const p of participants) {
    if (p.slot === 'master') placed.set(p, LAYOUT.master);
    else if (p.slot !== null) {
      placed.set(p, LAYOUT.players[p.slot]);
      freeSlots.delete(p.slot);
    }
  }
  for (const p of participants) {
    if (placed.has(p)) continue;
    const slot = [...freeSlots].sort((a, b) => a - b)[0];
    if (slot === undefined) {
      console.warn(`[render] нет свободного слота для ${p.displayName}`);
      continue;
    }
    freeSlots.delete(slot);
    placed.set(p, LAYOUT.players[slot]);
  }
  return placed;
}

export class SceneRenderer {
  private placed: Map<ParticipantEntry, Box>;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private scene: LoadedScene,
  ) {
    this.placed = placeParticipants(scene.participants);
  }

  render(state: SceneState): void {
    const { ctx } = this;
    ctx.save();

    this.drawBackground(state);
    this.drawBricks(state);
    this.drawFrame();
    for (const [p, box] of this.placed) {
      this.drawPortrait(p, box, state.speaking.has(p.userId));
    }
    // overlay-слой зарезервирован под Проект 3 (свои картинки/титры)

    ctx.restore();
  }

  private drawBackground(state: SceneState): void {
    const { ctx } = this;
    const img = state.background ? this.scene.images.get(state.background) : undefined;
    if (img) {
      drawCover(ctx, img, 0, 0, SCENE_W, SCENE_H);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, SCENE_H);
      g.addColorStop(0, '#16191f');
      g.addColorStop(1, '#0b0d11');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, SCENE_W, SCENE_H);
    }
  }

  private drawBricks(state: SceneState): void {
    if (state.bricksOpacity <= 0) return;
    const img = this.scene.manifest.layers?.bricks
      ? this.scene.images.get(this.scene.manifest.layers.bricks)
      : undefined;
    if (!img) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.bricksOpacity);
    drawCover(ctx, img, 0, 0, SCENE_W, SCENE_H);
    ctx.restore();
  }

  private drawFrame(): void {
    const ref = this.scene.manifest.layers?.frame;
    const img = ref ? this.scene.images.get(ref) : undefined;
    if (img) this.ctx.drawImage(img, 0, 0, SCENE_W, SCENE_H);
  }

  private drawPortrait(p: ParticipantEntry, box: Box, speaking: boolean): void {
    const { ctx } = this;
    const artRef = speaking ? (p.art?.speaking ?? p.art?.idle) : p.art?.idle;
    const img = artRef ? this.scene.images.get(artRef) : undefined;
    const r = 14; // радиус скругления

    ctx.save();

    // свечение вокруг говорящего
    if (speaking) {
      ctx.shadowColor = ACCENT;
      ctx.shadowBlur = 28;
    }
    ctx.fillStyle = '#10141a';
    roundRect(ctx, box.x, box.y, box.w, box.h, r);
    ctx.fill();
    ctx.shadowBlur = 0;

    // портрет (cover) либо заглушка с первой буквой
    roundRect(ctx, box.x, box.y, box.w, box.h, r);
    ctx.clip();
    if (img) {
      drawCover(ctx, img, box.x, box.y, box.w, box.h);
      if (!speaking) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; // молчащие приглушены
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
    } else {
      ctx.fillStyle = speaking ? '#243b32' : '#1b222c';
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.fillStyle = speaking ? ACCENT : '#52616f';
      ctx.font = `bold ${Math.round(box.h * 0.45)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((p.characterName[0] ?? '?').toUpperCase(), box.x + box.w / 2, box.y + box.h / 2);
    }
    ctx.restore();

    // рамка-обводка
    ctx.save();
    ctx.strokeStyle = speaking ? ACCENT : '#39434f';
    ctx.lineWidth = speaking ? 4 : 2;
    roundRect(ctx, box.x, box.y, box.w, box.h, r);
    ctx.stroke();
    ctx.restore();

    // табличка с именем персонажа
    ctx.save();
    ctx.fillStyle = speaking ? ACCENT : '#cfd8e3';
    ctx.font = `600 ${Math.round(box.nameH * 0.62)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.characterName, box.x + box.w / 2, box.y + box.h + box.nameH / 2 + 2, box.w);
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** drawImage с заполнением области по принципу object-fit: cover. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
