import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin } from "lucide-react";
import { submitAppointmentRequest } from "@/lib/api/cms.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_public/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact TryCare360" },
      { name: "description", content: "Get in touch with the TryCare360 team. We reply within one business day." },
      { property: "og:title", content: "Contact TryCare360" },
      { property: "og:description", content: "Get in touch with the TryCare360 team." },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/contact" }],
  }),
});

// Fallback tenant used for anonymous submissions when the CMS site row isn't present.
// Admins can point their CMS site at their real tenant; the appointment insert policy accepts any tenant.
const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000000";

function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const submit = useServerFn(submitAppointmentRequest);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSubmitting(true);
    try {
      await submit({
        data: {
          tenant_id: DEFAULT_TENANT,
          full_name: String(fd.get("name") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          email: String(fd.get("email") ?? ""),
          message: String(fd.get("message") ?? ""),
          source: "contact",
        },
      });
      toast.success("Thanks — we'll reach out shortly.");
      form.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 lg:px-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">We're here</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Talk to us</h1>
        <p className="mt-4 text-muted-foreground">
          Questions about treatments, franchises, or careers? Send a message and we'll reply within one business day.
        </p>
        <div className="mt-8 space-y-4 text-sm">
          <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary" /> hello@trycare360.com</div>
          <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-primary" /> +91 00000 00000</div>
          <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary" /> India · Global</div>
        </div>
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
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" rows={5} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Sending…" : "Send message"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
