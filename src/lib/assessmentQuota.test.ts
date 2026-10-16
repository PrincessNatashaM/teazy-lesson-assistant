import { describe, it, expect } from "vitest";
import { quotaSummary, ASSESSMENT_PRO_LIMIT } from "./assessmentQuota";

describe("Assessment Pro allowance", () => {
  it("is 1000 scripts per month", () => {
    expect(ASSESSMENT_PRO_LIMIT).toBe(1000);
  });
  it("47 used leaves 953 remaining", () => {
    const q = quotaSummary(47, 1000);
    expect(q.remaining).toBe(953);
    expect(q.reached).toBe(false);
  });
  it("blocks at 1000 used", () => {
    expect(quotaSummary(1000, 1000).reached).toBe(true);
    expect(quotaSummary(1000, 1000).remaining).toBe(0);
  });
});
