import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_CODES: Record<string, string> = {
  hair: "hair_v1",
  skin: "skin_v1",
  nail: "nail_v1",
  nutrition: "nutrition_v1",
};

type Question = {
  id: string;
  label: string;
  type: "number" | "select" | "multi" | "boolean" | "slider" | "text";
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
};
type Section = { id: string; title: string; questions: Question[] };
type Definition = {
  code: string;
  name: string;
  category: string;
  sections: Section[];
  photo_slots: string[];
  requires_photos: boolean;
};

export const Route = createFileRoute("/_public/consultation/$category")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.category[0].toUpperCase() + params.category.slice(1)} Consultation | TryCare360` },
      { name: "description", content: `Free AI ${params.category} consultation — guided questions and personalized recommendations.` },
    ],
  }),
  beforeLoad: ({ params }) => {
    if (!CATEGORY_CODES[params.category]) throw notFound();
    return undefined as never;
  },
  component: Wizard,
});

async function api(action: string, body: unknown) {
  const res = await fetch(`/api/public/assessment/${action}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return res.json();
}

function Wizard() {
  const { category } = Route.useParams();
  const navigate = useNavigate();
  const code = CATEGORY_CODES[category]!;

  const [def, setDef] = useState<Definition | null>(null);
  const [token, setToken] = useState<string>("");
  const [step, setStep] = useState(0); // 0=intro, sections... photos, contact, review
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [contact, setContact] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    (async () => {
      const utm: Record<string, string> = {};
      new URLSearchParams(window.location.search).forEach((v, k) => { if (k.startsWith("utm_")) utm[k] = v; });
      const r = await api("start", { code, source: document.referrer || "direct", utm });
      if (!r.ok) { toast.error(r.error || "Could not start consultation"); return; }
      setToken(r.public_token);
      setDef(r.definition);
    })();
  }, [code]);

  const steps = useMemo(() => {
    if (!def) return [] as string[];
    const s = ["intro", ...def.sections.map((x) => `q:${x.id}`)];
    if (def.requires_photos && def.photo_slots.length) s.push("photos");
    s.push("contact");
    s.push("review");
    return s;
  }, [def]);

  const progress = steps.length ? Math.round((step / (steps.length - 1)) * 100) : 0;

  async function saveProgress(next: number) {
    if (!token) return;
    await api("save", { token, responses, progress, contact });
    setStep(next);
  }

  async function uploadPhoto(slot: string, file: File) {
    if (!token) return;
    setUploading(slot);
    try {
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const r = await api("photo", { token, slot, mime: file.type || "image/jpeg", base64: b64 });
      if (!r.ok) throw new Error(r.error || "upload failed");
      setUploaded((u) => ({ ...u, [slot]: true }));
      toast.success(`${slot} uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function submit() {
    if (!consent) { toast.error("Please accept the consent to continue"); return; }
    setSubmitting(true);
    await api("save", { token, responses, progress: 100, contact });
    const r = await api("submit", { token, consent: true });
    setSubmitting(false);
    if (!r.ok) { toast.error(r.error || "Submission failed"); return; }
    navigate({ to: "/consultation/result/$token", params: { token } });
  }

  if (!def) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Preparing your consultation…
        </div>
      </div>
    );
  }

  const kind = steps[step];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{def.name}</span>
        <span className="text-xs text-muted-foreground">Step {step + 1} of {steps.length}</span>
      </div>
      <Progress value={progress} className="mb-8 h-1.5" />

      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        {kind === "intro" && (
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI-powered analysis
            </div>
            <h1 className="text-2xl font-bold">{def.name}</h1>
            <p className="mt-3 text-muted-foreground">
              This takes about 3-5 minutes. Your answers are private and used only to generate your personalized plan.
            </p>
          </div>
        )}

        {kind?.startsWith("q:") && (() => {
          const sid = kind.slice(2);
          const section = def.sections.find((s) => s.id === sid)!;
          return (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.questions.map((q) => (
                <QuestionField key={q.id} q={q} value={responses[q.id]} onChange={(v) => setResponses((r) => ({ ...r, [q.id]: v }))} />
              ))}
            </div>
          );
        })()}

        {kind === "photos" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Photo upload</h2>
            <p className="text-sm text-muted-foreground">Photos are optional but greatly improve accuracy. They are stored privately and used only for your analysis.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {def.photo_slots.map((slot) => (
                <label key={slot} className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm transition ${uploaded[slot] ? "border-emerald-500/40 bg-emerald-500/5" : "hover:bg-muted/40"} cursor-pointer`}>
                  <div>
                    <div className="font-medium capitalize">{slot.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground">{uploaded[slot] ? "Uploaded ✓" : "Tap to upload"}</div>
                  </div>
                  {uploading === slot ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(slot, e.target.files[0])} />
                </label>
              ))}
            </div>
          </div>
        )}

        {kind === "contact" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Where should we send your plan?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Full name *</Label><Input value={contact.name ?? ""} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Phone *</Label><Input value={contact.phone ?? ""} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={contact.email ?? ""} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>City</Label><Input value={contact.city ?? ""} onChange={(e) => setContact((c) => ({ ...c, city: e.target.value }))} /></div>
            </div>
          </div>
        )}

        {kind === "review" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Almost done</h2>
            <p className="text-sm text-muted-foreground">By submitting you'll receive an AI-generated analysis and recommendations. This is not a medical diagnosis and does not replace clinical care.</p>
            <label className="flex items-start gap-3 rounded-xl border p-4 text-sm">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} />
              <span>I consent to TryCare360 processing my responses to generate my personalized consultation and to contact me about relevant treatments.</span>
            </label>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => saveProgress(Math.max(0, step - 1))}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {kind === "review" ? (
          <Button onClick={submit} disabled={submitting || !consent || !contact.name || !contact.phone}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Get my AI plan
          </Button>
        ) : (
          <Button onClick={() => saveProgress(Math.min(steps.length - 1, step + 1))}>
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function QuestionField({ q, value, onChange }: { q: Question; value: unknown; onChange: (v: unknown) => void }) {
  if (q.type === "number") return (
    <div className="space-y-1.5"><Label>{q.label}{q.required && " *"}</Label>
      <Input type="number" value={(value as number) ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)} />
    </div>
  );
  if (q.type === "text") return (
    <div className="space-y-1.5"><Label>{q.label}{q.required && " *"}</Label>
      <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
  if (q.type === "boolean") return (
    <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
      <Checkbox checked={Boolean(value)} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span>{q.label}</span>
    </label>
  );
  if (q.type === "slider") return (
    <div className="space-y-2"><Label>{q.label}: <span className="font-semibold">{(value as number) ?? q.min ?? 1}</span></Label>
      <Slider min={q.min ?? 1} max={q.max ?? 10} step={1} value={[(value as number) ?? (q.min ?? 1)]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
  if (q.type === "select") return (
    <div className="space-y-1.5"><Label>{q.label}{q.required && " *"}</Label>
      <div className="flex flex-wrap gap-2">
        {(q.options ?? []).map((opt) => (
          <button key={opt} type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${value === opt ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {opt.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
  if (q.type === "multi") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-1.5"><Label>{q.label}</Label>
        <div className="flex flex-wrap gap-2">
          {(q.options ?? []).map((opt) => {
            const on = arr.includes(opt);
            return (
              <button key={opt} type="button"
                onClick={() => onChange(on ? arr.filter((x) => x !== opt) : [...arr, opt])}
                className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {opt.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}
