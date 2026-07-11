import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, ChevronRight, Loader2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import {
  listServices,
  listResources,
  searchPersons,
} from "@/lib/scheduling/lists.functions";
import { findSlots } from "@/lib/scheduling/slots.functions";
import { bookAppointment } from "@/lib/scheduling/appointments.functions";

export const Route = createFileRoute("/_authenticated/scheduling/new")({
  component: WizardPage,
});

type Step = 1 | 2 | 3 | 4 | 5;
type Slot = {
  starts_at: string;
  ends_at: string;
  resource_id?: string | null;
  doctor_id?: string | null;
  room_resource_id?: string | null;
  duration_minutes?: number;
};

function WizardPage() {
  const { activeTenantId } = useTenant();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [person, setPerson] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const steps = [
    "Person",
    "Service",
    "Resource",
    "Slot",
    "Review",
  ] as const;

  return (
    <SchedulerShell
      title="Book Appointment"
      subtitle="Search person · pick service · resource · slot · confirm"
      branchId={branchId}
      onBranchChange={setBranchId}
    >
      <ol className="flex items-center gap-2 text-sm mb-4">
        {steps.map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label} className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full grid place-items-center text-xs ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "border-2 border-primary text-primary"
                      : "border text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span className={active ? "font-medium" : "text-muted-foreground"}>
                {label}
              </span>
              {i < steps.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardContent className="p-4 space-y-4">
          {step === 1 && (
            <StepPerson
              tenantId={activeTenantId!}
              value={person}
              onSelect={(p) => {
                setPerson(p);
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <StepService
              tenantId={activeTenantId!}
              serviceId={serviceId}
              duration={duration}
              onChange={(s, d) => {
                setServiceId(s);
                setDuration(d);
              }}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepResource
              tenantId={activeTenantId!}
              branchId={branchId}
              resourceId={resourceId}
              onChange={setResourceId}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <StepSlot
              tenantId={activeTenantId!}
              branchId={branchId}
              serviceId={serviceId!}
              doctorId={resourceId}
              duration={duration}
              slot={slot}
              onSelect={setSlot}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <StepReview
              tenantId={activeTenantId!}
              branchId={branchId!}
              personId={person?.id ?? ""}
              personLabel={person?.label ?? ""}
              serviceId={serviceId!}
              duration={duration}
              resourceId={resourceId}
              slot={slot!}
              onBack={() => setStep(4)}
              onBooked={(id) =>
                navigate({
                  to: "/scheduling/appointments/$appointmentId",
                  params: { appointmentId: id },
                })
              }
            />
          )}
        </CardContent>
      </Card>
    </SchedulerShell>
  );
}

function StepPerson({
  tenantId,
  value,
  onSelect,
}: {
  tenantId: string;
  value: { id: string; label: string } | null;
  onSelect: (p: { id: string; label: string }) => void;
}) {
  const [q, setQ] = useState("");
  const fn = useServerFn(searchPersons);
  const qry = useQuery({
    queryKey: ["wiz-persons", tenantId, q],
    queryFn: () => fn({ data: { tenant_id: tenantId, q } }),
    enabled: q.length >= 2,
  });
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-8"
          placeholder="Search by name, phone, or email"
        />
      </div>
      {value && (
        <div className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{value.label}</span>
        </div>
      )}
      <ul className="divide-y border rounded">
        {(qry.data?.rows ?? []).map((p) => {
          const label =
            (p.display_name as string) ||
            (p.full_name as string) ||
            (p.phone_e164 as string) ||
            "Person";
          return (
            <li key={p.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted flex justify-between"
                onClick={() => onSelect({ id: p.id, label })}
              >
                <span>{label}</span>
                <span className="text-xs text-muted-foreground">
                  {(p.phone_e164 as string | null) ??
                    (p.email_normalized as string | null) ??
                    ""}
                </span>
              </button>
            </li>
          );
        })}
        {q.length >= 2 && (qry.data?.rows ?? []).length === 0 && !qry.isLoading && (
          <li className="px-3 py-2 text-sm text-muted-foreground">No matches.</li>
        )}
      </ul>
    </div>
  );
}

function StepService({
  tenantId,
  serviceId,
  duration,
  onChange,
  onNext,
  onBack,
}: {
  tenantId: string;
  serviceId: string | null;
  duration: number;
  onChange: (id: string, dur: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const fn = useServerFn(listServices);
  const q = useQuery({
    queryKey: ["wiz-services", tenantId],
    queryFn: () => fn({ data: { tenant_id: tenantId, active_only: true } }),
  });
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-auto">
        {(q.data?.rows ?? []).map((s) => {
          const dur = (s.duration_minutes as number | null) ?? 30;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id, dur)}
              className={`text-left border rounded p-3 hover:bg-muted ${
                serviceId === s.id ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">{dur} min</div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {serviceId ? `Duration: ${duration} min` : "Select a service"}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={onNext} disabled={!serviceId}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function StepResource({
  tenantId,
  branchId,
  resourceId,
  onChange,
  onNext,
  onBack,
}: {
  tenantId: string;
  branchId: string | null;
  resourceId: string | null;
  onChange: (id: string | null) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const fn = useServerFn(listResources);
  const q = useQuery({
    queryKey: ["wiz-res", tenantId, branchId],
    queryFn: () =>
      fn({ data: { tenant_id: tenantId, branch_id: branchId!, include_shared: true } }),
    enabled: !!branchId,
  });
  if (!branchId)
    return (
      <div className="text-sm text-muted-foreground">
        Pick a branch in the header first.
      </div>
    );
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-auto">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`text-left border rounded p-3 hover:bg-muted ${
            resourceId === null ? "ring-2 ring-primary" : ""
          }`}
        >
          <div className="text-sm font-medium">Any available</div>
          <div className="text-xs text-muted-foreground">
            Let the engine pick the best resource
          </div>
        </button>
        {(q.data?.rows ?? []).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={`text-left border rounded p-3 hover:bg-muted ${
              resourceId === r.id ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="text-sm font-medium">{r.name}</div>
            <div className="text-xs text-muted-foreground">{r.resource_kind}</div>
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}

function StepSlot({
  tenantId,
  branchId,
  serviceId,
  doctorId,
  duration,
  slot,
  onSelect,
  onNext,
  onBack,
}: {
  tenantId: string;
  branchId: string | null;
  serviceId: string;
  doctorId: string | null;
  duration: number;
  slot: Slot | null;
  onSelect: (s: Slot) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const from = useMemo(() => new Date().toISOString(), []);
  const to = useMemo(
    () => new Date(Date.now() + 7 * 86400_000).toISOString(),
    [],
  );
  const fn = useServerFn(findSlots);
  const q = useQuery({
    queryKey: ["wiz-slots", tenantId, branchId, serviceId, doctorId, duration],
    queryFn: () =>
      fn({
        data: {
          tenant_id: tenantId,
          service_id: serviceId,
          branch_id: branchId ?? undefined,
          doctor_id: doctorId ?? undefined,
          from,
          to,
          duration_minutes: duration,
          limit: 50,
          delivery_mode: "in_clinic",
          timezone: "UTC",
          respect_capacity: true,
          respect_policies: true,
        },
      }),
    enabled: !!branchId,
  });
  const slots = (q.data?.slots ?? []) as Slot[];
  return (
    <div className="space-y-3">
      {q.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Finding slots…
        </div>
      )}
      {!q.isLoading && slots.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No slots available in the next 7 days for this configuration.
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4 max-h-96 overflow-auto">
        {slots.map((s) => {
          const sel =
            slot?.starts_at === s.starts_at &&
            (slot?.resource_id ?? null) === (s.resource_id ?? null);
          return (
            <button
              key={`${s.starts_at}-${s.resource_id ?? ""}`}
              type="button"
              onClick={() => onSelect(s)}
              className={`border rounded p-2 text-left text-sm hover:bg-muted ${sel ? "ring-2 ring-primary" : ""}`}
            >
              <div className="font-medium">
                {format(new Date(s.starts_at), "PPp")}
              </div>
              <div className="text-xs text-muted-foreground">
                {s.duration_minutes ?? duration}m
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!slot}>Next</Button>
      </div>
    </div>
  );
}

function StepReview({
  tenantId,
  branchId,
  personId,
  personLabel,
  serviceId,
  duration,
  resourceId,
  slot,
  onBack,
  onBooked,
}: {
  tenantId: string;
  branchId: string;
  personId: string;
  personLabel: string;
  serviceId: string;
  duration: number;
  resourceId: string | null;
  slot: Slot;
  onBack: () => void;
  onBooked: (id: string) => void;
}) {
  const fn = useServerFn(bookAppointment);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          tenant_id: tenantId,
          person_id: personId,
          service_id: serviceId,
          branch_id: branchId,
          doctor_id: resourceId ?? undefined,
          starts_at: slot.starts_at,
          duration_minutes: duration,
          timezone: "UTC",
          delivery_mode: "in_clinic",
          booking_source: "reception",
        },
      }),
    onSuccess: (res: unknown) => {
      const r = res as { appointment?: { id: string }; error?: { message: string } };
      if (r?.error) {
        toast.error(r.error.message);
        return;
      }
      if (r?.appointment?.id) {
        toast.success("Appointment booked");
        onBooked(r.appointment.id);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <div className="grid gap-2 text-sm">
        <Row k="Patient" v={personLabel} />
        <Row k="Service" v={serviceId} />
        <Row k="Duration" v={`${duration} min`} />
        <Row k="Branch" v={branchId} />
        <Row k="Resource" v={resourceId ?? "Any"} />
        <Row k="Starts" v={format(new Date(slot.starts_at), "PPPp")} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack} disabled={mut.isPending}>
          Back
        </Button>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm booking
        </Button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b pb-1">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium truncate max-w-[60%] text-right">{v}</span>
    </div>
  );
}

// keep chip helper (unused elsewhere in this file but referenced in JSX imports)
void Badge;
