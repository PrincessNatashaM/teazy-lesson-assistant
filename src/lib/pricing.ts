// Pricing displayed to user. CFA is shown but charged via NGN equivalent.
export type DisplayCurrency = "NGN" | "CFA" | "KES";
export type ChargeCurrency = "NGN" | "KES";

export const UNLOCK_PRICES: Record<DisplayCurrency, { display: string; chargeCurrency: ChargeCurrency; chargeMinor: number }> = {
  NGN: { display: "₦500", chargeCurrency: "NGN", chargeMinor: 50000 },
  CFA: { display: "500 CFA", chargeCurrency: "NGN", chargeMinor: 50000 },
  KES: { display: "KSh 45", chargeCurrency: "KES", chargeMinor: 4500 },
};

export const PRO_PRICES: Record<DisplayCurrency, { display: string; chargeCurrency: ChargeCurrency; chargeMinor: number }> = {
  NGN: { display: "₦2,000/month", chargeCurrency: "NGN", chargeMinor: 200000 },
  CFA: { display: "2,000 CFA/month", chargeCurrency: "NGN", chargeMinor: 200000 },
  KES: { display: "KSh 180/month", chargeCurrency: "KES", chargeMinor: 18000 },
};

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
