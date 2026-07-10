// Pricing displayed to users. CFA prices are shown but charged via NGN equivalent
// (Paystack does not settle CFA directly for our regions).
export type DisplayCurrency = "NGN" | "CFA" | "KES";
export type ChargeCurrency = "NGN" | "KES";

export type PlanId = "free" | "standard" | "pro";
export type PackId = "assessment_pack_5" | "assessment_pack_10" | "assessment_pack_30";
export type SubPurpose = "sub_standard" | "sub_pro";

interface PriceRow {
  display: string;
  chargeCurrency: ChargeCurrency;
  chargeMinor: number;
}

/** Monthly subscription prices */
export const STANDARD_PRICES: Record<DisplayCurrency, PriceRow> = {
  NGN: { display: "₦2,000/month", chargeCurrency: "NGN", chargeMinor: 200000 },
  CFA: { display: "2,000 CFA/month", chargeCurrency: "NGN", chargeMinor: 200000 },
  KES: { display: "KSh 180/month", chargeCurrency: "KES", chargeMinor: 18000 },
};

export const PRO_PRICES: Record<DisplayCurrency, PriceRow> = {
  NGN: { display: "₦5,000/month", chargeCurrency: "NGN", chargeMinor: 500000 },
  CFA: { display: "5,000 CFA/month", chargeCurrency: "NGN", chargeMinor: 500000 },
  KES: { display: "KSh 450/month", chargeCurrency: "KES", chargeMinor: 45000 },
};

/** Upload packs — Standard-only add-on, uploads never expire */
export const PACK_PRICES: Record<PackId, Record<DisplayCurrency, PriceRow>> = {
  assessment_pack_5: {
    NGN: { display: "₦500", chargeCurrency: "NGN", chargeMinor: 50000 },
    CFA: { display: "500 CFA", chargeCurrency: "NGN", chargeMinor: 50000 },
    KES: { display: "KSh 45", chargeCurrency: "KES", chargeMinor: 4500 },
  },
  assessment_pack_10: {
    NGN: { display: "₦1,000", chargeCurrency: "NGN", chargeMinor: 100000 },
    CFA: { display: "1,000 CFA", chargeCurrency: "NGN", chargeMinor: 100000 },
    KES: { display: "KSh 90", chargeCurrency: "KES", chargeMinor: 9000 },
  },
  assessment_pack_30: {
    NGN: { display: "₦2,000", chargeCurrency: "NGN", chargeMinor: 200000 },
    CFA: { display: "2,000 CFA", chargeCurrency: "NGN", chargeMinor: 200000 },
    KES: { display: "KSh 180", chargeCurrency: "KES", chargeMinor: 18000 },
  },
};

export const PACK_UPLOADS: Record<PackId, number> = {
  assessment_pack_5: 5,
  assessment_pack_10: 10,
  assessment_pack_30: 30,
};

/** Legacy price maps kept so PaywallModal (per-file unlocks) still compiles.
 *  Free plan no longer allows per-file downloads; these entries exist only
 *  to satisfy old paywall paths that fall back to the Standard subscription. */
export const UNLOCK_PRICES: Record<DisplayCurrency, PriceRow> = STANDARD_PRICES;

export function detectCurrency(country?: string | null): DisplayCurrency {
  if (country === "KE") return "KES";
  if (country === "GH") return "CFA";
  return "NGN";
}

export function formatMinor(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  const sym = currency === "NGN" ? "₦" : currency === "KES" ? "KSh " : "";
  return `${sym}${major.toLocaleString()}`;
}
