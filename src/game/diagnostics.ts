/** Small local-only JavaScript diagnostics. Does not transmit user data.
 * Native renderer/process death cannot be caught in JavaScript; use ADB logcat.
 */
const KEY = 'afsungar.runtimeError.v1';
const MAX = 1700;
function describe(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}\n${err.stack ?? ''}`;
  try { return String(err); } catch { return 'Unknown error'; }
}
export function recordRuntimeError(scope: string, error: unknown) {
  const report = {
    date: new Date().toISOString(),
    scope,
    message: describe(error).slice(0, MAX),
    ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 260) : '',
  };
  try { localStorage.setItem(KEY, JSON.stringify(report)); } catch { /* storage unavailable */ }
}
export function readRuntimeError(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function installRuntimeErrorListeners() {
  if (typeof window === 'undefined') return () => {};
  const error = (e: ErrorEvent) => recordRuntimeError('window.error', e.error ?? e.message);
  const rejection = (e: PromiseRejectionEvent) => recordRuntimeError('promise.rejection', e.reason);
  window.addEventListener('error', error);
  window.addEventListener('unhandledrejection', rejection);
  return () => {
    window.removeEventListener('error', error);
    window.removeEventListener('unhandledrejection', rejection);
  };
}
