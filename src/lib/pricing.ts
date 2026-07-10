// Pricing displayed to users. Paystack supports NGN, GHS and KES natively so
// each display currency now maps to a matching charge currency (no proxying).
export type DisplayCurrency = "NGN" | "GHS" | "KES";
export type ChargeCurrency = "NGN" | "GHS" | "KES";

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
  GHS: { display: "GH₵ 40/month",  chargeCurrency: "GHS", chargeMinor: 4000 },
  KES: { display: "KSh 200/month", chargeCurrency: "KES", chargeMinor: 20000 },
};

export const PRO_PRICES: Record<DisplayCurrency, PriceRow> = {
  NGN: { display: "₦5,000/month", chargeCurrency: "NGN", chargeMinor: 500000 },
  GHS: { display: "GH₵ 100/month",  chargeCurrency: "GHS", chargeMinor: 10000 },
  KES: { display: "KSh 500/month", chargeCurrency: "KES", chargeMinor: 50000 },
};

/** Upload packs — Standard-only add-on, uploads never expire */
export const PACK_PRICES: Record<PackId, Record<DisplayCurrency, PriceRow>> = {
  assessment_pack_5: {
    NGN: { display: "₦500",    chargeCurrency: "NGN", chargeMinor: 50000 },
    GHS: { display: "GH₵ 5",   chargeCurrency: "GHS", chargeMinor: 500 },
    KES: { display: "KSh 45",  chargeCurrency: "KES", chargeMinor: 4500 },
  },
  assessment_pack_10: {
    NGN: { display: "₦1,000",  chargeCurrency: "NGN", chargeMinor: 100000 },
    GHS: { display: "GH₵ 10",  chargeCurrency: "GHS", chargeMinor: 1000 },
    KES: { display: "KSh 90",  chargeCurrency: "KES", chargeMinor: 9000 },
  },
  assessment_pack_30: {
    NGN: { display: "₦2,000",  chargeCurrency: "NGN", chargeMinor: 200000 },
    GHS: { display: "GH₵ 20",  chargeCurrency: "GHS", chargeMinor: 2000 },
    KES: { display: "KSh 180", chargeCurrency: "KES", chargeMinor: 18000 },
  },
};

export const PACK_UPLOADS: Record<PackId, number> = {
  assessment_pack_5: 5,
  assessment_pack_10: 10,
  assessment_pack_30: 30,
};

/** Legacy alias kept so old paywall paths still compile. */
export const UNLOCK_PRICES: Record<DisplayCurrency, PriceRow> = STANDARD_PRICES;

const CURRICULUM_TO_COUNTRY: Record<string, string> = {
  "Nigeria (NERDC)": "NG",
  "Ghana": "GH",
  "Kenya": "KE",
};

export function detectCurrency(country?: string | null): DisplayCurrency {
  const c = (country || "").toUpperCase();
  if (c === "KE") return "KES";
  if (c === "GH") return "GHS";
  if (c === "NG") return "NGN";
  return "NGN";
}

/** Resolve display currency from profile country, selected curriculum, or browser locale. */
export function resolveDisplayCurrency(opts: {
  profileCountry?: string | null;
  curriculum?: string | null;
}): DisplayCurrency {
  if (opts.profileCountry) return detectCurrency(opts.profileCountry);
  if (opts.curriculum && CURRICULUM_TO_COUNTRY[opts.curriculum]) {
    return detectCurrency(CURRICULUM_TO_COUNTRY[opts.curriculum]);
  }
  if (typeof navigator !== "undefined") {
    const langs = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
    for (const l of langs) {
      const up = l.toUpperCase();
      if (up.includes("-KE") || up.includes("SW")) return "KES";
      if (up.includes("-GH")) return "GHS";
      if (up.includes("-NG")) return "NGN";
    }
  }
  return "NGN";
}

/** Paystack channels appropriate for each display currency's country. */
export function paystackChannelsFor(currency: DisplayCurrency): string[] {
  switch (currency) {
    case "NGN":
      return ["card", "bank", "ussd", "bank_transfer", "qr", "mobile_money"];
    case "GHS":
      return ["card", "mobile_money"];
    case "KES":
      return ["card", "mobile_money"];
  }
}

export function formatMinor(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  const sym =
    currency === "NGN" ? "₦" :
    currency === "KES" ? "KSh " :
    currency === "GHS" ? "GH₵ " : "";
  return `${sym}${major.toLocaleString()}`;
}
