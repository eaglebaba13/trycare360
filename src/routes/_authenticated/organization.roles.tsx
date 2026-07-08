import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, History } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PermissionMatrix } from "@/components/organization/permission-matrix";
import {
  listRoles,
  createOrCloneRole,
  listRoleHistory,
} from "@/lib/api/organization.functions";
import { isHiddenRole } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/organization/roles")({
  component: RolesPage,
});

function RolesPage() {
  const rolesFn = useServerFn(listRoles);
  const createFn = useServerFn(createOrCloneRole);
  const historyFn = useServerFn(listRoleHistory);
  const qc = useQueryClient();

  const roles = useQuery({ queryKey: ["roles-all"], queryFn: () => rolesFn({}) });
  const history = useQuery({
    queryKey: ["role-history"],
    queryFn: () => historyFn({ data: {} }),
  });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    code: "",
    name: "",
    level: 50,
    description: "",
    cloneFrom: "",
  });

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          code: draft.code,
          name: draft.name,
          level: draft.level,
          description: draft.description || undefined,
          cloneFrom: draft.cloneFrom || undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles-all"] });
      qc.invalidateQueries({ queryKey: ["role-perms"] });
      toast.success("Role created");
      setOpen(false);
      setDraft({ code: "", name: "", level: 50, description: "", cloneFrom: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer
      title="Roles & Permissions"
      description="Create or clone roles, tune each role's permissions through the matrix, and audit every grant/revoke."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New role
        </Button>
      }
    >
      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Permission matrix</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-3.5 w-3.5 mr-1" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-4">
          <PermissionMatrix />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(roles.data ?? []).filter((r) => !isHiddenRole(r.code)).map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">L{r.level}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Org unit</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      No role changes recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.data!.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">
                        {new Date(h.performed_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">{h.user_id}</TableCell>
                      <TableCell>{h.role_code}</TableCell>
                      <TableCell>
                        <Badge variant={h.action === "grant" ? "default" : "outline"}>
                          {h.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">
                        {h.org_unit_id ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">
                        {h.performed_by ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Code</Label>
              <Input
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toLowerCase() })}
                placeholder="lowercase_with_underscores"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Level</Label>
              <Input
                type="number"
                value={draft.level}
                onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Clone permissions from</Label>
              <Select
                value={draft.cloneFrom}
                onValueChange={(v) => setDraft({ ...draft, cloneFrom: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Start empty" />
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!draft.code || !draft.name || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
