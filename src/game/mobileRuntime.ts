/** Android WebView allocates a large GPU backing store for each Canvas 2D surface.
 * Limit the backing pixels independently of the CSS viewport; the game world and
 * hitboxes remain at their original logical resolution.
 * These limits are protective defaults, NOT a diagnosis of any particular crash.
 */
export function canvasPixelRatio(deviceRatio: number, width: number, height: number, android: boolean): number {
  const ratio = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  if (!android) return Math.min(ratio, 2);
  const base = Math.min(ratio, 1.5);
  // Keep one portrait mobile backing canvas under ~1.1 million physical pixels.
  const budget = Math.sqrt(1_100_000 / Math.max(1, width * height));
  return Math.min(base, Math.max(0.25, budget));
}

/** Render at 60 FPS normally, dropping to 30 FPS only after repeated slow frames.
 * Simulation continues at its own fixed timestep regardless of painting frequency.
 */
export class MobileRenderGovernor {
  private slowScore = 0;
  reduced = false;
  constructor(readonly android: boolean) {}
  get minPaintIntervalMs() { return this.android ? 1000 / (this.reduced ? 30 : 60) : 0; }
  observeRenderMs(ms: number) {
    if (!this.android || !Number.isFinite(ms)) return;
    this.slowScore = Math.max(0, Math.min(48, this.slowScore + (ms > 22 ? 3 : -1)));
    if (this.slowScore >= 36) this.reduced = true;
  }
}
