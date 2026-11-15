/** Three full wall-clock seconds of frozen gameplay after leaving Pause. */
export const RESUME_COUNTDOWN_MS = 3000;

/** A pure timing function: the game advances only after `done` becomes true. */
export function resumeCountdownFrame(deadline: number, now: number): { done: boolean; label: string } {
  const left = Math.max(0, deadline - now);
  if (left <= 0) return { done: true, label: "" };
  // Brief start cue at the very end; still frozen for the full 3 seconds.
  if (left <= 160) return { done: false, label: "شروع" };
  return { done: false, label: String(Math.ceil(left / 1000)).replace(/[0-9]/g, (n) => "۰۱۲۳۴۵۶۷۸۹"[Number(n)]) };
}
/** Aim is allowed during countdown; simulation is still not advanced.
 * Holding joystick or keyboard input is preserved at the exact resume boundary. */
export function canArmMovement(phase: string): boolean {
  return phase === "playing" || phase === "countdown";
}
