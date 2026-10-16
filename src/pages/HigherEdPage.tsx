import SectionHub from "@/components/SectionHub";

export default function HigherEdPage() {
  return (
    <SectionHub
      title="Higher Ed"
      intro="Tools for university lecturers, college instructors and other higher education educators."
      other={{ to: "/k12", label: "K12" }}
      groups={[
        { title: "Assess", tools: [
          { name: "Writing assessment", desc: "Mark scripts against your own marking scheme and question paper.", to: "/app/writing?for=higher-ed" },
          { name: "Bulk script marking", desc: "Upload a whole class of scripts and review results together.", to: "/app/writing/bulk?for=higher-ed" },
          { name: "Quiz generator", desc: "Quizzes and test questions with answer keys.", to: "/app/quiz" },
          { name: "Rubric generator", desc: "Marking rubrics for essays, projects and presentations.", to: "/app/higher-ed/rubric" },
        ]},
        { title: "Teach", tools: [
          { name: "Presentation slides", desc: "Lecture slides with speaker notes, downloadable as PowerPoint.", to: "/app/higher-ed/slides" },
        ]},
      ]}
    />
  );
}
