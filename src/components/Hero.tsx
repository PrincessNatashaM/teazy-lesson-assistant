import { useEffect, useState } from "react";

const SLIDES = [
  {
    title: "Create Detailed Lesson Notes in Seconds",
    subtitle: "Fill in a few details and let AI generate a complete, classroom-ready lesson note aligned to your curriculum.",
  },
  {
    title: "Generate Classroom-Ready Quizzes Instantly",
    subtitle: "Turn any topic into engaging quizzes with answers in seconds.",
  },
  {
    title: "Grade Student Writing with AI Support",
    subtitle: "Upload handwritten essays and get structured feedback instantly.",
  },
  {
    title: "Save Hours on Teaching Preparation",
    subtitle: "Your AI-powered teaching assistant — built for African classrooms.",
  },
];

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 3500);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    const onInteract = () => {
      setPaused(true);
      window.clearTimeout((onInteract as any)._t);
      (onInteract as any)._t = window.setTimeout(() => setPaused(false), 8000);
    };
    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  const slide = SLIDES[index];

  return (
    <section className="text-center py-10 sm:py-14 px-4">
      <div key={index} className="animate-fade-in">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-primary font-heading leading-tight max-w-3xl mx-auto">
          {slide.title}
        </h2>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          {slide.subtitle}
        </p>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-accent" : "w-2 bg-border hover:bg-muted-foreground/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
