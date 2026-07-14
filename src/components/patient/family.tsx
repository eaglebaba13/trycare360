/** Patient Portal — Family delegation workspace. */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  addFamilyMember,
  listFamilyMembers,
  removeFamilyMember,
  updateFamilyPermissions,
  switchPatientContext,
} from "@/lib/patient/family.functions";
import { PatientShell } from "./shell";

type Member = {
  id: string;
  member_user_id: string | null;
  display_name: string | null;
  relationship: string;
  can_view: boolean; can_book: boolean; can_pay: boolean; can_manage: boolean;
  status: string;
};

function useFamily() {
  const fn = useServerFn(listFamilyMembers);
  return useQuery<Member[]>({ queryKey: ["patient-family"], queryFn: () => fn({}) as unknown as Promise<Member[]> });
}

export function InviteMemberDialog() {
  const qc = useQueryClient();
  const fn = useServerFn(addFamilyMember);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ displayName: "", relationship: "spouse", canView: true, canBook: false, canPay: false, canManage: false });
  const mut = useMutation({
    mutationFn: () => fn({ data: { ...form } }),
    onSuccess: () => { toast.success("Member invited"); qc.invalidateQueries({ queryKey: ["patient-family"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 mr-1.5" />Invite Member</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite Family Member</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Display Name</Label><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
          <div><Label>Relationship</Label><Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></div>
          <PermissionRow value={form} onChange={(v) => setForm({ ...form, ...v })} />
        </div>
        <DialogFooter><Button onClick={() => mut.mutate()} disabled={mut.isPending}>Send Invite</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionRow({ value, onChange }: {
  value: { canView: boolean; canBook: boolean; canPay: boolean; canManage: boolean };
  onChange: (v: Partial<typeof value>) => void;
}) {
  const cols = [
    { k: "canView", label: "View" }, { k: "canBook", label: "Book" },
    { k: "canPay", label: "Pay" }, { k: "canManage", label: "Manage" },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3">
      {cols.map((c) => (
        <div key={c.k} className="flex items-center justify-between rounded border p-2">
          <span className="text-sm">{c.label}</span>
          <Switch checked={value[c.k]} onCheckedChange={(v) => onChange({ [c.k]: v } as Partial<typeof value>)} />
        </div>
      ))}
    </div>
  );
}

export function PermissionEditor({ member }: { member: Member }) {
  const qc = useQueryClient();
  const upFn = useServerFn(updateFamilyPermissions);
  const rmFn = useServerFn(removeFamilyMember);
  const mut = useMutation({
    mutationFn: (patch: Partial<Member>) => upFn({ data: { memberId: member.id, canView: patch.can_view, canBook: patch.can_book, canPay: patch.can_pay, canManage: patch.can_manage } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient-family"] }),
  });
  const remove = useMutation({
    mutationFn: () => rmFn({ data: { memberId: member.id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["patient-family"] }); },
  });
  return (
    <PermissionRow
      value={{ canView: member.can_view, canBook: member.can_book, canPay: member.can_pay, canManage: member.can_manage }}
      onChange={(v) => {
        mut.mutate({
          can_view: v.canView ?? member.can_view,
          can_book: v.canBook ?? member.can_book,
          can_pay: v.canPay ?? member.can_pay,
          can_manage: v.canManage ?? member.can_manage,
        });
      }}
    />
  );
}

export function DependentCard({ member }: { member: Member }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{member.display_name ?? "Family member"}</CardTitle>
          <Badge variant="outline">{member.status}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">{member.relationship}</div>
      </CardHeader>
      <CardContent className="space-y-3">
        <PermissionEditor member={member} />
        <SwitchPatientDialog member={member} />
      </CardContent>
    </Card>
  );
}

export function SwitchPatientDialog({ member }: { member: Member }) {
  const fn = useServerFn(switchPatientContext);
  const mut = useMutation({
    mutationFn: () => fn({ data: { targetUserId: member.member_user_id ?? "" } }),
    onSuccess: () => toast.success("Context switched"),
    onError: (e: Error) => toast.error(e.message),
  });
  if (!member.member_user_id) return null;
  return <Button size="sm" variant="outline" onClick={() => mut.mutate()} disabled={mut.isPending}>Manage on their behalf</Button>;
}

export function FamilyMembersGrid() {
  const q = useFamily();
  const rows = q.data ?? [];
  if (rows.length === 0) return <div className="text-sm text-muted-foreground py-8 text-center">No family members yet.</div>;
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rows.map((m) => <DependentCard key={m.id} member={m} />)}</div>;
}

export function FamilyWorkspace() {
  return (
    <PatientShell title="Family" description="Delegate access to trusted family members." actions={<InviteMemberDialog />}>
      <FamilyMembersGrid />
    </PatientShell>
  );
}
