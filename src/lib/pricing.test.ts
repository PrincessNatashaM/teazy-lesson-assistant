import { describe, it, expect } from "vitest";
import { STANDARD_PRICES, PRO_PRICES, VIDEO_PACK_PRICES, FREE_MONTHLY, PAID_MONTHLY_VIDEO_LIMIT } from "./pricing";

describe("plan pricing and allowances", () => {
  it("Teazy AI Pro is ₦3,000 / GH₵30 / KSh300", () => {
    expect(STANDARD_PRICES.NGN.chargeMinor).toBe(300000);
    expect(STANDARD_PRICES.GHS.chargeMinor).toBe(3000);
    expect(STANDARD_PRICES.KES.chargeMinor).toBe(30000);
  });
  it("Assessment Pro stays ₦8,000", () => {
    expect(PRO_PRICES.NGN.chargeMinor).toBe(800000);
  });
  it("free gets 2 worksheets, 2 slide decks, 1 video a month", () => {
    expect(FREE_MONTHLY.worksheet).toBe(2);
    expect(FREE_MONTHLY.slides).toBe(2);
    expect(FREE_MONTHLY.video).toBe(1);
  });
  it("paid video is capped at 20 a month, extra video costs ₦500", () => {
    expect(PAID_MONTHLY_VIDEO_LIMIT).toBe(20);
    expect(VIDEO_PACK_PRICES.NGN.chargeMinor).toBe(50000);
  });
});
