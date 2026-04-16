import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PenLine, Upload, Camera, X, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CURRICULA = ["Nigeria (NERDC)", "Ghana", "Kenya"];

const CLASS_OPTIONS: Record<string, string[]> = {
  "Nigeria (NERDC)": [
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3",
  ],
  "Kenya": [
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
    "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
  ],
  "Ghana": [
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JHS 1", "JHS 2", "JHS 3", "SHS 1", "SHS 2", "SHS 3",
  ],
};

const CURRICULUM_HINTS: Record<string, string> = {
  "Nigeria (NERDC)": "You are using the Nigerian NERDC curriculum structure",
  "Kenya": "You are using Kenya CBC (Competency-Based Curriculum) structure",
  "Ghana": "You are using the Ghana Education Service structure",
};

const WRITING_TYPES = ["Narrative", "Descriptive", "Argumentative", "Letter Writing"];
const LANGUAGES = ["English", "French"];

const OCR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-handwriting`;

export interface WritingAssessmentFormData {
  curriculum: string;
  classLevel: string;
  writingType: string;
  studentWriting: string;
  language: string;
}

interface Props {
  onAssess: (data: WritingAssessmentFormData) => void;
  isLoading: boolean;
}

export default function WritingAssessmentForm({ onAssess, isLoading }: Props) {
  const [form, setForm] = useState<WritingAssessmentFormData>({
    curriculum: "",
    classLevel: "",
    writingType: "",
    studentWriting: "",
    language: "English",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const canSubmit = form.curriculum && form.classLevel && form.writingType && form.studentWriting.trim().length > 20;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onAssess(form);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image (JPG, PNG).", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 10MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setOcrDone(false);

      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type;

      setIsOcrLoading(true);
      try {
        const resp = await fetch(OCR_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "OCR failed" }));
          toast({ title: "OCR Error", description: err.error, variant: "destructive" });
          return;
        }

        const data = await resp.json();
        const text = data.extractedText || "";

        if (text === "[UNREADABLE]" || text.length < 5) {
          toast({
            title: "Hard to read",
            description: "The handwriting was difficult to read. Please type or correct the text manually.",
            variant: "destructive",
          });
          setForm((prev) => ({ ...prev, studentWriting: "" }));
        } else {
          setForm((prev) => ({ ...prev, studentWriting: text }));
          toast({ title: "Text extracted!", description: "Review and correct any errors before grading." });
        }
        setOcrDone(true);
      } catch (err) {
        console.error(err);
        toast({ title: "Error", description: "Failed to extract text from image.", variant: "destructive" });
      } finally {
        setIsOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = "";
  };

  const clearImage = () => {
    setImagePreview(null);
    setOcrDone(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wa-curriculum">Curriculum *</Label>
          <Select value={form.curriculum} onValueChange={(v) => setForm({ ...form, curriculum: v, classLevel: "" })}>
            <SelectTrigger id="wa-curriculum">
              <SelectValue placeholder="Select curriculum" />
            </SelectTrigger>
            <SelectContent>
              {CURRICULA.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wa-class">Class / Grade *</Label>
          <Select
            value={form.classLevel}
            onValueChange={(v) => setForm({ ...form, classLevel: v })}
            disabled={!form.curriculum}
          >
            <SelectTrigger id="wa-class">
              <SelectValue placeholder={form.curriculum ? "Select class" : "Select curriculum first"} />
            </SelectTrigger>
            <SelectContent>
              {(CLASS_OPTIONS[form.curriculum] || []).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.curriculum && (
            <p className="text-xs text-accent font-medium">{CURRICULUM_HINTS[form.curriculum]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wa-type">Writing Type *</Label>
          <Select value={form.writingType} onValueChange={(v) => setForm({ ...form, writingType: v })}>
            <SelectTrigger id="wa-type">
              <SelectValue placeholder="Select writing type" />
            </SelectTrigger>
            <SelectContent>
              {WRITING_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wa-language">Language *</Label>
          <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
            <SelectTrigger id="wa-language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="space-y-3">
        <Label>Upload Handwritten Essay (Optional)</Label>
        <div className="border-2 border-dashed border-border rounded-xl p-4 bg-muted/30">
          {imagePreview ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Uploaded essay"
                  className="max-h-48 rounded-lg border border-border object-contain"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {isOcrLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  Reading handwriting...
                </div>
              )}
              {ocrDone && (
                <p className="text-xs text-green-600 font-medium">
                  ✓ Text extracted — review and correct below before grading
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Upload a clear photo of the student's handwritten essay
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG — max 10MB</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Student Writing Text */}
      <div className="space-y-2">
        <Label htmlFor="wa-writing">Student Writing * {ocrDone && <span className="text-xs text-muted-foreground font-normal">(extracted from image — edit if needed)</span>}</Label>
        <Textarea
          id="wa-writing"
          placeholder="Paste the student's writing here, or upload an image above... (minimum 20 characters)"
          value={form.studentWriting}
          onChange={(e) => setForm({ ...form, studentWriting: e.target.value })}
          className="min-h-[180px]"
        />
        <p className="text-xs text-muted-foreground">
          {form.studentWriting.length} characters
        </p>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit || isLoading || isOcrLoading}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base h-12"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Assessing Writing...
          </>
        ) : (
          <>
            <PenLine className="mr-2 h-5 w-5" />
            Grade Essay
          </>
        )}
      </Button>
    </form>
  );
}
