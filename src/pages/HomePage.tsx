import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import teazyLogo from "@/assets/teazy-logo.jpg";
import {
  BookOpen,
  PenLine,
  ListChecks,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Play,
  Clock,
  Zap,
  GraduationCap,
  Globe2,
  Shield,
  Star,
  FileText,
  Upload,
  Download,
  ChevronRight,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* -------------------------------------------------------------------------- */
/* Animation helpers                                                          */
/* -------------------------------------------------------------------------- */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* -------------------------------------------------------------------------- */
/* Browser frame mockup                                                       */
/* -------------------------------------------------------------------------- */
function BrowserFrame({ children, url = "app.teazy.ai" }: { children: React.ReactNode; url?: string }) {
  return (
    <div className="rounded-2xl bg-white shadow-elevated border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/60">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
          <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
          <span className="h-3 w-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="mx-auto px-4 py-1 rounded-md bg-white border border-border text-xs text-muted-foreground font-medium">
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero dashboard mockup                                                      */
/* -------------------------------------------------------------------------- */
function HeroMockup() {
  return (
    <BrowserFrame url="app.teazy.ai/lesson-notes">
      <div className="p-5 sm:p-6 bg-gradient-to-br from-white to-secondary/40">
        {/* toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <div className="text-sm font-semibold text-navy">Lesson Generator</div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Generating
          </div>
        </div>

        {/* input row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {["Nigeria · NERDC", "JSS 2 · Biology", "40 min"].map((v) => (
            <div key={v} className="text-[11px] px-2.5 py-2 rounded-lg bg-white border border-border text-muted-foreground font-medium truncate">
              {v}
            </div>
          ))}
        </div>

        {/* generated content */}
        <div className="rounded-xl bg-white border border-border p-4 space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Topic: Photosynthesis
          </div>
          <div>
            <div className="text-xs font-semibold text-navy mb-1.5">Behavioural Objectives</div>
            <div className="space-y-1.5">
              {[
                "Define photosynthesis and its importance",
                "Identify the reactants and products",
                "Explain the role of chlorophyll",
              ].map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.15, duration: 0.4 }}
                  className="flex items-start gap-2 text-[11px] text-muted-foreground"
                >
                  <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                  <span>{t}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-border">
            <div className="text-xs font-semibold text-navy mb-1.5">Set Induction</div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "82%" }}
                transition={{ delay: 1.2, duration: 1.2, ease: "easeOut" }}
                className="h-full bg-gradient-primary"
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Writing lesson body…</span>
              <span>82%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-9 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-semibold shadow-glow">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate lesson note
          </div>
          <div className="h-9 w-9 rounded-lg bg-white border border-border flex items-center justify-center">
            <Download className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Product showcase mockups                                                   */
/* -------------------------------------------------------------------------- */
function ShowcaseMockup({ title, kind }: { title: string; kind: "lesson" | "essay" | "quiz" | "dash" | "download" }) {
  return (
    <BrowserFrame url={`app.teazy.ai/${kind}`}>
      <div className="p-5 min-h-[240px] bg-gradient-to-br from-white to-secondary/40">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">{title}</div>

        {kind === "lesson" && (
          <div className="space-y-2">
            {["Objectives", "Set induction", "Presentation", "Evaluation"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 text-xs text-navy">
                <span className="h-5 w-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                <span className="font-medium">{s}</span>
                <div className="flex-1 h-1 rounded bg-secondary" />
              </div>
            ))}
          </div>
        )}

        {kind === "essay" && (
          <div className="space-y-2">
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-center">
              <Upload className="h-4 w-4 mx-auto text-primary" />
              <div className="text-[10px] text-primary font-semibold mt-1">Handwritten essay uploaded</div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-navy font-semibold">Score</span>
              <span className="text-primary font-bold">18 / 25</span>
            </div>
            <div className="space-y-1">
              {["Content 8/10", "Grammar 5/7", "Structure 3/4", "Originality 2/4"].map((r) => (
                <div key={r} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-success" /> {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {kind === "quiz" && (
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-navy">Q1. What is the powerhouse of the cell?</div>
            {["Nucleus", "Mitochondria", "Ribosome", "Golgi"].map((o, i) => (
              <div
                key={o}
                className={`flex items-center gap-2 text-[11px] p-2 rounded-md border ${
                  i === 1 ? "bg-success/10 border-success/40 text-success font-semibold" : "bg-white border-border text-muted-foreground"
                }`}
              >
                <span className="h-4 w-4 rounded-full border border-current flex items-center justify-center text-[9px]">
                  {String.fromCharCode(65 + i)}
                </span>
                {o}
                {i === 1 && <CheckCircle2 className="h-3 w-3 ml-auto" />}
              </div>
            ))}
          </div>
        )}

        {kind === "dash" && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: "Lessons", v: "128", i: BookOpen },
              { k: "Essays graded", v: "54", i: PenLine },
              { k: "Quizzes", v: "37", i: ListChecks },
              { k: "Hours saved", v: "212", i: Clock },
            ].map(({ k, v, i: Icon }) => (
              <div key={k} className="rounded-lg bg-white border border-border p-2.5">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <div className="mt-1.5 text-lg font-bold text-navy leading-none">{v}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{k}</div>
              </div>
            ))}
          </div>
        )}

        {kind === "download" && (
          <div className="space-y-2">
            {[
              { n: "Photosynthesis — JSS2.docx", s: "Word · 24 KB" },
              { n: "Fractions — Primary 5.pdf", s: "PDF · 88 KB" },
              { n: "Civic Education — SS1.docx", s: "Word · 31 KB" },
            ].map((f) => (
              <div key={f.n} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-border">
                <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-navy truncate">{f.n}</div>
                  <div className="text-[9px] text-muted-foreground">{f.s}</div>
                </div>
                <Download className="h-3.5 w-3.5 text-primary" />
              </div>
            ))}
          </div>
        )}
      </div>
    </BrowserFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */
const TRUST = [
  { icon: Zap, label: "AI Powered" },
  { icon: Globe2, label: "Built for African Schools" },
  { icon: BookOpen, label: "Curriculum Aligned" },
  { icon: Shield, label: "Trusted by Educators" },
];

const OUTCOMES = [
  { stat: "10+ hrs", label: "Saved every week", sub: "Cut prep time from evenings to minutes." },
  { stat: "5×", label: "Faster essay marking", sub: "Upload handwritten scripts, get rubric feedback." },
  { stat: "3", label: "Curricula supported", sub: "NERDC, NaCCA and CBC out of the box." },
  { stat: "₦2,000", label: "Affordable Pro tier", sub: "Priced for teachers, not enterprise budgets." },
];

const TESTIMONIALS = [
  {
    name: "Mrs. Adebayo",
    role: "JSS Science Teacher",
    school: "Lagos, Nigeria",
    quote: "Teazy AI saves me hours every week preparing lesson notes. The NERDC format is exactly what my school expects.",
  },
  {
    name: "Mr. Otieno",
    role: "CBC Educator",
    school: "Nairobi, Kenya",
    quote: "The curriculum alignment feels local and accurate. My CBC lesson plans now take minutes, not evenings.",
  },
  {
    name: "Ms. Mensah",
    role: "Primary Teacher",
    school: "Accra, Ghana",
    quote: "The first AI tool that actually understands our classroom system. The quizzes are classroom-ready.",
  },
];

const FAQS = [
  { q: "Can I use the Nigerian curriculum?", a: "Yes. Teazy AI generates Nigerian lesson notes that follow the NERDC structure — behavioural objectives, set induction, presentation, evaluation and assignment." },
  { q: "Does it assess handwriting?", a: "Absolutely. Upload a photo of a handwritten essay, Teazy AI extracts the text and grades it using a rubric covering content, grammar, structure and originality." },
  { q: "Can I edit generated lessons?", a: "Yes. Every generated lesson note is fully editable inside Teazy AI before you export it as Word or PDF." },
  { q: "Can I download Word and PDF?", a: "Word and PDF downloads are part of the Pro tier. Free users can generate and copy content freely, then upgrade when they need a formatted file." },
  { q: "Is there a free version?", a: "Yes. Lesson notes, quizzes, copying outputs and your first 2 Writing Assessment uploads are free forever." },
];

const PRO_PRICES_ROTATE = [
  { country: "Nigeria", price: "₦2,000", period: "/ month" },
  { country: "Ghana", price: "GH₵ 20", period: "/ month" },
  { country: "Kenya", price: "KSh 180", period: "/ month" },
];

function ProPricingCard() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PRO_PRICES_ROTATE.length), 2500);
    return () => clearInterval(t);
  }, []);
  const current = PRO_PRICES_ROTATE[idx];

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-elevated flex flex-col"
    >
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-glow">
        Most popular
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold uppercase tracking-wider text-primary">Professional</div>
        <div className="flex items-center gap-1">
          {PRO_PRICES_ROTATE.map((_, i) => (
            <button
              key={i}
              aria-label={`Show price ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 h-[76px] relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.country}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold text-navy">{current.price}</span>
              <span className="text-muted-foreground">{current.period}</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-primary uppercase tracking-wider">{current.country}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <Button asChild className="mt-6 w-full h-11 bg-gradient-primary hover:opacity-90 shadow-glow">
        <Link to="/auth?next=/account">
          <Sparkles className="h-4 w-4 mr-1.5" /> Subscribe
        </Link>
      </Button>
      <ul className="mt-6 space-y-3 text-sm">
        {[
          "Unlimited lesson generation",
          "40 Writing Assessment uploads / month",
          "PDF and Word downloads",
          "Inline editing",
          "Priority access",
          "No per-download fees",
        ].map((p) => (
          <li key={p} className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-navy font-medium">{p}</span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */
export default function HomePage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <Helmet>
        <title>AI Teaching Assistant for African Classrooms | Teazy AI</title>
        <meta
          name="description"
          content="Generate curriculum-aligned lesson notes, quizzes, presentations and mark handwritten scripts in minutes. Built for teachers in Nigeria, Ghana and Kenya."
        />
        <link rel="canonical" href="/" />
        <meta property="og:title" content="AI Teaching Assistant for African Classrooms | Teazy AI" />
        <meta property="og:description" content="Lesson notes, assessments and quizzes for African teachers — in minutes." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />

        <div className="relative container mx-auto max-w-4xl px-4 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Built specifically for African teachers
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold text-navy leading-[1.05] tracking-tight text-balance"
            >
              AI Teaching Assistant for{" "}
              <span className="gradient-text">African Classrooms</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Generate curriculum-aligned lesson notes, assessments, quizzes, presentations, and mark handwritten scripts in minutes.
            </motion.p>

            <motion.p variants={fadeUp} className="mt-3 text-sm text-muted-foreground">
              Built specifically for teachers in Nigeria, Ghana, Kenya and across Africa.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base bg-gradient-primary hover:opacity-90 shadow-glow transition-all hover:scale-[1.02]">
                <Link to="/app">
                  Generate Lesson Notes <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <a href="#features">
                  <Play className="h-4 w-4" /> See features
                </a>
              </Button>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center gap-4">
              <div className="flex -space-x-2">
                {["A", "O", "M", "K"].map((c, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white bg-gradient-primary text-white text-xs font-bold flex items-center justify-center"
                  >
                    {c}
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground text-left">
                <div className="flex items-center gap-0.5 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                Loved by teachers across 3 countries
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================== TRUST BAR ============================== */}
      <section className="border-y border-border bg-secondary/40">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 justify-center text-sm font-semibold text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== FEATURE GRID ============================== */}
      <section id="features" className="py-24 sm:py-32">
        <div className="container mx-auto max-w-6xl px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Features</div>
            <h2 className="text-4xl sm:text-5xl font-bold text-navy tracking-tight text-balance">
              Everything a Modern Teacher Needs
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three flagship tools that replace hours of manual prep and marking.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="mt-16 grid md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: BookOpen,
                title: "Generate Lesson Notes",
                body: "Complete curriculum-aligned lesson notes in seconds — objectives, set induction, presentation and evaluation.",
                tags: ["NERDC", "NaCCA", "CBC"],
                accent: "from-primary/10 to-primary/0",
              },
              {
                icon: PenLine,
                title: "Assess Handwritten Work",
                body: "Upload handwritten essays and theory answers. Get marks, feedback and suggestions instantly.",
                tags: ["Rubric grading", "Feedback"],
                accent: "from-primary/15 to-primary/0",
              },
              {
                icon: ListChecks,
                title: "Quiz Generator",
                body: "Generate quizzes, tests and exam questions instantly — with answer keys ready for the classroom.",
                tags: ["MCQ", "Theory", "Answer keys"],
                accent: "from-primary/10 to-primary/0",
              },
            ].map((c) => (
              <motion.article
                key={c.title}
                variants={fadeUp}
                className="group relative rounded-2xl border border-border bg-card p-8 hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} opacity-60`} />
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gradient-primary text-white flex items-center justify-center shadow-glow">
                    <c.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-navy">{c.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed min-h-[72px]">{c.body}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {c.tags.map((t) => (
                      <span key={t} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-primary/20 text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================== HOW IT WORKS ============================== */}
      <section id="how-it-works" className="py-24 bg-gradient-soft">
        <div className="container mx-auto max-w-6xl px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">How it works</div>
            <h2 className="text-4xl sm:text-5xl font-bold text-navy tracking-tight text-balance">
              Three Steps to Smarter Teaching
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="mt-16 grid md:grid-cols-3 gap-6 relative"
          >
            {[
              { n: 1, title: "Choose subject & topic", body: "Pick your curriculum, class and topic. Teazy AI adapts to your syllabus.", icon: BookOpen },
              { n: 2, title: "Generate or upload", body: "Generate AI content, or upload handwritten work for instant grading.", icon: Sparkles },
              { n: 3, title: "Download or share", body: "Export as Word or PDF, edit inline, or share with your class.", icon: Download },
            ].map((s, i) => (
              <motion.div key={s.n} variants={fadeUp} className="relative">
                <div className="rounded-2xl bg-card border border-border p-8 h-full hover:shadow-card transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-primary text-white font-bold flex items-center justify-center shadow-glow">
                      {s.n}
                    </div>
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-navy">{s.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-5 -translate-y-1/2 h-6 w-6 text-primary/40" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>


      {/* ============================== OUTCOMES ============================== */}
      <section className="py-24 bg-gradient-soft">
        <div className="container mx-auto max-w-6xl px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Why teachers love Teazy AI</div>
            <h2 className="text-4xl sm:text-5xl font-bold text-navy tracking-tight text-balance">
              Real outcomes, in real classrooms
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {OUTCOMES.map((o) => (
              <motion.div
                key={o.label}
                variants={fadeUp}
                className="rounded-2xl bg-card border border-border p-6 hover:shadow-card hover:-translate-y-1 transition-all"
              >
                <div className="text-4xl font-bold gradient-text tracking-tight">{o.stat}</div>
                <div className="mt-2 font-semibold text-navy">{o.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">{o.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================== TESTIMONIALS ============================== */}
      <section className="py-24 sm:py-32">
        <div className="container mx-auto max-w-6xl px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Testimonials</div>
            <h2 className="text-4xl sm:text-5xl font-bold text-navy tracking-tight text-balance">
              Trusted by teachers across Africa
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="mt-16 grid md:grid-cols-3 gap-6"
          >
            {TESTIMONIALS.map((t) => (
              <motion.figure
                key={t.name}
                variants={fadeUp}
                className="rounded-2xl border border-border bg-card p-8 hover:shadow-card transition-shadow"
              >
                <div className="flex gap-0.5 text-amber-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="text-navy leading-relaxed">"{t.quote}"</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 pt-6 border-t border-border">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary text-white font-bold flex items-center justify-center">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-navy text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role} · {t.school}</div>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================== PRICING ============================== */}
      <section id="pricing" className="py-24 bg-gradient-soft">
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Pricing</div>
            <h2 className="text-4xl sm:text-5xl font-bold text-navy tracking-tight text-balance">
              Priced for teachers, not enterprises
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Upgrade only when you need downloads and unlimited grading.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="mt-16 grid md:grid-cols-2 gap-6"
          >
            {/* Free */}
            <motion.article
              variants={fadeUp}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="rounded-2xl border border-border bg-card p-8 flex flex-col"
            >
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Free</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-navy">₦0</span>
                <span className="text-muted-foreground">/ forever</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">GH₵ 0 · KSh 0</p>
              <Button asChild variant="outline" className="mt-6 w-full h-11">
                <Link to="/app">Start free</Link>
              </Button>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Unlimited lesson note generation",
                  "2 free Writing Assessment uploads",
                  "Quiz generator",
                  "Copy generated content",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-navy">{p}</span>
                  </li>
                ))}
              </ul>

              {/* Per-download pricing */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Download className="h-3.5 w-3.5" /> Pay per download
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Need just one PDF or Word file? Unlock a single download without a subscription.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { c: "Nigeria", p: "₦500" },
                    { c: "Ghana", p: "500 CFA" },
                    { c: "Kenya", p: "KSh 45" },
                  ].map((x) => (
                    <div key={x.c} className="rounded-lg border border-border bg-secondary/50 p-2.5 text-center">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{x.c}</div>
                      <div className="mt-0.5 text-sm font-bold text-navy">{x.p}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">One-time unlock per file. No account required.</p>
              </div>
            </motion.article>

            {/* Pro */}
            <ProPricingCard />
          </motion.div>
        </div>
      </section>

      {/* ============================== FAQ ============================== */}
      <section className="py-24 sm:py-32">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">FAQ</div>
            <h2 className="text-4xl sm:text-5xl font-bold text-navy tracking-tight text-balance">
              Frequently asked questions
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            variants={fadeUp}
          >
            <Accordion type="single" collapsible className="mt-12 bg-card rounded-2xl border border-border px-6 shadow-soft">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left font-semibold text-navy hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* ============================== FINAL CTA ============================== */}
      <section className="py-24">
        <div className="container mx-auto max-w-6xl px-4">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl bg-gradient-cta p-12 sm:p-16 lg:p-20 text-center shadow-elevated"
          >
            <div className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black,transparent)]" />
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-primary-glow/40 blur-3xl" />

            <div className="relative">
              <GraduationCap className="h-12 w-12 mx-auto text-white" />
              <h2 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight text-balance leading-tight">
                Spend Less Time Preparing.<br />
                <span className="text-white/80">Spend More Time Teaching.</span>
              </h2>
              <p className="mt-6 text-lg text-white/70 max-w-xl mx-auto">
                Join teachers across Nigeria, Ghana and Kenya using Teazy AI to reclaim their evenings.
              </p>
              <Button asChild size="lg" className="mt-10 h-14 px-8 text-base bg-white text-navy hover:bg-white/90 shadow-glow">
                <Link to="/app">
                  Start Using Teazy AI <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================== FOOTER ============================== */}
      <footer className="border-t border-border bg-secondary/40">
        <div className="container mx-auto max-w-6xl px-4 py-16">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2.5">
                <img src={teazyLogo} alt="Teazy Tech logo" className="h-10 w-10 rounded-xl object-contain bg-white border border-border shadow-soft" />
                <span className="text-lg font-bold text-navy">Teazy Tech</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                The AI teaching assistant built for African classrooms.
              </p>
              <div className="mt-6 flex gap-3">
                {[Twitter, Facebook, Instagram, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label="social"
                    className="h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {[
              { title: "Product", links: [["Features", "#features"], ["Pricing", "#pricing"], ["How it works", "#how-it-works"]] },
              { title: "Company", links: [["About", "#"], ["Contact", "#"], ["Blog", "#"]] },
              { title: "Legal", links: [["Privacy Policy", "#"], ["Terms", "#"], ["Cookies", "#"]] },
            ].map((col) => (
              <div key={col.title}>
                <div className="text-sm font-bold text-navy uppercase tracking-wider">{col.title}</div>
                <ul className="mt-4 space-y-3">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Teazy Tech — Empowering teachers with technology.
            </p>
            <p className="text-xs text-muted-foreground">Made with care for African classrooms.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
