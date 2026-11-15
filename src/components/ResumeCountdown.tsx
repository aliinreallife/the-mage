/** HUD-level countdown: mounted only while the simulation is fully frozen. */
export function ResumeCountdown({ label }: { label: string }) {
  return (
    <div role="status" aria-label="آماده‌سازی برای ادامهٔ بازی" aria-live="off" className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-[#050916]/25 backdrop-blur-[1px]">
      <div className="relative flex flex-col items-center text-center">
        <div aria-hidden="true" className="absolute inset-0 -m-12 rounded-full bg-firoozeh/10 blur-3xl" />
        <p className="relative mb-3 rounded-full border border-kaghaz/15 bg-night-950/70 px-4 py-1.5 text-xs tracking-wide text-kaghaz/75">آمادهٔ بازگشت به میدان</p>
        <div key={label} className="resume-countdown-digit relative grid h-32 w-32 place-items-center rounded-full border border-firoozeh/45 bg-night-950/80 shadow-[0_0_48px_rgba(63,217,200,0.16)] sm:h-40 sm:w-40">
          <div aria-hidden="true" className="absolute inset-2 rounded-full border border-firoozeh/15" />
          <span className="font-display text-7xl leading-none text-kaghaz drop-shadow-[0_0_28px_rgba(63,217,200,0.55)] sm:text-8xl">{label}</span>
        </div>
        <p className="relative mt-4 text-xs text-kaghaz/65">بازی متوقف است؛ با پایان شمارش حرکت آغاز می‌شود</p>
      </div>
    </div>
  );
}