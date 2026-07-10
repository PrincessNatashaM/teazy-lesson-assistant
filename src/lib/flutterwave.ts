// Loads Flutterwave inline checkout script (v3) once.
let loadingPromise: Promise<any> | null = null;

export async function loadFlutterwave(): Promise<any> {
  if ((window as any).FlutterwaveCheckout) return (window as any).FlutterwaveCheckout;
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.flutterwave.com/v3.js";
    s.async = true;
    s.onload = () => resolve((window as any).FlutterwaveCheckout);
    s.onerror = () => reject(new Error("Failed to load Flutterwave"));
    document.head.appendChild(s);
  });
  return loadingPromise;
}

export function flutterwavePaymentOptionsFor(currency: "NGN" | "GHS" | "KES"): string {
  switch (currency) {
    case "NGN": return "card,banktransfer,ussd,account,qr";
    case "GHS": return "card,mobilemoneyghana";
    case "KES": return "card,mpesa";
  }
}
