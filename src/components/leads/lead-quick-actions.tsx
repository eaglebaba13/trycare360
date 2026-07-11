/**
 * Lead 360 Quick Actions.
 * Thin wrapper over existing lead + interaction server functions;
 * no business logic here beyond form validation and toasts.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCog,
  ArrowRightCircle,
  CalendarClock,
  MessageSquarePlus,
  UserCheck,
  Send,
  Mail,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { assignLead, moveStage, convertLead } from "@/lib/leads/leads.functions";
import { scheduleFollowUp } from "@/lib/leads/followup.functions";
import { logInteraction } from "@/lib/interactions/interactions.functions";

type Kind = "assign" | "stage" | "followup" | "interaction" | "note" | "convert" | null;

const STAGES = ["new", "contacted", "qualified", "consultation", "proposal", "negotiation", "won", "lost"];
const CHANNELS = ["call", "whatsapp", "sms", "email", "meeting", "walk_in"] as const;

export function LeadQuickActions({
  lead,
  onChanged,
}: {
  lead: { id: string; tenant_id: string; person_id: string; owner_id: string | null; stage_code: string };
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState<Kind>(null);
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["lead-timeline", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads-list"] });
    onChanged?.();
  };

  const assignFn = useServerFn(assignLead);
  const stageFn = useServerFn(moveStage);
  const followUpFn = useServerFn(scheduleFollowUp);
  const interactionFn = useServerFn(logInteraction);
  const convertFn = useServerFn(convertLead);

  const [ownerId, setOwnerId] = useState(lead.owner_id ?? "");
  const [reason, setReason] = useState("");
  const [stage, setStage] = useState(lead.stage_code);
  const [dueAt, setDueAt] = useState(new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
  const [kind, setKind] = useState<(typeof CHANNELS)[number]>("call");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [convertTo, setConvertTo] = useState<"patient" | "appointment" | "treatment" | "membership" | "subscription">("patient");

  const assignM = useMutation({
    mutationFn: () =>
      assignFn({ data: { id: lead.id, owner_id: ownerId ? ownerId : null, reason: reason || undefined, assignment_kind: "manual" } }),
    onSuccess: () => { toast.success("Lead reassigned"); setOpen(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const stageM = useMutation({
    mutationFn: () => stageFn({ data: { id: lead.id, stage_code: stage } }),
    onSuccess: () => { toast.success("Stage updated"); setOpen(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const followUpM = useMutation({
    mutationFn: () =>
      followUpFn({
        data: {
          tenant_id: lead.tenant_id,
          lead_id: lead.id,
          due_at: new Date(dueAt).toISOString(),
          kind: kind === "meeting" || kind === "walk_in" ? "call" : (kind as "call" | "whatsapp" | "email" | "sms"),
          notes: body || undefined,
          owner_id: lead.owner_id ?? undefined,
        },
      }),
    onSuccess: () => { toast.success("Follow-up scheduled"); setOpen(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const interactionM = useMutation({
    mutationFn: (isNote?: boolean) =>
      interactionFn({
        data: {
          tenant_id: lead.tenant_id,
          person_id: lead.person_id,
          lead_id: lead.id,
          channel: isNote ? "note" : kind,
          direction: "out",
          subject: subject || undefined,
          body: body || undefined,
          owner_id: lead.owner_id ?? undefined,
          attachments: [],
          meta: {},
        },
      }),
    onSuccess: () => { toast.success("Logged"); setOpen(null); setSubject(""); setBody(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const convertM = useMutation({
    mutationFn: () => convertFn({ data: { id: lead.id, to: convertTo } }),
    onSuccess: () => { toast.success("Lead converted"); setOpen(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen("assign")}><UserCog className="h-4 w-4 mr-1" />Assign</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen("stage")}><ArrowRightCircle className="h-4 w-4 mr-1" />Change Stage</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen("followup")}><CalendarClock className="h-4 w-4 mr-1" />Schedule Follow-up</Button>
        <Button size="sm" variant="outline" onClick={() => { setKind("call"); setOpen("interaction"); }}><MessageSquarePlus className="h-4 w-4 mr-1" />Log Interaction</Button>
        <Button size="sm" variant="outline" onClick={() => { setKind("whatsapp"); setOpen("interaction"); }}><Send className="h-4 w-4 mr-1" />WhatsApp</Button>
        <Button size="sm" variant="outline" onClick={() => { setKind("email"); setOpen("interaction"); }}><Mail className="h-4 w-4 mr-1" />Email</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen("note")}><StickyNote className="h-4 w-4 mr-1" />Add Note</Button>
        <Button size="sm" variant="outline" disabled title="Appointments module ships in a later phase"><CalendarClock className="h-4 w-4 mr-1" />Start Appointment</Button>
        <Button size="sm" onClick={() => setOpen("convert")}><UserCheck className="h-4 w-4 mr-1" />Convert to Patient</Button>
      </div>

      <Dialog open={open === "assign"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Owner user ID</Label><Input value={ownerId} onChange={(e) => setOwnerId(e.target.value)} placeholder="uuid or blank to unassign" /></div>
            <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={() => assignM.mutate()} disabled={assignM.isPending}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "stage"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Stage</DialogTitle></DialogHeader>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter><Button onClick={() => stageM.mutate()} disabled={stageM.isPending}>Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "followup"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Due at</Label><Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
            <div>
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={() => followUpM.mutate()} disabled={followUpM.isPending}>Schedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "interaction"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log {kind}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Channel</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><Label>Body</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} /></div>
          </div>
          <DialogFooter><Button onClick={() => interactionM.mutate(false)} disabled={interactionM.isPending}>Log</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "note"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><Label>Note</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} /></div>
          </div>
          <DialogFooter><Button onClick={() => interactionM.mutate(true)} disabled={interactionM.isPending}>Save Note</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "convert"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convert Lead</DialogTitle></DialogHeader>
          <Select value={convertTo} onValueChange={(v) => setConvertTo(v as typeof convertTo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["patient", "appointment", "treatment", "membership", "subscription"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter><Button onClick={() => convertM.mutate()} disabled={convertM.isPending}>Convert</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
