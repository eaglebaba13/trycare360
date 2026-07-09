import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageContainer } from "@/components/app-shell";
import { WizardShell } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { createPerson } from "@/lib/identity/persons.functions";
import { quickSearchPersons } from "@/lib/identity/services.functions";
import { initials } from "@/lib/standards-format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/people/new")({
  component: NewPersonWizard,
});

interface FormState {
  full_name: string;
  first_name: string;
  last_name: string;
  gender: "male" | "female" | "other" | "unknown" | "";
  dob: string;
  phone: string;
  email: string;
  national_id: string;
  city: string;
  address_line: string;
  marketing_opt_in: boolean;
  service_opt_in: boolean;
  transactional_opt_in: boolean;
  role: "" | "patient" | "doctor" | "employee" | "lead";
}

const STEPS = [
  { id: "identity", label: "Identity", description: "Name, gender, DOB" },
  { id: "contact", label: "Contact", description: "Phone, email, ID" },
  { id: "address", label: "Address", description: "Primary address" },
  { id: "consent", label: "Consent", description: "Communication preferences" },
  { id: "role", label: "Role", description: "Attach a role" },
];

function NewPersonWizard() {
  const navigate = useNavigate();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<FormState>({
    full_name: "",
    first_name: "",
    last_name: "",
    gender: "",
    dob: "",
    phone: "",
    email: "",
    national_id: "",
    city: "",
    address_line: "",
    marketing_opt_in: false,
    service_opt_in: true,
    transactional_opt_in: true,
    role: "",
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  // Live duplicate preview based on phone/email/name
  const quickFn = useServerFn(quickSearchPersons);
  const dupQuery = f.phone || f.email || f.full_name;
  const dupQ = useQuery({
    queryKey: ["dup-preview", activeTenantId, dupQuery],
    queryFn: () =>
      quickFn({ data: { tenant_id: activeTenantId!, query: dupQuery, limit: 5 } }),
    enabled: !!activeTenantId && dupQuery.length >= 3,
  });

  const createFn = useServerFn(createPerson);
  const mut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          tenant_id: activeTenantId!,
          full_name: f.full_name,
          first_name: f.first_name || undefined,
          last_name: f.last_name || undefined,
          gender: (f.gender || undefined) as FormState["gender"] extends "" ? never : Exclude<FormState["gender"], "">,
          dob: f.dob || undefined,
          phone: f.phone || undefined,
          email: f.email || undefined,
          national_id: f.national_id || undefined,
          marketing_opt_in: f.marketing_opt_in,
          service_opt_in: f.service_opt_in,
          transactional_opt_in: f.transactional_opt_in,
        },
      }),
    onSuccess: (res) => {
      const id = res.person.id as string;
      toast.success(res.deduped ? "Existing person matched" : "Person created");
      navigate({ to: "/people/$personId", params: { personId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canProceed =
    step === 0 ? f.full_name.trim().length > 0 : step === 4 ? true : true;

  return (
    <PageContainer title="New person" description="Create a person in the Master Registry.">
      <WizardShell
        steps={STEPS}
        currentIndex={step}
        onStep={setStep}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        onFinish={() => mut.mutate()}
        canProceed={canProceed}
        isSubmitting={mut.isPending}
        finishLabel="Create person"
        sidebar={
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Live duplicate preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dupQuery.length < 3 && (
                <p className="text-xs text-muted-foreground">
                  Type a name, phone or email to check for existing matches.
                </p>
              )}
              {dupQ.data && dupQ.data.length === 0 && (
                <p className="text-xs text-muted-foreground">No probable matches.</p>
              )}
              {(dupQ.data ?? []).map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-md border p-2">
                  <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{initials(r.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.phone_e164 ?? r.email_normalized ?? r.id.slice(0, 8)}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">match</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        }
      >
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name *"><Input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
            <Field label="First name"><Input value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
            <Field label="Last name"><Input value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
            <Field label="Gender">
              <Select value={f.gender} onValueChange={(v) => set("gender", v as FormState["gender"])}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of birth"><Input type="date" value={f.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Phone"><Input placeholder="+91…" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="National ID (Aadhaar/PAN)"><Input value={f.national_id} onChange={(e) => set("national_id", e.target.value)} /></Field>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4">
            <Field label="Address line"><Input value={f.address_line} onChange={(e) => set("address_line", e.target.value)} /></Field>
            <Field label="City"><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <p className="text-xs text-muted-foreground">Address is captured post-create via the Addresses tab.</p>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={f.service_opt_in} onCheckedChange={(v) => set("service_opt_in", !!v)} />
              <div><div className="font-medium">Service communication</div><div className="text-muted-foreground text-xs">Appointment reminders, follow-ups.</div></div>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={f.transactional_opt_in} onCheckedChange={(v) => set("transactional_opt_in", !!v)} />
              <div><div className="font-medium">Transactional</div><div className="text-muted-foreground text-xs">Payments, receipts, OTPs.</div></div>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={f.marketing_opt_in} onCheckedChange={(v) => set("marketing_opt_in", !!v)} />
              <div><div className="font-medium">Marketing</div><div className="text-muted-foreground text-xs">Offers, campaigns, newsletters.</div></div>
            </label>
          </div>
        )}
        {step === 4 && (
          <div className="grid gap-4">
            <Field label="Attach role (optional)">
              <Select value={f.role} onValueChange={(v) => set("role", v as FormState["role"])}>
                <SelectTrigger><SelectValue placeholder="No role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <p className="text-xs text-muted-foreground">
              Roles are attached from the person profile after creation. Enterprise role wizards will be added in Stage G.
            </p>
          </div>
        )}
      </WizardShell>
    </PageContainer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
