/**
 * MultiTrackPlayer: синхронное воспроизведение всех дорожек через Web Audio.
 * Один таймлайн, один плейхед; дорожки sample-aligned по гарантии FORMAT.md,
 * поэтому достаточно стартовать все источники в один момент AudioContext.
 */
export class MultiTrackPlayer {
  private ctx = new AudioContext({ sampleRate: 48000 });
  private buffers: AudioBuffer[] = [];
  private sources: AudioBufferSourceNode[] = [];
  private startCtxTime = 0;
  private offsetMs = 0;
  private _playing = false;

  readonly durationMs: number;
  /** вызывается, когда плейхед дошёл до конца */
  onEnded: (() => void) | null = null;

  constructor(audio: Map<string, Float32Array<ArrayBuffer>>, durationMs: number) {
    this.durationMs = durationMs;
    for (const samples of audio.values()) {
      const buf = this.ctx.createBuffer(1, samples.length, 48000);
      buf.copyToChannel(samples, 0);
      this.buffers.push(buf);
    }
  }

  get playing(): boolean {
    return this._playing;
  }

  get timeMs(): number {
    if (!this._playing) return this.offsetMs;
    return Math.min(
      this.durationMs,
      this.offsetMs + (this.ctx.currentTime - this.startCtxTime) * 1000,
    );
  }

  async play(): Promise<void> {
    if (this._playing) return;
    if (this.offsetMs >= this.durationMs) this.offsetMs = 0; // replay с конца
    await this.ctx.resume();
    this.startSources();
    this._playing = true;
  }

  pause(): void {
    if (!this._playing) return;
    this.offsetMs = this.timeMs;
    this._playing = false;
    this.stopSources();
  }

  seek(ms: number): void {
    const clamped = Math.max(0, Math.min(this.durationMs, ms));
    if (this._playing) {
      this.stopSources();
      this.offsetMs = clamped;
      this.startSources();
    } else {
      this.offsetMs = clamped;
    }
  }

  /** Дёргать из rAF-цикла: останавливает воспроизведение на конце записи. */
  tick(): void {
    if (this._playing && this.timeMs >= this.durationMs) {
      this.offsetMs = this.durationMs;
      this._playing = false;
      this.stopSources();
      this.onEnded?.();
    }
  }

  private startSources(): void {
    const when = this.ctx.currentTime + 0.05; // общий старт чуть в будущем — синхронно
    const offsetSec = this.offsetMs / 1000;
    this.startCtxTime = when;
    this.sources = this.buffers.map((buf) => {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(when, offsetSec);
      return src;
    });
  }

  private stopSources(): void {
    for (const s of this.sources) {
      try {
        s.stop();
        s.disconnect();
      } catch {
        /* уже остановлен */
      }
    }
    this.sources = [];
  }
}
