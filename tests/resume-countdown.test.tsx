import { describe, expect, it } from "vitest";
import { RESUME_COUNTDOWN_MS, resumeCountdownFrame } from "../src/game/resumeCountdown";
import { renderToString } from "react-dom/server";
import { ResumeCountdown } from "../src/components/ResumeCountdown";

const end = 9000;
describe("frozen unpause countdown", () => {
  it("lasts the full three seconds and changes labels at one-second boundaries", () => {
    expect(RESUME_COUNTDOWN_MS).toBe(3000);
    expect(resumeCountdownFrame(end, 6000)).toEqual({ done: false, label: "۳" });
    expect(resumeCountdownFrame(end, 7000)).toEqual({ done: false, label: "۲" });
    expect(resumeCountdownFrame(end, 8000)).toEqual({ done: false, label: "۱" });
    expect(resumeCountdownFrame(end, 8860)).toEqual({ done: false, label: "شروع" });
    expect(resumeCountdownFrame(end, 8999).done).toBe(false);
    expect(resumeCountdownFrame(end, 9000)).toEqual({ done: true, label: "" });
  });
  it("keeps the battlefield unobstructed while pointer input is intercepted", () => {
    const html = renderToString(<ResumeCountdown label="۳" />);
    expect(html).toContain("pointer-events-auto");
    expect(html).toContain("۳");
    expect(html).toContain("آمادهٔ بازگشت");
  });
});