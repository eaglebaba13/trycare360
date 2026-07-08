import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus, KeyRound, UserX, UserCheck, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listUsers,
  inviteUser,
  setUserActive,
  sendPasswordReset,
  assignRole,
  revokeRole,
  listUserRoles,
  listRoles,
} from "@/lib/api/organization.functions";
import { isHiddenRole } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/organization/users")({
  component: UsersPage,
});

function UsersPage() {
  const listFn = useServerFn(listUsers);
  const inviteFn = useServerFn(inviteUser);
  const activeFn = useServerFn(setUserActive);
  const resetFn = useServerFn(sendPasswordReset);
  const rolesFn = useServerFn(listRoles);
  const qc = useQueryClient();

  const users = useQuery({ queryKey: ["users-list"], queryFn: () => listFn({}) });
  const roles = useQuery({ queryKey: ["roles-all"], queryFn: () => rolesFn({}) });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", full_name: "", role_code: "" });
  const [rolesUser, setRolesUser] = useState<string | null>(null);

  const inviteMut = useMutation({
    mutationFn: () => inviteFn({ data: { ...invite } }),
    onSuccess: () => {
      toast.success("Invitation sent");
      setInviteOpen(false);
      setInvite({ email: "", full_name: "", role_code: "" });
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMut = useMutation({
    mutationFn: (v: { user_id: string; active: boolean }) => activeFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-list"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: (email: string) => resetFn({ data: { email } }),
    onSuccess: () => toast.success("Password reset link generated"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer
      title="Users"
      description="Invite team members, deactivate accounts, reset passwords and assign roles across the organization. All actions are tenant- and org-unit-scoped."
      actions={
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Invite user
        </Button>
      }
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (users.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              users.data!.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.full_name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const visible = u.roles.filter((r) => !isHiddenRole(r.role_code));
                        return visible.length === 0 ? (
                          <span className="text-xs text-muted-foreground">no roles</span>
                        ) : (
                          visible.map((r, i) => (
                            <Badge key={`${r.role_code}-${i}`} variant="secondary" className="text-[10px]">
                              {r.role_code}
                            </Badge>
                          ))
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "default" : "outline"}>
                      {u.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRolesUser(u.id)}
                      >
                        Roles
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => u.email && resetMut.mutate(u.email)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          activeMut.mutate({ user_id: u.id, active: !u.is_active })
                        }
                      >
                        {u.is_active ? (
                          <UserX className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5 text-primary" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={invite.email}
                onChange={(e) => setInvite({ ...invite, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Full name</Label>
              <Input
                value={invite.full_name}
                onChange={(e) => setInvite({ ...invite, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Initial role</Label>
              <Select
                value={invite.role_code}
                onValueChange={(v) => setInvite({ ...invite, role_code: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {(roles.data ?? []).map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!invite.email || inviteMut.isPending}
              onClick={() => inviteMut.mutate()}
            >
              {inviteMut.isPending ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RolesDialog userId={rolesUser} onClose={() => setRolesUser(null)} />
    </PageContainer>
  );
}

function RolesDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const listFn = useServerFn(listUserRoles);
  const rolesFn = useServerFn(listRoles);
  const assignFn = useServerFn(assignRole);
  const revokeFn = useServerFn(revokeRole);
  const qc = useQueryClient();
  const [addRole, setAddRole] = useState("");

  const q = useQuery({
    queryKey: ["user-roles", userId],
    queryFn: () => (userId ? listFn({ data: { user_id: userId } }) : Promise.resolve([])),
    enabled: !!userId,
  });
  const rolesQ = useQuery({ queryKey: ["roles-all"], queryFn: () => rolesFn({}) });

  const assignMut = useMutation({
    mutationFn: () =>
      userId ? assignFn({ data: { user_id: userId, role_code: addRole } }) : Promise.resolve(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-roles", userId] });
      qc.invalidateQueries({ queryKey: ["users-list"] });
      toast.success("Role assigned");
      setAddRole("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-roles", userId] });
      qc.invalidateQueries({ queryKey: ["users-list"] });
      toast.success("Revoked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!userId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User roles</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border">
            <Table>
              <TableBody>
                {(q.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-6">
                      No roles assigned.
                    </TableCell>
                  </TableRow>
                ) : (
                  q.data!.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.role_code}</div>
                        {r.org_unit_id && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            org {r.org_unit_id}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revokeMut.mutate(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Add role</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(rolesQ.data ?? []).map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!addRole || assignMut.isPending} onClick={() => assignMut.mutate()}>
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
