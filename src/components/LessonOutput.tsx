import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, CheckCircle, FileText, Pencil, Save, Lock, BadgeCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import QuizSection from "./QuizSection";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements, sha256Hex, type EntitlementKind } from "@/hooks/useEntitlements";
import PaywallModal from "./PaywallModal";

interface LessonOutputProps {
  content: string;
  language: string;
  images?: string[];
  imagesLoading?: boolean;
  subject?: string;
  topic?: string;
}

export default function LessonOutput({
  content,
  language,
  images = [],
  imagesLoading = false,
  subject = "",
  topic = "",
}: LessonOutputProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [exporting, setExporting] = useState(false);
  const [lessonHash, setLessonHash] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<{ open: boolean; purpose: EntitlementKind }>({
    open: false,
    purpose: "download_pdf",
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) setEditedContent(content);
  }, [content, editing]);

  useEffect(() => {
    if (content) sha256Hex(content).then(setLessonHash);
  }, [content]);

  const { proActive, unlockedKinds, loading: entLoading, refresh } = useEntitlements(lessonHash);

  const activeContent = editing ? editedContent : content;

  const canEdit = proActive || unlockedKinds.has("edit_unlock");
  const canPdf = proActive || unlockedKinds.has("download_pdf");
  const canDocx = proActive || unlockedKinds.has("download_docx");

  const requirePaywall = (purpose: EntitlementKind) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Create an account to unlock this feature.",
      });
      window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setPaywall({ open: true, purpose });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    toast({ title: "Copied!", description: "Lesson note copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditClick = () => {
    if (editing) {
      setEditing(false);
      return;
    }
    if (!canEdit) {
      requirePaywall("edit_unlock");
      return;
    }
    setEditing(true);
  };

  const handleDownloadPDF = async () => {
    if (!canPdf) return requirePaywall("download_pdf");
    if (!ref.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${(topic || "lesson-note").replace(/\s+/g, "-")}.pdf`);
      toast({ title: "Downloaded!", description: "Lesson note saved as PDF." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to export PDF.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const fetchImageAsBuffer = async (url: string): Promise<ArrayBuffer | null> => {
    try {
      const r = await fetch(url);
      return await r.arrayBuffer();
    } catch {
      return null;
    }
  };

  const handleDownloadWord = async () => {
    if (!canDocx) return requirePaywall("download_docx");
    setExporting(true);
    try {
      const lines = activeContent.split("\n");
      const children: Paragraph[] = [];

      for (const raw of lines) {
        const line = raw;
        if (line.startsWith("# ")) {
          children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }));
        } else if (line.startsWith("## ")) {
          children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
        } else if (line.startsWith("### ")) {
          children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }));
        } else if (line.startsWith("- ")) {
          children.push(new Paragraph({ text: line.slice(2), bullet: { level: 0 } }));
        } else if (/^\d+\.\s/.test(line)) {
          children.push(new Paragraph({ text: line.replace(/^\d+\.\s/, ""), bullet: { level: 0 } }));
        } else if (line.trim() === "") {
          children.push(new Paragraph({ text: "" }));
        } else {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          const runs = parts.map((p, i) => new TextRun({ text: p, bold: i % 2 === 1 }));
          children.push(new Paragraph({ children: runs }));
        }
      }

      if (images.length > 0) {
        children.push(new Paragraph({ text: "" }));
        children.push(new Paragraph({ text: "Visual Teaching Aids", heading: HeadingLevel.HEADING_2 }));
        for (const url of images) {
          const buf = await fetchImageAsBuffer(url);
          if (!buf) continue;
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({ data: buf, transformation: { width: 500, height: 320 }, type: "png" }),
              ],
            }),
          );
          children.push(new Paragraph({ text: "" }));
        }
      }

      const doc = new DocxDocument({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${(topic || "lesson-note").replace(/\s+/g, "-")}.docx`);
      toast({ title: "Downloaded!", description: "Lesson note saved as Word document." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to export Word document.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Unicode fallback for trivial LaTeX when KaTeX fails
  const unicodeFallback = (s: string): string => {
    return s
      .replace(/\\circ/g, "°")
      .replace(/\\times/g, "×")
      .replace(/\\div/g, "÷")
      .replace(/\\pm/g, "±")
      .replace(/\\pi/g, "π")
      .replace(/\\theta/g, "θ")
      .replace(/\\Delta/g, "Δ")
      .replace(/\\angle/g, "∠")
      .replace(/\\sqrt\{([^}]*)\}/g, "√($1)")
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
      .replace(/\^\{([^}]*)\}/g, "^$1")
      .replace(/_\{([^}]*)\}/g, "_$1");
  };

  const SafeInlineMath = ({ value }: { value: string }) => (
    <InlineMath
      math={value}
      renderError={() => <code className="text-sm">{unicodeFallback(value)}</code>}
      settings={{ throwOnError: false, strict: false } as any}
    />
  );

  const SafeBlockMath = ({ value }: { value: string }) => (
    <BlockMath
      math={value}
      renderError={() => <code className="text-sm">{unicodeFallback(value)}</code>}
      settings={{ throwOnError: false, strict: false } as any}
    />
  );

  const renderInline = (text: string, keyPrefix = "") => {
    const segments: { type: "text" | "math"; value: string }[] = [];
    const regex = /\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIdx) segments.push({ type: "text", value: text.slice(lastIdx, m.index) });
      segments.push({ type: "math", value: (m[1] ?? m[2] ?? "").trim() });
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < text.length) segments.push({ type: "text", value: text.slice(lastIdx) });

    return segments.map((seg, i) => {
      if (seg.type === "math") {
        return <SafeInlineMath key={`${keyPrefix}m${i}`} value={seg.value} />;
      }
      const parts = seg.value.split(/\*\*(.*?)\*\*/g);
      return parts.map((p, j) =>
        j % 2 === 1 ? (
          <strong key={`${keyPrefix}b${i}-${j}`}>{p}</strong>
        ) : (
          <span key={`${keyPrefix}t${i}-${j}`}>{p}</span>
        ),
      );
    });
  };

  const renderContent = (text: string) => {
    const lines = text.split("\n");
    const out: JSX.Element[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      const isDollarBlock = trimmed.startsWith("$$");
      const isBracketBlock = trimmed.startsWith("\\[");
      if (isDollarBlock || isBracketBlock) {
        const openLen = 2;
        const closeToken = isDollarBlock ? "$$" : "\\]";
        const collected: string[] = [];
        let inner = trimmed.slice(openLen);
        if (inner.endsWith(closeToken)) {
          collected.push(inner.slice(0, -closeToken.length));
        } else {
          if (inner) collected.push(inner);
          i++;
          while (i < lines.length && !lines[i].trim().endsWith(closeToken)) {
            collected.push(lines[i]);
            i++;
          }
          if (i < lines.length) {
            const last = lines[i].trim();
            collected.push(last.slice(0, -closeToken.length));
          }
        }
        const math = collected.join("\n").trim();
        out.push(
          <div key={`bm-${i}`} className="my-4 p-4 bg-primary/5 border-l-4 border-primary rounded overflow-x-auto">
            <SafeBlockMath value={math} />
          </div>,
        );
        i++;
        continue;
      }

      if (line.startsWith("# ")) {
        out.push(<h2 key={i} className="text-xl font-bold text-navy mt-6 mb-2 font-heading">{renderInline(line.slice(2), `h${i}`)}</h2>);
      } else if (line.startsWith("## ")) {
        out.push(<h3 key={i} className="text-lg font-semibold text-navy mt-5 mb-1 font-heading">{renderInline(line.slice(3), `h${i}`)}</h3>);
      } else if (line.startsWith("### ")) {
        out.push(<h4 key={i} className="text-base font-semibold mt-3 mb-1">{renderInline(line.slice(4), `h${i}`)}</h4>);
      } else if (line.startsWith("- ")) {
        out.push(<li key={i} className="ml-5 list-disc text-foreground/90">{renderInline(line.slice(2), `l${i}`)}</li>);
      } else if (/^\d+\.\s/.test(line)) {
        out.push(<li key={i} className="ml-5 list-decimal text-foreground/90">{renderInline(line.replace(/^\d+\.\s/, ""), `l${i}`)}</li>);
      } else if (line.trim() === "") {
        out.push(<div key={i} className="h-2" />);
      } else {
        out.push(<p key={i} className="text-foreground/90 leading-relaxed">{renderInline(line, `p${i}`)}</p>);
      }
      i++;
    }
    return out;
  };

  const LockIcon = () => <Lock className="mr-2 h-4 w-4" />;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="lesson" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="lesson" className="flex-1">Lesson Note</TabsTrigger>
          <TabsTrigger value="quiz" className="flex-1">Quiz</TabsTrigger>
        </TabsList>

        <TabsContent value="lesson">
          {proActive && (
            <div className="mb-3 flex items-center gap-2 text-sm bg-success/10 text-success rounded-lg px-3 py-2 w-fit">
              <BadgeCheck className="h-4 w-4" /> Pro Active — unlimited editing & downloads
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-end mb-4">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleEditClick} disabled={entLoading}>
              {editing ? (
                <><Save className="mr-2 h-4 w-4" /> Done Editing</>
              ) : canEdit ? (
                <><Pencil className="mr-2 h-4 w-4" /> Edit</>
              ) : (
                <><LockIcon /> Edit</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={exporting || entLoading}
              className="border-accent text-accent hover:bg-accent/10"
            >
              {canPdf ? <Download className="mr-2 h-4 w-4" /> : <LockIcon />}
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadWord}
              disabled={exporting || entLoading}
              className="border-primary text-primary hover:bg-primary/10"
            >
              {canDocx ? <FileText className="mr-2 h-4 w-4" /> : <LockIcon />}
              Download Word
            </Button>
          </div>

          {editing && canEdit ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[600px] font-mono text-sm"
            />
          ) : (
            <div
              ref={ref}
              className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm prose-sm max-w-none"
            >
              {renderContent(activeContent)}

              {(imagesLoading || images.length > 0) && (
                <div className="mt-8 pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold text-navy mb-4 font-heading">Visual Teaching Aids</h3>
                  {imagesLoading && images.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="aspect-video rounded-lg bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {images.map((src, i) => (
                        <figure key={i} className="space-y-2">
                          <img
                            src={src}
                            alt={`${topic} diagram ${i + 1}`}
                            crossOrigin="anonymous"
                            className="w-full aspect-video object-cover rounded-lg border border-border"
                            loading="lazy"
                          />
                          <figcaption className="text-xs text-muted-foreground text-center">
                            {topic} — Visual {i + 1}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quiz">
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
            <QuizSection lessonContent={activeContent} language={language} />
          </div>
        </TabsContent>
      </Tabs>

      <PaywallModal
        open={paywall.open}
        onClose={() => setPaywall({ ...paywall, open: false })}
        purpose={paywall.purpose}
        lessonHash={lessonHash}
        onSuccess={refresh}
      />
    </div>
  );
}
