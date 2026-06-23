import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  BookOpen,
  Brain,
  PenLine,
  Sigma,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Globe2,
  FileDown,
  Wand2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import heroImg from "@/assets/hero-illustration.jpg";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Detailed Lesson Notes",
    body: "Generate curriculum-aligned, subject-aware lesson notes with behavioural objectives, set induction, presentation steps and evaluation. Download as editable Word documents in one click.",
  },
  {
    icon: Brain,
    title: "AI Quiz Generator",
    body: "Turn any topic into instant assessments — multiple choice questions with answer keys, ready for classroom use or homework.",
  },
  {
    icon: PenLine,
    title: "Writing Assessment",
    body: "Upload handwritten essays, let AI extract the text, then receive rubric-based feedback covering content, grammar, structure and originality.",
  },
  {
    icon: Sigma,
    title: "Maths & Science Support",
    body: "Properly rendered equations, formulas, labelled diagrams and instructional visuals for Mathematics, Biology, Physics, Chemistry and Geography.",
  },
];

const CURRICULA = [
  {
    flag: "🇳🇬",
    name: "Nigeria (NERDC)",
    points: [
      "Behavioural objectives",
      "Set induction & previous knowledge",
      "Presentation, evaluation, assignment",
    ],
  },
  {
    flag: "🇰🇪",
    name: "Kenya (CBC)",
    points: [
      "Competency-based learning outcomes",
      "Learner-centred core activities",
      "Values, PCIs and assessment rubrics",
    ],
  },
  {
    flag: "🇬🇭",
    name: "Ghana (NaCCA)",
    points: [
      "Structured lesson delivery",
      "Subject strands & sub-strands",
      "Curriculum-aligned content standards",
    ],
  },
];

const SUBJECTS = [
  "Mathematics",
  "English",
  "Biology",
  "Physics",
  "Chemistry",
  "Geography",
  "Civic Education",
  "Computer Studies",
  "Agriculture",
  "Literature",
  "Basic Science",
  "Social Studies",
];

const STEPS = [
  {
    icon: Globe2,
    title: "Select your curriculum",
    body: "Choose Nigeria, Ghana or Kenya. Teazy AI loads the right subjects and lesson structure for you.",
  },
  {
    icon: Wand2,
    title: "Enter topic & class",
    body: "Type the topic, pick the class level and duration. Add optional notes for differentiation.",
  },
  {
    icon: FileDown,
    title: "Generate & download",
    body: "Get a complete lesson note in seconds. Export as Word, copy to your planner, or generate a matching quiz.",
  },
];

const TESTIMONIALS = [
  {
    name: "Mrs. Adebayo",
    role: "JSS Science Teacher, Lagos",
    quote:
      "Teazy AI saves me hours every week preparing lesson notes. The NERDC format is exactly what my school expects.",
  },
  {
    name: "Mr. Otieno",
    role: "CBC Educator, Nairobi",
    quote:
      "The curriculum alignment feels local and accurate. My CBC lesson plans now take minutes, not evenings.",
  },
  {
    name: "Ms. Mensah",
    role: "Primary Teacher, Accra",
    quote:
      "This is the first AI tool that actually understands our classroom system. The quizzes are classroom-ready.",
  },
];

const FAQS = [
  {
    q: "What is Teazy AI?",
    a: "Teazy AI is an AI-powered teaching assistant that helps African teachers generate curriculum-aligned lesson notes, quizzes and writing assessments in minutes instead of hours.",
  },
  {
    q: "Does Teazy AI support the NERDC curriculum?",
    a: "Yes. Teazy AI generates Nigerian lesson notes that follow the NERDC structure — behavioural objectives, set induction, presentation, evaluation and assignment — with subject terminology used in Nigerian classrooms.",
  },
  {
    q: "Can I generate Kenya CBC lesson notes?",
    a: "Absolutely. Select the Kenya CBC curriculum and Teazy AI produces competency-based, learner-centred lesson plans with strands, sub-strands, learning outcomes and assessment rubrics.",
  },
  {
    q: "Does Teazy AI support handwritten essay grading?",
    a: "Yes. Upload a photo of a handwritten essay, Teazy AI extracts the text with OCR and grades it using a structured rubric covering content, grammar, structure and originality.",
  },
  {
    q: "Can I download lesson notes as Word documents?",
    a: "Word and PDF downloads are part of the premium tier. You can always generate lesson notes for free and copy the content, then upgrade when you need a formatted file to share or print.",
  },
  {
    q: "Is Teazy AI free to use?",
    a: "Lesson note generation, quiz generation, copying outputs and your first 2 writing assessments are free. PDF/Word downloads and additional writing assessments are part of the affordable premium tier.",
  },
  {
    q: "Which subjects are supported?",
    a: "Mathematics, English, Biology, Physics, Chemistry, Geography, Civic Education, Computer Studies, Agriculture, Literature, Basic Science, Social Studies and more — with subject lists that change automatically based on the curriculum you select.",
  },
];

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

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Teazy AI Lesson Assistant",
    applicationCategory: "EducationApplication",
    operatingSystem: "Web",
    description:
      "AI lesson note generator for African teachers. Generate curriculum-aligned lesson notes, quizzes and writing assessments for Nigeria, Ghana and Kenya.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <>
      <Helmet>
        <title>AI Lesson Note Generator for African Teachers | Teazy AI</title>
        <meta
          name="description"
          content="AI lesson note generator for African teachers. Generate curriculum-aligned lesson notes, quizzes and classroom materials for Nigeria (NERDC), Ghana (NaCCA) and Kenya (CBC)."
        />
        <link rel="canonical" href="/" />
        <meta property="og:title" content="AI Lesson Note Generator for African Teachers | Teazy AI" />
        <meta
          property="og:description"
          content="Curriculum-aligned AI lesson notes, quizzes and classroom materials for Nigeria, Ghana and Kenya."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="/" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(orgJsonLd)}</script>
      </Helmet>

      {/* HERO */}
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl px-4 py-16 sm:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Built for African classrooms
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy font-heading leading-tight">
              AI Lesson Note Generator for African Teachers
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Generate curriculum-aligned lesson notes, quizzes and classroom
              materials for Nigeria (NERDC), Ghana (NaCCA) and Kenya (CBC) —
              built for real classroom instruction.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/app">
                  Generate Lesson Notes <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">Explore Features</a>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Aligned with NERDC structure</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Supports Kenya CBC framework</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" /> Ghana NaCCA aligned</li>
            </ul>
          </div>
          <div className="relative">
            <img
              src={heroImg}
              alt="Teacher using Teazy AI to generate lesson notes, quizzes and grade handwritten essays"
              width={1280}
              height={960}
              className="w-full h-auto rounded-2xl shadow-2xl border border-border"
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy font-heading">
              Everything a teacher needs in one AI assistant
            </h2>
            <p className="mt-4 text-muted-foreground">
              From the first lesson note to the final graded essay, Teazy AI
              covers your full teaching workflow.
            </p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-border p-6 bg-card hover:shadow-lg transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground font-heading">{title}</h3>
                <p className="mt-2 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CURRICULA */}
      <section className="py-20 bg-secondary/40">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy font-heading">
              Built for African Classrooms
            </h2>
            <p className="mt-4 text-muted-foreground">
              Teazy AI adapts every lesson note to the curriculum you teach —
              the subject names, structure and pedagogy stay locally accurate.
            </p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {CURRICULA.map(({ flag, name, points }) => (
              <article key={name} className="rounded-2xl bg-card border border-border p-6">
                <div className="text-4xl" aria-hidden="true">{flag}</div>
                <h3 className="mt-3 text-xl font-semibold text-navy font-heading">{name}</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SUBJECTS */}
      <section className="py-20 bg-background">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy font-heading">
              Supports multiple subjects
            </h2>
            <p className="mt-4 text-muted-foreground">
              Teazy AI handles subject-specific formatting — properly rendered
              maths equations, labelled science diagrams and structured
              language lessons.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {SUBJECTS.map((s) => (
              <span key={s} className="px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-secondary/40">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy font-heading">How it works</h2>
            <p className="mt-4 text-muted-foreground">
              Three simple steps from blank page to classroom-ready material.
            </p>
          </div>
          <ol className="mt-12 grid md:grid-cols-3 gap-6">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="rounded-2xl bg-card border border-border p-6 relative">
                <span className="absolute -top-3 -left-3 h-9 w-9 rounded-full bg-accent text-accent-foreground font-bold flex items-center justify-center shadow">
                  {i + 1}
                </span>
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 text-lg font-semibold font-heading">{title}</h3>
                <p className="mt-2 text-muted-foreground text-sm">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-20 bg-background">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy font-heading">
              Trusted by teachers across Africa
            </h2>
            <p className="mt-4 text-muted-foreground">
              Early feedback from teachers using Teazy AI in real classrooms.
            </p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-border bg-card p-6">
                <blockquote className="text-foreground italic">“{t.quote}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-secondary/40">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy font-heading">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-muted-foreground">
              Everything teachers ask before getting started with Teazy AI.
            </p>
          </div>
          <Accordion type="single" collapsible className="mt-10 bg-card rounded-2xl border border-border px-6">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FREE VS PREMIUM */}
      <section id="pricing" className="py-20 bg-background">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-navy font-heading">
              What's free, what's premium
            </h2>
            <p className="mt-4 text-muted-foreground">
              Core lesson generation stays free. Only pay when you need
              downloads or additional writing assessments.
            </p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <article className="rounded-2xl border border-border bg-card p-8">
              <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Free</div>
              <h3 className="mt-1 text-2xl font-bold text-navy font-heading">₦0 — Generate &amp; copy</h3>
              <p className="text-xs text-muted-foreground">0 CFA · KSh 0</p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Generate lesson notes",
                  "Generate quizzes",
                  "Copy generated content",
                  "2 free writing assessments",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-lg bg-secondary/60 border border-border p-4 text-sm">
                <div className="font-semibold text-foreground">Pay-per-download</div>
                <p className="mt-1 text-muted-foreground text-xs">
                  Unlock editing + PDF + Word for a single lesson note for{" "}
                  <span className="font-semibold text-foreground">₦500</span>{" "}
                  <span className="text-muted-foreground">(500 CFA · KSh 45)</span>.
                </p>
              </div>
            </article>
            <article className="rounded-2xl border-2 border-accent bg-card p-8 relative">
              <span className="absolute -top-3 right-6 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
                Best for active teachers
              </span>
              <div className="text-sm font-semibold uppercase tracking-wide text-accent">Pro</div>
              <h3 className="mt-1 text-2xl font-bold text-navy font-heading">₦2,000/month</h3>
              <p className="text-xs text-muted-foreground">2,000 CFA/month · KSh 180/month</p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Unlimited editing",
                  "Unlimited PDF downloads",
                  "Unlimited Word downloads",
                  "Unlimited writing assessments",
                  "Priority access",
                  "No individual unlock fees",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth?next=/account">
                  <Sparkles className="mr-2 h-4 w-4" /> Subscribe
                </Link>
              </Button>
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Designed to remain affordable for teachers across Nigeria, Ghana and Kenya.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-navy text-navy-foreground">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <GraduationCap className="h-10 w-10 mx-auto text-accent" />
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold font-heading">
            Your AI teaching assistant for African classrooms
          </h2>
          <p className="mt-4 text-navy-foreground/80">
            Generate curriculum-aligned lesson notes, quizzes and writing
            assessments for Nigeria, Ghana and Kenya — built for real
            classroom instruction.
          </p>
          <Button asChild size="lg" className="mt-7 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app">
              Launch Teazy AI <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
