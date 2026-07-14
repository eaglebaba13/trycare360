/** Patient Portal — Support & Conversations. */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/standards/data-grid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createSupportTicket, listMySupportTickets, submitPatientFeedback } from "@/lib/patient/support.functions";
import { listConversations, sendChatMessage } from "@/lib/patient/conversations.functions";
import { formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Ticket = { id: string; subject: string; status: string; created_at: string; priority?: string | null };
type Conv = { id: string; subject?: string | null; last_message_at?: string | null; unread_count?: number | null };

function useTickets() {
  const fn = useServerFn(listMySupportTickets);
  return useQuery<Ticket[]>({ queryKey: ["patient-tickets"], queryFn: () => fn({ data: {} }) as unknown as Promise<Ticket[]> });
}

export function SupportTicketGrid() {
  const q = useTickets();
  return (
    <DataGrid rows={q.data ?? []} getRowId={(r) => r.id} isLoading={q.isLoading} emptyMessage="No tickets."
      columns={[
        { id: "when", header: "Created", cell: (r) => formatDateTime(r.created_at) },
        { id: "sub", header: "Subject", cell: (r) => r.subject },
        { id: "pri", header: "Priority", cell: (r) => r.priority ?? "—" },
        { id: "st", header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]} />
  );
}

function NewTicketDialog() {
  const qc = useQueryClient();
  const fn = useServerFn(createSupportTicket);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "normal", category: "general" });
  const mut = useMutation({
    mutationFn: () => fn({ data: form }),
    onSuccess: () => { toast.success("Ticket created"); qc.invalidateQueries({ queryKey: ["patient-tickets"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Ticket</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div><Label>Priority</Label><Input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.subject}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConversationWorkspace() {
  const listFn = useServerFn(listConversations);
  const sendFn = useServerFn(sendChatMessage);
  const q = useQuery<Conv[]>({ queryKey: ["patient-convs"], queryFn: () => listFn({ data: {} }) as unknown as Promise<Conv[]> });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const send = useMutation({
    mutationFn: () => sendFn({ data: { conversationId: activeId ?? "", body: msg } }),
    onSuccess: () => { setMsg(""); toast.success("Sent"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = q.data ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Conversations</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-xs text-muted-foreground">No conversations.</div>
          ) : (
            <ul className="space-y-1">
              {rows.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setActiveId(c.id)}
                    className={`w-full text-left rounded p-2 text-sm hover:bg-muted ${activeId === c.id ? "bg-muted" : ""}`}>
                    <div className="truncate font-medium">{c.subject ?? "(no subject)"}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(c.last_message_at ?? "")}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Chat</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="h-64 border rounded p-3 text-sm text-muted-foreground overflow-auto">
            {activeId ? "Message history displays here." : "Select a conversation."}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Type a message…" value={msg} onChange={(e) => setMsg(e.target.value)} disabled={!activeId} />
            <Button onClick={() => send.mutate()} disabled={send.isPending || !activeId || !msg}><Send className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SupportWorkspace() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><NewTicketDialog /></div>
      <Card><CardHeader><CardTitle className="text-sm">Tickets</CardTitle></CardHeader><CardContent><SupportTicketGrid /></CardContent></Card>
      <ConversationWorkspace />
    </div>
  );
}

export function PatientSupportPage() {
  return (
    <PatientShell title="Support" description="Tickets and secure conversations.">
      <SupportWorkspace />
    </PatientShell>
  );
}

export function PatientFeedbackPage() {
  const fn = useServerFn(submitPatientFeedback);
  const [form, setForm] = useState({ rating: 5, comments: "", category: "general" });
  const mut = useMutation({
    mutationFn: () => fn({ data: form }),
    onSuccess: () => { toast.success("Thank you for your feedback"); setForm({ ...form, comments: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <PatientShell title="Feedback" description="Help us improve your care experience.">
      <Card><CardContent className="pt-4 space-y-3 max-w-xl">
        <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        <div><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></div>
        <div><Label>Comments</Label><Textarea rows={5} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} /></div>
        <div className="flex justify-end"><Button onClick={() => mut.mutate()} disabled={mut.isPending}>Submit</Button></div>
      </CardContent></Card>
    </PatientShell>
  );
}
