/** Mounted only while the entire gameplay simulation is frozen.
 * Keep pointer events transparent so the joystick can be armed underneath. */
export function ResumeCountdown({ label }: { label: string }) {
  return (
    <div role="status" aria-label="آماده‌سازی برای ادامهٔ بازی" aria-live="off"
      className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#040713]/30">
      <div className="resume-countdown-content flex flex-col items-center text-center" style={{ transform: "translateY(-14vh)" }}>
        <p className="mb-1 rounded-full bg-night-950/60 px-4 py-1 text-xs font-bold text-kaghaz/75">بازگشت به میدان</p>
        <span key={label} className="resume-countdown-digit font-display text-[clamp(7rem,30vw,11rem)] leading-none text-kaghaz"
          aria-label={label} style={{ textShadow: "0 5px 8px rgba(0,0,0,.75), 0 0 45px rgba(63,217,200,.48)" }}>{label}</span>
        <span className="mt-1 h-[2px] w-20 rounded-full bg-firoozeh/70" aria-hidden="true" />
        <p className="mt-4 max-w-[78vw] rounded-xl bg-night-950/70 px-3 py-2 font-medium leading-6 text-kaghaz/90">
          انگشتت را بکش و نگه دار؛ با پایان شمارش در همان جهت حرکت می‌کنی
        </p>
        <p className="mt-1 text-[11px] text-firoozeh/85">دشمن‌ها، تیرها و برخوردها هنوز متوقف‌اند</p>
      </div>
    </div>
  );
}
