import SectionHub from "@/components/SectionHub";

export default function HigherEdPage() {
  return (
    <SectionHub
      title="Higher Ed"
      intro="Tools for university lecturers, college instructors and other higher education educators."
      other={{ to: "/k12", label: "K12" }}
      groups={[
        { title: "Assess", tools: [
          { name: "Writing assessment", desc: "Mark scripts against your own marking scheme. Choose Higher Education / University as the curriculum.", to: "/app/writing" },
          { name: "Bulk script marking", desc: "Upload a whole class of scripts and review results together.", to: "/app/writing/bulk" },
          { name: "Quiz generator", desc: "Quizzes and test questions with answer keys.", to: "/app/quiz" },
          { name: "Rubric generator", desc: "Marking rubrics for essays, projects and presentations." },
        ]},
        { title: "Teach", tools: [
          { name: "Presentation slides", desc: "Lecture slides from your topic or notes." },
          { name: "Course outline builder", desc: "Structure a course into weekly topics and outcomes." },
        ]},
      ]}
    />
  );
}
