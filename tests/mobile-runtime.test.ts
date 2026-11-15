import { describe, expect, it } from 'vitest';
import { canvasPixelRatio, MobileRenderGovernor } from '../src/game/mobileRuntime';
import { recordRuntimeError, readRuntimeError } from '../src/game/diagnostics';

describe('Android WebView safety defaults', () => {
  it('caps physical canvas allocation, leaving logical viewport and game input intact', () => {
    expect(canvasPixelRatio(3, 412, 915, true)).toBeLessThanOrEqual(1.5);
    expect(canvasPixelRatio(3, 1440, 3200, true) ** 2 * 1440 * 3200).toBeLessThanOrEqual(1_100_000.1);
    expect(canvasPixelRatio(3, 412, 915, false)).toBe(2);
    expect(canvasPixelRatio(NaN, 300, 400, true)).toBe(1);
  });
  it('reduces paint frequency only following sustained expensive frames', () => {
    const g = new MobileRenderGovernor(true);
    expect(g.reduced).toBe(false);
    for (let i = 0; i < 11; i++) g.observeRenderMs(27);
    expect(g.reduced).toBe(false);
    g.observeRenderMs(27);
    expect(g.reduced).toBe(true);
    expect(g.minPaintIntervalMs).toBeCloseTo(1000 / 30);
  });
  it('does not affect desktop drawing frequency', () => {
    const g = new MobileRenderGovernor(false);
    for (let i=0;i<100;i++) g.observeRenderMs(100);
    expect(g.reduced).toBe(false);
    expect(g.minPaintIntervalMs).toBe(0);
  });
  it('handles unavailable local storage without throwing', () => {
    expect(() => recordRuntimeError('test', new Error('sample'))).not.toThrow();
    expect(readRuntimeError() === null || typeof readRuntimeError() === 'string').toBe(true);
  });
});
