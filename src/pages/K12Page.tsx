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
          { name: "Presentation slides", desc: "Classroom slides you can download as PowerPoint.", to: "/app/slides" },
          { name: "Animated videos", desc: "Narrated animated videos made from one sentence.", to: "/app/video" },
        ]},
        { title: "Practice and assess", tools: [
          { name: "Quiz generator", desc: "Curriculum-aligned quizzes with answer keys.", to: "/app/quiz" },
          { name: "Writing assessment", desc: "Mark handwritten or typed scripts, one at a time or in bulk.", to: "/app/writing" },
          { name: "Worksheet designer", desc: "Printable practice worksheets with an answer key.", to: "/app/worksheet" },
        ]},
      ]}
    />
  );
}
