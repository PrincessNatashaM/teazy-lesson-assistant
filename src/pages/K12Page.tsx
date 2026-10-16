import SectionHub from "@/components/SectionHub";

export default function K12Page() {
  return (
    <SectionHub
      title="K12"
      intro="Tools for primary and secondary school teachers, homeschooling parents and online teachers."
      other={{ to: "/higher-ed", label: "Higher Ed" }}
      groups={[
        { title: "Plan and teach", tools: [
          { name: "Lesson plan generator", desc: "Curriculum-aligned lesson plans for classroom or online teaching.", to: "/app" },
          { name: "Lesson notes", desc: "Full lesson notes ready to teach, saved automatically.", to: "/app" },
          { name: "Presentation slides", desc: "Turn a lesson into classroom slides." },
          { name: "Animated videos", desc: "Short animated explainers for your lessons." },
        ]},
        { title: "Practice and assess", tools: [
          { name: "Quiz generator", desc: "Curriculum-aligned quizzes with answer keys.", to: "/app/quiz" },
          { name: "Writing assessment", desc: "Mark handwritten or typed scripts, one at a time or in bulk.", to: "/app/writing" },
          { name: "Worksheet designer", desc: "Printable practice worksheets." },
          { name: "Rubric generator", desc: "Clear marking rubrics for any task." },
        ]},
      ]}
    />
  );
}
