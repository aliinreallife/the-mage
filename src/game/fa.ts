const DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Convert latin digits in a number/string to Persian digits. */
export function fa(value: number | string): string {
  return String(value).replace(/\d/g, (d) => DIGITS[Number(d)]);
}

/** mm:ss with Persian digits. */
export function faTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return fa(`${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`);
}
