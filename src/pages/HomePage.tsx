import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import teazyLogo from "@/assets/teazy-logo.jpg";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* -------------------------------------------------------------------------- */
/* Motion primitives — quiet, editorial, respects prefers-reduced-motion.     */
/* -------------------------------------------------------------------------- */
const inkRise = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

/* -------------------------------------------------------------------------- */
/* Reusable editorial fragments                                                */
/* -------------------------------------------------------------------------- */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.24em] uppercase text-ember">
      <span className="h-px w-6 bg-ember" />
      {children}
    </span>
  );
}

function InkUnderline() {
  // Hand-drawn warm-orange stroke under the accented headline word.
  return (
    <svg
      className="absolute -bottom-1 left-0 w-full h-3 text-ember"
      viewBox="0 0 300 12"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M1 10.5C50 3.5 150 1.5 299 8.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Editorial lesson-note "paper" — replaces the browser mockup                 */
/* -------------------------------------------------------------------------- */
function LessonPaper() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Back sheet, slight offset — layered paper */}
      <div
        className="absolute inset-0 translate-x-2 translate-y-3 bg-paper-deep/70 rotate-[1.5deg] rounded-[2px]"
        aria-hidden
      />
      {/* Front sheet */}
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: 0 }}
        whileInView={{ opacity: 1, y: 0, rotate: 2 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative aspect-[4/5] bg-white shadow-2xl p-8 rotate-2 paper-grain"
      >
        <div className="border-l-2 border-ember/30 pl-6 h-full flex flex-col">
          <div className="mb-8">
            <span className="text-ember text-[10px] font-semibold uppercase tracking-[0.24em] block mb-3">
              Lesson Plan · JSS 2 · Biology
            </span>
            <div className="font-display text-2xl leading-tight text-ink">
              Photosynthesis and the leaf.
            </div>
          </div>

          <div className="space-y-5">
            <div className="relative -ml-12 p-5 bg-paper border border-paper-deep">
              <div className="font-display text-lg text-ink mb-1">
                NERDC alignment
              </div>
              <p className="text-sm text-ink/70 leading-relaxed">
                Behavioural objectives mapped to the JSS 2 Basic Science scheme.
              </p>
            </div>

            {[
              "State two reactants and two products of photosynthesis.",
              "Identify the role of chlorophyll in the process.",
              "Describe one everyday example a learner can observe.",
            ].map((line) => (
              <div key={line} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-ember shrink-0" />
                <p className="text-[13px] text-ink/80 leading-relaxed">{line}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8 border-t border-paper-deep flex items-end justify-between">
            <div className="font-display text-4xl text-ink/10 leading-none">
              Teazy.
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink/40">
              Draft · reviewed
            </div>
          </div>
        </div>
      </motion.div>

      {/* Warm-orange margin note */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: 0 }}
        whileInView={{ opacity: 1, y: 0, rotate: -3 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ delay: 0.25, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute -bottom-6 -left-6 bg-ember text-white p-5 max-w-[190px] shadow-xl -rotate-3"
      >
        <p className="text-[15px] leading-tight font-medium font-display">
          Generated in 14 seconds.
        </p>
        <p className="text-[11px] mt-1 text-white/80 uppercase tracking-[0.2em]">
          Reviewed for curriculum fit
        </p>
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */
const CURRICULA = [
  {
    n: "01",
    country: "Nigeria",
    body: "NERDC",
    line:
      "Behavioural objectives, set induction, presentation and evaluation, in the exact structure your head of department checks for.",
  },
  {
    n: "02",
    country: "Ghana",
    body: "NaCCA",
    line:
      "Common Core competencies, indicators, teaching and learning activities, aligned to the current NaCCA syllabus.",
  },
  {
    n: "03",
    country: "Kenya",
    body: "CBC",
    line:
      "Learning outcomes, key inquiry questions, core competencies and community service learning. CBC as it is actually taught.",
  },
];

const STEPS = [
  {
    n: "I.",
    title: "Tell us your class.",
    body:
      "Choose curriculum, class and topic — or switch to online teaching and give an age group and platform.",
  },
  {
    n: "II.",
    title: "Draft, then reviewed.",
    body:
      "Teazy drafts the lesson, then runs a pedagogical review for curriculum fit, objectives and flow before you see a single word.",
  },
  {
    n: "III.",
    title: "Teach or export.",
    body:
      "Edit inline, teach straight from the screen, or export a clean Word or PDF ready for your school file.",
  },
];

const TESTIMONIALS = [
  {
    name: "Mrs. Adebayo",
    role: "JSS Science Teacher",
    place: "Lagos, Nigeria",
    quote:
      "The NERDC structure is exactly what my school inspects for. I stopped writing lesson notes at midnight.",
  },
  {
    name: "Mr. Otieno",
    role: "CBC Educator",
    place: "Nairobi, Kenya",
    quote:
      "The competencies and inquiry questions read like a colleague wrote them, not a chatbot. That is rare.",
  },
  {
    name: "Ms. Mensah",
    role: "Primary Teacher",
    place: "Accra, Ghana",
    quote:
      "First AI tool that actually understands NaCCA. The quizzes are classroom-ready without editing.",
  },
];

const FAQS = [
  {
    q: "Which curricula are supported?",
    a: "Nigeria (NERDC), Ghana (NaCCA / Common Core) and Kenya (CBC). Each lesson is written in the terminology and structure that curriculum expects.",
  },
  {
    q: "Can I assess handwritten scripts?",
    a: "Yes. Upload a photo of a handwritten essay or theory answer and Teazy AI extracts the text and grades it using a rubric covering content, grammar, structure and originality.",
  },
  {
    q: "Can I edit generated lessons?",
    a: "Every generated lesson is fully editable inside Teazy AI before you export it as Word or PDF.",
  },
  {
    q: "Are Word and PDF downloads included?",
    a: "Word and PDF downloads are part of the Pro tier. Free users can generate and copy content freely, then upgrade when they need a formatted file.",
  },
  {
    q: "Is there a free plan?",
    a: "Lesson notes, quizzes, copying outputs and your first two Writing Assessment uploads are free forever.",
  },
];

const PRO_PRICES = [
  { country: "Nigeria", price: "₦2,000", period: "/ month" },
  { country: "Ghana", price: "GH₵20", period: "/ month" },
  { country: "Kenya", price: "KSh200", period: "/ month" },
];

/* -------------------------------------------------------------------------- */
/* Rotating price block for the pricing teaser                                 */
/* -------------------------------------------------------------------------- */
function RotatingPrice() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PRO_PRICES.length), 2600);
    return () => clearInterval(t);
  }, []);
  const current = PRO_PRICES[idx];
  return (
    <div className="relative h-24 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.country}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <div className="flex items-baseline gap-2">
            <span className="font-display text-7xl text-ink leading-none">
              {current.price}
            </span>
            <span className="text-ink/50 text-lg">{current.period}</span>
          </div>
          <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.28em] text-ember">
            {current.country}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
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
          content="A quiet, curriculum-aligned lesson-note engine for teachers in Nigeria, Ghana and Kenya. Draft, review and teach in minutes."
        />
        <link rel="canonical" href="/" />
        <meta property="og:title" content="AI Teaching Assistant for African Classrooms | Teazy AI" />
        <meta property="og:description" content="Lesson notes, quizzes and handwritten-script marking, tuned to NERDC, NaCCA and CBC." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      {/* ================================================================== */}
      {/* HERO — editorial paper craft                                        */}
      {/* ================================================================== */}
      <section className="relative bg-paper text-ink overflow-hidden">
        <div className="absolute inset-0 paper-grain opacity-60 pointer-events-none" aria-hidden />
        {/* Warm-nude off-axis field, right side */}
        <div
          className="absolute top-0 right-0 h-full w-1/3 bg-paper-deep/60 -skew-x-12 translate-x-1/4 pointer-events-none"
          aria-hidden
        />

        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 pt-24 pb-32 lg:pt-32 lg:pb-40 font-body">
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="grid lg:grid-cols-2 gap-16 items-center"
          >
            <div>
              <motion.div variants={inkRise}>
                <Eyebrow>Built for African classrooms</Eyebrow>
              </motion.div>

              <motion.h1
                variants={inkRise}
                className="font-display mt-8 text-5xl md:text-6xl lg:text-7xl leading-[0.95] text-ink text-balance"
              >
                Empowering the
                <br />
                <span className="relative inline-block">
                  modern teacher.
                  <InkUnderline />
                </span>
              </motion.h1>

              <motion.p
                variants={inkRise}
                className="mt-8 text-lg md:text-xl text-ink/75 max-w-xl leading-relaxed"
              >
                A quiet lesson-note engine tuned to NERDC, NaCCA and CBC.
                Teazy AI drafts the lesson, then runs a pedagogical review
                before you read a single word.
              </motion.p>

              <motion.div
                variants={inkRise}
                className="mt-10 flex flex-wrap items-center gap-5"
              >
                <Button
                  asChild
                  className="h-14 px-9 bg-ink hover:bg-ink/90 text-paper text-base font-medium tracking-wide rounded-none shadow-xl transition-all"
                >
                  <Link to="/app">Get started free</Link>
                </Button>
                <Link
                  to="/app"
                  className="group inline-flex items-center gap-3 text-sm font-medium text-ink/70 hover:text-ink transition-colors"
                >
                  <span className="relative">
                    See a sample lesson
                    <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-ink transition-all duration-500 group-hover:w-full" />
                  </span>
                </Link>
              </motion.div>

              <motion.div variants={inkRise} className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-2">
                  <div className="w-9 h-9 rounded-full bg-ember border-2 border-paper flex items-center justify-center text-[10px] text-white font-semibold tracking-wider">
                    NG
                  </div>
                  <div className="w-9 h-9 rounded-full bg-ink border-2 border-paper flex items-center justify-center text-[10px] text-white font-semibold tracking-wider">
                    GH
                  </div>
                  <div className="w-9 h-9 rounded-full bg-paper-deep border-2 border-paper flex items-center justify-center text-[10px] text-ink font-semibold tracking-wider">
                    KE
                  </div>
                </div>
                <span className="text-sm text-ink/55 italic">
                  Trusted by teachers across three curricula.
                </span>
              </motion.div>
            </div>

            <motion.div variants={inkRise}>
              <LessonPaper />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* PRINCIPLES BAND — editorial trio                                    */}
      {/* ================================================================== */}
      <section className="bg-paper text-ink border-t border-paper-deep">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-14">
            {[
              {
                h: "Local context first.",
                p: "No generic AI templates. Teazy writes in the vocabulary of your syllabus.",
              },
              {
                h: "Draft, then reviewed.",
                p: "Every lesson passes a second pedagogical review before it reaches you.",
              },
              {
                h: "Paper-thin friction.",
                p: "Feels like writing in a planner. Thinks like a curriculum consultant.",
              },
            ].map((c, i) => (
              <motion.div
                key={c.h}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ember mb-4">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-display text-3xl leading-tight text-ink mb-3">
                  {c.h}
                </h3>
                <p className="text-ink/70 leading-relaxed">{c.p}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CURRICULA — deep ink section, cream marginalia                      */}
      {/* ================================================================== */}
      <section
        id="features"
        className="bg-ink text-paper relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--paper) / 0.35) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-28 lg:py-36">
          <div className="grid lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <Eyebrow>The curriculum shelf</Eyebrow>
              <h2 className="font-display mt-6 text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-paper text-balance">
                Precision for your
                <span className="italic text-ember"> local</span> curriculum.
              </h2>
              <p className="mt-6 text-lg text-paper/70 leading-relaxed max-w-md">
                Not one generic template dressed in three flags. Three distinct
                pedagogies, each written in the voice its inspectors expect.
              </p>
            </div>

            <div className="lg:col-span-7 space-y-14">
              {CURRICULA.map((c, i) => (
                <motion.article
                  key={c.n}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="group grid grid-cols-[auto_1fr] gap-8 pb-10 border-b border-paper/10 last:border-b-0"
                >
                  <div className="font-display text-4xl text-ember/80 leading-none pt-1">
                    {c.n}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-4">
                      <h3 className="font-display text-3xl text-paper">
                        {c.country}
                      </h3>
                      <span className="text-[11px] uppercase tracking-[0.28em] text-paper/50">
                        {c.body}
                      </span>
                    </div>
                    <p className="mt-4 text-paper/70 leading-relaxed max-w-xl">
                      {c.line}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* HOW IT WORKS — asymmetric editorial rhythm                          */}
      {/* ================================================================== */}
      <section id="how-it-works" className="bg-paper text-ink">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-28 lg:py-36">
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-4">
              <Eyebrow>How Teazy AI works</Eyebrow>
              <h2 className="font-display mt-6 text-4xl md:text-5xl leading-[1.05] text-ink text-balance">
                Three quiet moves,
                <br />
                one finished lesson.
              </h2>
            </div>

            <div className="lg:col-span-8">
              <ol className="divide-y divide-paper-deep">
                {STEPS.map((s, i) => (
                  <motion.li
                    key={s.n}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    className="grid grid-cols-[auto_1fr] gap-8 py-10 first:pt-0"
                  >
                    <div className="font-display text-3xl text-ember pt-1">
                      {s.n}
                    </div>
                    <div>
                      <h3 className="font-display text-2xl md:text-3xl text-ink">
                        {s.title}
                      </h3>
                      <p className="mt-3 text-ink/70 leading-relaxed max-w-2xl">
                        {s.body}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* PULL QUOTE — cream to deep-ink handoff wash                         */}
      {/* ================================================================== */}
      <section className="bg-paper text-ink relative">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-28 lg:py-36 text-center relative">
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 font-display text-[180px] leading-none text-ink/[0.05] select-none pointer-events-none"
            aria-hidden
          >
            &ldquo;
          </div>
          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-3xl md:text-5xl leading-[1.15] text-ink text-balance"
          >
            Teazy understands that the African classroom is not another
            generic dashboard. It is built for our
            <span className="italic text-ember"> reality</span>.
          </motion.blockquote>
          <div className="mt-12 flex flex-col items-center gap-2">
            <div className="rule-hair w-16" />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-ink">
              Mrs. Amina Yusuf
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-ember">
              Senior educator
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* TESTIMONIALS — magazine pull-quote trio                              */}
      {/* ================================================================== */}
      <section className="bg-paper-deep/40 text-ink border-y border-paper-deep">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-24">
          <div className="mb-16">
            <Eyebrow>From the staff room</Eyebrow>
            <h2 className="font-display mt-6 text-4xl md:text-5xl leading-[1.05] text-ink text-balance max-w-2xl">
              Read by teachers.
              <br />
              Written like teachers write.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-10 md:gap-16">
            {TESTIMONIALS.map((t, i) => (
              <motion.figure
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <div className="font-display text-5xl text-ember/60 leading-none mb-4">
                  &ldquo;
                </div>
                <blockquote className="font-display text-xl md:text-2xl text-ink leading-snug">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-8 pt-6 border-t border-paper-deep">
                  <div className="text-sm font-semibold text-ink">{t.name}</div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-ink/50 mt-1">
                    {t.role} · {t.place}
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* PRICING TEASER — single tall vertical block                         */}
      {/* ================================================================== */}
      <section id="pricing" className="bg-paper text-ink">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-28 lg:py-36">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-6">
              <Eyebrow>Priced for teachers</Eyebrow>
              <h2 className="font-display mt-6 text-4xl md:text-5xl leading-[1.05] text-ink text-balance">
                One tier.
                <br />
                Three currencies.
                <br />
                No enterprise theatre.
              </h2>
              <p className="mt-6 text-lg text-ink/70 leading-relaxed max-w-lg">
                Start free. Upgrade only when you need Word and PDF exports and
                unlimited handwritten-script grading.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button
                  asChild
                  className="h-13 px-8 bg-ink hover:bg-ink/90 text-paper rounded-none text-sm font-medium tracking-wide shadow-lg"
                >
                  <Link to="/pricing">See full pricing</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-13 px-8 border-ink/20 text-ink hover:bg-ink hover:text-paper rounded-none text-sm font-medium tracking-wide"
                >
                  <Link to="/app">Start free</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-6 relative">
              <div className="relative bg-white shadow-2xl border border-paper-deep p-10 lg:p-12 paper-grain">
                <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-ember mb-6">
                  Teazy Pro · Monthly
                </div>
                <RotatingPrice />
                <div className="mt-10 space-y-4">
                  {[
                    "Unlimited lesson notes",
                    "40 handwritten-script uploads / month",
                    "Word and PDF exports",
                    "Inline editing",
                    "Priority processing",
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-3">
                      <span className="mt-2 h-1 w-4 bg-ember shrink-0" />
                      <span className="text-ink text-sm">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-paper-deep flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.28em] text-ink/50">
                    Cancel anytime
                  </span>
                  <span className="font-display text-2xl text-ink/20">Teazy.</span>
                </div>
              </div>
              <div className="absolute -top-4 -left-4 bg-ember text-white px-4 py-2 text-[10px] uppercase tracking-[0.28em] rotate-[-3deg] shadow">
                Most chosen
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FAQ                                                                 */}
      {/* ================================================================== */}
      <section className="bg-paper text-ink border-t border-paper-deep">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-28">
          <div className="mb-14">
            <Eyebrow>Questions, quietly answered</Eyebrow>
            <h2 className="font-display mt-6 text-4xl md:text-5xl leading-[1.05] text-ink text-balance">
              Before you begin.
            </h2>
          </div>

          <Accordion type="single" collapsible className="divide-y divide-paper-deep border-y border-paper-deep">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-0">
                <AccordionTrigger className="text-left py-6 font-display text-xl md:text-2xl text-ink hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-ink/70 leading-relaxed text-base pb-6 pr-8">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FINAL CTA — deep ink page-turn                                      */}
      {/* ================================================================== */}
      <section className="bg-ink text-paper relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--paper) / 0.35) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-8 py-28 lg:py-40 text-center">
          <Eyebrow>The next lesson</Eyebrow>
          <h2 className="font-display mt-8 text-5xl md:text-7xl leading-[1] text-paper text-balance">
            Spend less time preparing.
            <br />
            <span className="italic text-ember">Spend more time teaching.</span>
          </h2>
          <p className="mt-8 text-lg text-paper/70 max-w-xl mx-auto leading-relaxed">
            Draft your first curriculum-aligned lesson in the time it takes to
            pour a cup of tea.
          </p>
          <div className="mt-12">
            <Button
              asChild
              className="h-14 px-10 bg-paper hover:bg-paper/90 text-ink rounded-none text-base font-medium tracking-wide shadow-2xl"
            >
              <Link to="/app">Begin composing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FOOTER — editorial colophon                                         */}
      {/* ================================================================== */}
      <footer className="bg-paper text-ink border-t border-paper-deep">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-12 gap-14">
            <div className="lg:col-span-4">
              <div className="flex items-center gap-3">
                <img
                  src={teazyLogo}
                  alt="Teazy Tech logo"
                  className="h-10 w-10 rounded-lg object-contain bg-white border border-paper-deep"
                />
                <span className="font-display text-2xl text-ink">Teazy AI</span>
              </div>
              <p className="mt-6 text-sm text-ink/60 leading-relaxed max-w-xs">
                A calm teaching assistant for African classrooms. Built with
                care, aligned to your curriculum.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-10">
              {[
                {
                  title: "Product",
                  links: [
                    ["Lesson notes", "/app"],
                    ["Quiz generator", "/app/quiz"],
                    ["Writing assessment", "/app/writing"],
                    ["Pricing", "/pricing"],
                  ] as [string, string][],
                },
                {
                  title: "Curricula",
                  links: [
                    ["Nigeria · NERDC", "/app"],
                    ["Ghana · NaCCA", "/app"],
                    ["Kenya · CBC", "/app"],
                  ] as [string, string][],
                },
                {
                  title: "Company",
                  links: [
                    ["About", "https://www.teazytech.org/about"],
                    ["Contact", "https://www.teazytech.org/contact"],
                    ["Blog", "https://www.teazytech.org/blog"],
                  ] as [string, string][],
                },
              ].map((col) => (
                <div key={col.title}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-ember">
                    {col.title}
                  </div>
                  <ul className="mt-5 space-y-3">
                    {col.links.map(([label, href]) => {
                      const external = href.startsWith("http");
                      return (
                        <li key={label}>
                          <a
                            href={href}
                            {...(external
                              ? { target: "_blank", rel: "noopener noreferrer" }
                              : {})}
                            className="group inline-block text-sm text-ink/70 hover:text-ink transition-colors"
                          >
                            <span className="relative">
                              {label}
                              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-ink transition-all duration-500 group-hover:w-full" />
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-paper-deep flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-ink/40">
              © {new Date().getFullYear()} Teazy Tech
            </p>
            <div className="flex gap-8 text-[11px] uppercase tracking-[0.28em] text-ink/40">
              <span>Lagos</span>
              <span>Accra</span>
              <span>Nairobi</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
