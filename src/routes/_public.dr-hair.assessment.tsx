import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Upload, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { loadAnswers, saveAnswers, PHOTO_SLOTS, type AssessmentAnswers } from "@/lib/dr-hair/mock";
import { SectionHeader } from "@/components/dr-hair/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_public/dr-hair/assessment")({
  head: () => ({
    meta: [
      { title: "Free Hair Assessment — Dr Hair" },
      { name: "description", content: "25-question dermatologist-designed hair assessment powered by AI." },
    ],
  }),
  component: AssessmentPage,
});

interface Question {
  key: keyof AssessmentAnswers;
  label: string;
  kind: "text" | "select" | "multi" | "number";
  options?: string[];
}

const STEPS: { title: string; questions: Question[] }[] = [
  {
    title: "Personal Details",
    questions: [
      { key: "fullName", label: "Full name", kind: "text" },
      { key: "age", label: "Age", kind: "number" },
      { key: "gender", label: "Gender", kind: "select", options: ["male", "female", "other"] },
      { key: "city", label: "City", kind: "text" },
    ],
  },
  {
    title: "Hair Condition",
    questions: [
      { key: "hairType", label: "Hair type", kind: "select", options: ["straight", "wavy", "curly", "coily"] },
      { key: "hairFallMonths", label: "Months of hair fall", kind: "select", options: ["<3", "3-6", "6-12", "12+"] },
      { key: "hairFallSeverity", label: "Severity (1 mild → 5 severe)", kind: "select", options: ["1", "2", "3", "4", "5"] },
      { key: "scalpType", label: "Scalp type", kind: "select", options: ["dry", "oily", "combination", "normal"] },
      { key: "dandruff", label: "Dandruff", kind: "select", options: ["yes", "no"] },
      { key: "thinningArea", label: "Thinning areas (select all)", kind: "multi", options: ["hairline", "crown", "temples", "overall"] },
    ],
  },
  {
    title: "Lifestyle",
    questions: [
      { key: "sleepHours", label: "Average sleep hours", kind: "select", options: ["<5", "5", "6", "7", "8+"] },
      { key: "stressLevel", label: "Stress level (1–5)", kind: "select", options: ["1", "2", "3", "4", "5"] },
      { key: "smoking", label: "Do you smoke?", kind: "select", options: ["yes", "no"] },
      { key: "waterIntake", label: "Water intake (L/day)", kind: "select", options: ["<1", "1-2", "2-3", "3+"] },
      { key: "exercise", label: "Exercise per week", kind: "select", options: ["none", "1-2", "3-4", "5+"] },
    ],
  },
  {
    title: "Nutrition",
    questions: [
      { key: "diet", label: "Diet type", kind: "select", options: ["vegan", "vegetarian", "eggetarian", "non-veg"] },
      { key: "proteinIntake", label: "Daily protein intake", kind: "select", options: ["low", "medium", "high"] },
      { key: "supplements", label: "Currently take supplements?", kind: "select", options: ["yes", "no"] },
      { key: "junkFood", label: "Junk food frequency", kind: "select", options: ["rarely", "weekly", "daily"] },
    ],
  },
  {
    title: "Medical History",
    questions: [
      { key: "thyroid", label: "Thyroid condition?", kind: "select", options: ["yes", "no"] },
      { key: "pcos", label: "PCOS / hormonal issues?", kind: "select", options: ["yes", "no", "n/a"] },
      { key: "medications", label: "Any long-term medications?", kind: "text" },
      { key: "familyHistory", label: "Family history of hair loss?", kind: "select", options: ["yes", "no"] },
    ],
  },
  {
    title: "Hair Goals",
    questions: [
      { key: "primaryGoal", label: "Primary goal", kind: "select", options: ["stop hair fall", "regrow density", "scalp health", "overall shine"] },
      { key: "budget", label: "Monthly budget", kind: "select", options: ["<₹3k", "₹3k–7k", "₹7k+"] },
      { key: "timeCommitment", label: "Time you can commit daily", kind: "select", options: ["<5 min", "5–10 min", "10+ min"] },
    ],
  },
];

function AssessmentPage() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<AssessmentAnswers>(loadAnswers());
  const [step, setStep] = useState(0);

  useEffect(() => {
    saveAnswers(answers);
  }, [answers]);

  const totalSteps = STEPS.length + 1; // + photos
  const progress = Math.round(((step + 1) / totalSteps) * 100);

  const isPhotoStep = step === STEPS.length;
  const currentStep = STEPS[step];

  const canProceed = useMemo(() => {
    if (isPhotoStep) return Object.keys(answers.photos).length >= 2;
    return currentStep.questions.every((q) => {
      const v = answers[q.key];
      if (q.kind === "multi") return Array.isArray(v) && v.length > 0;
      return typeof v === "string" && v.length > 0;
    });
  }, [answers, currentStep, isPhotoStep]);

  function setValue<K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function onFile(slot: string, file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setAnswers((a) => ({ ...a, photos: { ...a.photos, [slot]: String(reader.result) } }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <SectionHeader eyebrow={`Step ${step + 1} of ${totalSteps}`} title="Your Hair Assessment" subtitle="Takes ~4 minutes. Autosaved as you go." />

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-[color:var(--dh-primary)] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 text-xs font-semibold uppercase tracking-wider text-[color:var(--dh-primary)]">
            {isPhotoStep ? "Photo Upload" : currentStep.title}
          </div>

          {isPhotoStep ? (
            <div>
              <p className="mb-6 text-sm text-muted-foreground">
                Upload at least 2 photos so our AI can analyze density, hairline and scalp condition.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PHOTO_SLOTS.map((s) => {
                  const url = answers.photos[s.key];
                  return (
                    <label
                      key={s.key}
                      className={cn(
                        "group relative flex aspect-[4/5] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-3 text-center transition-colors",
                        url ? "border-[color:var(--dh-primary)] bg-[color:var(--dh-primary-soft)]" : "border-muted-foreground/30 hover:border-[color:var(--dh-primary)]",
                      )}
                    >
                      {url ? (
                        <img src={url} alt={s.label} className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <>
                          <Camera className="mb-2 h-6 w-6 text-muted-foreground" />
                          <div className="text-sm font-medium">{s.label}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">{s.hint}</div>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => e.target.files && onFile(s.key, e.target.files[0])}
                      />
                      {url && (
                        <div className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[color:var(--dh-primary)] text-white">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Upload className="h-3.5 w-3.5" /> Photos are stored locally in your browser for this demo.
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {currentStep.questions.map((q) => (
                <div key={q.key}>
                  <Label className="mb-2 block text-sm">{q.label}</Label>
                  {q.kind === "text" || q.kind === "number" ? (
                    <Input
                      type={q.kind === "number" ? "number" : "text"}
                      value={(answers[q.key] as string) || ""}
                      onChange={(e) => setValue(q.key, e.target.value as never)}
                    />
                  ) : q.kind === "select" ? (
                    <div className="flex flex-wrap gap-2">
                      {q.options!.map((opt) => {
                        const active = answers[q.key] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setValue(q.key, opt as never)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs capitalize transition-colors",
                              active
                                ? "border-[color:var(--dh-primary)] bg-[color:var(--dh-primary)] text-white"
                                : "border-input hover:border-[color:var(--dh-primary)]",
                            )}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {q.options!.map((opt) => {
                        const arr = (answers[q.key] as string[]) || [];
                        const active = arr.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const next = active ? arr.filter((x) => x !== opt) : [...arr, opt];
                              setValue(q.key, next as never);
                            }}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs capitalize transition-colors",
                              active
                                ? "border-[color:var(--dh-primary)] bg-[color:var(--dh-primary)] text-white"
                                : "border-input hover:border-[color:var(--dh-primary)]",
                            )}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {isPhotoStep ? (
          <Button
            onClick={() => navigate({ to: "/dr-hair/analysis" })}
            disabled={!canProceed}
            className="bg-[color:var(--dh-primary)] text-white hover:bg-[color:var(--dh-primary)]/90"
          >
            Generate AI Report <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed}
            className="bg-[color:var(--dh-primary)] text-white hover:bg-[color:var(--dh-primary)]/90"
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
