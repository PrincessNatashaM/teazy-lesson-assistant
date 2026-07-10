import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import {
  STANDARD_PRICES,
  PRO_PRICES,
  detectCurrency,
  type DisplayCurrency,
} from "@/lib/pricing";
import PaywallModal from "@/components/PaywallModal";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";

const FREE_FEATURES = [
  "Unlimited lesson note generation",
  "Unlimited quiz generation",
  "Copy lesson notes",
  "2 free Writing Assessment uploads",
];
const FREE_LIMITS = ["No editing", "No PDF or Word downloads"];

const STANDARD_FEATURES = [
  "Everything in Free",
  "Unlimited lesson editing",
  "Unlimited PDF & Word downloads",
  "40 Writing Assessment uploads / month",
  "Assessment history",
  "Faster AI responses",
];

const PRO_FEATURES = [
  "Everything in Standard",
  "Unlimited Writing Assessment uploads",
  "Bulk marking (multiple scripts at once)",
  "Mark against uploaded marking schemes",
  "Question paper comparison",
  "Advanced analytics & student reports",
  "Excel & CSV export",
  "Priority AI processing",
  "Early access to new assessment features",
];

export default function PricingPage() {
  const { user } = useAuth();
  const { plan } = useEntitlements(null);
  const navigate = useNavigate();
  const [country, setCountry] = useState<DisplayCurrency>(
    detectCurrency(typeof navigator !== "undefined" && navigator.language?.includes("KE") ? "KE" : "NG")
  );
  const [paywall, setPaywall] = useState(false);

  const handleSubscribe = () => {
    if (!user) return navigate("/auth?next=/pricing");
    setPaywall(true);
  };

  const currencyBtn = (c: DisplayCurrency, label: string) => (
    <button
      key={c}
      onClick={() => setCountry(c)}
      className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
        country === c ? "bg-navy text-navy-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <Helmet>
        <title>Pricing | Teazy AI</title>
        <meta name="description" content="Simple, affordable pricing for African teachers. Free forever plan, Teazy AI Standard from ₦2,000/mo, and Assessment Pro for heavy assessment users." />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-navy font-heading">Simple pricing that grows with you</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Built for teachers in Nigeria, Ghana and Kenya. Start free — upgrade when you need more.
          </p>
          <div className="mt-5 inline-flex gap-1 bg-secondary/50 p-1 rounded-lg">
            {currencyBtn("NGN", "₦ Naira")}
            {currencyBtn("GHS", "GH₵ Cedi")}
            {currencyBtn("KES", "KSh Shilling")}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          {/* FREE */}
          <PlanCard
            title="Free"
            price="₦0"
            period="forever"
            tagline="For teachers exploring Teazy AI."
            features={FREE_FEATURES}
            limits={FREE_LIMITS}
            cta={
              plan === "free" ? (
                <Button variant="outline" className="w-full" disabled>Current plan</Button>
              ) : (
                <Button variant="outline" className="w-full" asChild><Link to="/auth?mode=signup">Sign up free</Link></Button>
              )
            }
          />

          {/* STANDARD */}
          <PlanCard
            title="Teazy AI Standard"
            price={STANDARD_PRICES[country].display.split("/")[0]}
            period="per month"
            tagline="For everyday classroom teachers."
            features={STANDARD_FEATURES}
            icon={<Sparkles className="h-4 w-4" />}
            cta={
              plan === "standard" ? (
                <Button className="w-full" disabled>Current plan</Button>
              ) : (
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubscribe}>
                  Subscribe
                </Button>
              )
            }
          />

          {/* PRO */}
          <PlanCard
            title="Assessment Pro"
            price={PRO_PRICES[country].display.split("/")[0]}
            period="per month"
            tagline="Best for teachers who grade frequently."
            features={PRO_FEATURES}
            highlight
            icon={<Crown className="h-4 w-4" />}
            badge="Recommended for schools"
            cta={
              plan === "pro" ? (
                <Button className="w-full" disabled>Current plan</Button>
              ) : (
                <Button className="w-full bg-navy text-navy-foreground hover:bg-navy/90" onClick={handleSubscribe}>
                  Upgrade to Pro
                </Button>
              )
            }
          />
        </div>

        {/* Upload packs */}
        <section className="mt-14 border border-border rounded-2xl p-6 bg-secondary/30">
          <h2 className="text-xl font-bold text-navy font-heading flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" /> Additional upload packs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            For Standard users only. Extra uploads never expire and are used after your monthly 40 are exhausted.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            <PackCard label="5 uploads" price={{ NGN: "₦500", CFA: "500 CFA", KES: "KSh 45" }[country]} />
            <PackCard label="10 uploads" price={{ NGN: "₦1,000", CFA: "1,000 CFA", KES: "KSh 90" }[country]} />
            <PackCard label="30 uploads" price={{ NGN: "₦2,000", CFA: "2,000 CFA", KES: "KSh 180" }[country]} />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Buy upload packs from the Writing Assessment page once you're on the Standard plan.
          </p>
        </section>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Prices shown are approximate equivalents. All plans billed in NGN or KES via Paystack.
        </p>
      </div>

      <PaywallModal
        open={paywall}
        onClose={() => setPaywall(false)}
        purpose="subscription"
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}

function PlanCard({
  title, price, period, tagline, features, limits, cta, highlight, icon, badge,
}: {
  title: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  limits?: string[];
  cta: React.ReactNode;
  highlight?: boolean;
  icon?: React.ReactNode;
  badge?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col ${
        highlight ? "border-accent shadow-lg ring-1 ring-accent/30 bg-card" : "border-border bg-card"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full shadow">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-bold text-navy font-heading">{title}</h3>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-navy font-heading">{price}</span>
        <span className="text-sm text-muted-foreground">{period}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>

      <ul className="mt-5 space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
        {limits?.map((l) => (
          <li key={l} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 shrink-0 mt-0.5 text-center">·</span>
            <span>{l}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">{cta}</div>
    </div>
  );
}

function PackCard({ label, price }: { label: string; price: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <div className="text-xs uppercase text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-navy font-heading">{price}</div>
    </div>
  );
}
