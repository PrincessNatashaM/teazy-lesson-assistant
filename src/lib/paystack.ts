// Loads Paystack inline JS from CDN once.
let loadingPromise: Promise<any> | null = null;

export async function loadPaystack(): Promise<any> {
  if ((window as any).PaystackPop) return (window as any).PaystackPop;
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => resolve((window as any).PaystackPop);
    s.onerror = () => reject(new Error("Failed to load Paystack"));
    document.head.appendChild(s);
  });
  return loadingPromise;
}
