import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export interface HubTool { name: string; desc: string; to?: string }
export interface HubGroup { title: string; tools: HubTool[] }

export default function SectionHub({ title, intro, groups, other }: {
  title: string; intro: string; groups: HubGroup[]; other: { to: string; label: string };
}) {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Helmet><title>{title} | Teazy AI</title></Helmet>
      <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">{title}</h1>
      <p className="text-muted-foreground mt-1 max-w-2xl">{intro}</p>
      {groups.map((g) => (
        <section key={g.title} className="mt-8">
          <h2 className="text-lg font-semibold text-navy">{g.title}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.tools.map((t) => {
              const body = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-navy">{t.name}</span>
                    {!t.to && <span className="text-xs rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">Coming soon</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                </>
              );
              return t.to ? (
                <Link key={t.name} to={t.to} className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition">{body}</Link>
              ) : (
                <div key={t.name} className="rounded-xl border border-dashed border-border bg-card/60 p-4">{body}</div>
              );
            })}
          </div>
        </section>
      ))}
      <p className="mt-10 text-sm text-muted-foreground">
        Looking for something else? Visit <Link to={other.to} className="text-primary underline">{other.label}</Link> or open <Link to="/app/workspace" className="text-primary underline">My Workspace</Link> for everything you have saved.
      </p>
    </div>
  );
}
