import { describe, expect, it } from "vitest";
import { RESUME_COUNTDOWN_MS, resumeCountdownFrame, canArmMovement } from "../src/game/resumeCountdown";
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
  it("arms input only in playing or the frozen countdown, not menus or pause", () => {
    expect(canArmMovement("countdown")).toBe(true);
    expect(canArmMovement("playing")).toBe(true);
    for (const phase of ["paused", "menu", "levelup", "relic", "boon", "over"]) expect(canArmMovement(phase)).toBe(false);
  });
  it("lets the player preselect a direction without blocking the frozen battlefield", () => {
    const html = renderToString(<ResumeCountdown label="۳" />);
    expect(html).toContain("pointer-events-none");
    expect(html).not.toContain("rounded-full border border-firoozeh");
    expect(html).toContain("انگشتت را بکش و نگه دار");
    expect(html).toContain("۳");
    expect(html).toContain("آمادهٔ بازگشت");
  });
});