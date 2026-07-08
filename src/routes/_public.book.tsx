import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { listTreatments, listDoctors, submitAppointmentRequest } from "@/lib/api/cms.functions";

const searchSchema = z.object({
  treatment: z.string().optional(),
  doctor: z.string().optional(),
});

export const Route = createFileRoute("/_public/book")({
  validateSearch: searchSchema.parse,
  component: BookPage,
  head: () => ({
    meta: [
      { title: "Book a consultation — TryCare360" },
      { name: "description", content: "Book a free consultation with a certified TryCare360 doctor." },
      { property: "og:title", content: "Book a consultation — TryCare360" },
      { property: "og:description", content: "Book a free consultation with a certified doctor." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/book" }],
  }),
});

const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000000";

function BookPage() {
  const search = Route.useSearch();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [treatmentSlug, setTreatmentSlug] = useState<string>(search.treatment ?? "");
  const [doctorSlug, setDoctorSlug] = useState<string>(search.doctor ?? "");

  const listT = useServerFn(listTreatments);
  const listD = useServerFn(listDoctors);
  const submit = useServerFn(submitAppointmentRequest);

  const { data: treatments = [] } = useQuery({ queryKey: ["book-treatments"], queryFn: () => listT() });
  const { data: doctors = [] } = useQuery({ queryKey: ["book-doctors"], queryFn: () => listD() });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await submit({
        data: {
          tenant_id: DEFAULT_TENANT,
          full_name: String(fd.get("name") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          email: String(fd.get("email") ?? ""),
          city: String(fd.get("city") ?? ""),
          treatment_slug: treatmentSlug || undefined,
          doctor_slug: doctorSlug || undefined,
          message: String(fd.get("message") ?? ""),
          source: "book",
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center lg:px-6">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Request received</h1>
        <p className="mt-3 text-muted-foreground">
          A care coordinator will call you within one business day to confirm your appointment.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 lg:px-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Book a consultation</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Start your care journey
        </h1>
        <p className="mt-4 text-muted-foreground">
          Tell us a little about you and we'll match you with the right specialist. Consultations are free and non-obligatory.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> Free 15-minute consultation</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> Personalised care plan</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" /> Board-certified specialists</li>
        </ul>
      </div>
      <Card className="p-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" />
            </div>
            <div className="space-y-2">
              <Label>Treatment</Label>
              <Select value={treatmentSlug} onValueChange={setTreatmentSlug}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  {treatments.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preferred doctor</Label>
            <Select value={doctorSlug} onValueChange={setDoctorSlug}>
              <SelectTrigger><SelectValue placeholder="Any specialist" /></SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Anything we should know?</Label>
            <Textarea id="message" name="message" rows={3} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full" size="lg">
            {submitting ? "Sending…" : "Request appointment"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By submitting, you agree to our privacy policy.
          </p>
        </form>
      </Card>
    </div>
  );
}
