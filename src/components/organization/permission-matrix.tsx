/**
 * Interactive role permission matrix.
 * Rows = permissions grouped by resource. Columns = roles.
 * Toggles call setRolePermission; bulk actions provided.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  listRoles,
  listPermissions,
  listRolePermissions,
  setRolePermission,
  bulkSetRolePermissions,
} from "@/lib/api/organization.functions";

export function PermissionMatrix() {
  const rolesFn = useServerFn(listRoles);
  const permsFn = useServerFn(listPermissions);
  const rpFn = useServerFn(listRolePermissions);
  const setRp = useServerFn(setRolePermission);
  const bulkSet = useServerFn(bulkSetRolePermissions);
  const qc = useQueryClient();

  const rolesQ = useQuery({ queryKey: ["roles-all"], queryFn: () => rolesFn({}) });
  const permsQ = useQuery({ queryKey: ["perms-all"], queryFn: () => permsFn({}) });
  const rpQ = useQuery({ queryKey: ["role-perms"], queryFn: () => rpFn({}) });

  const grouped = useMemo(() => {
    const g = new Map<string, typeof permsQ.data>();
    for (const p of permsQ.data ?? []) {
      const list = g.get(p.resource) ?? [];
      list.push(p);
      g.set(p.resource, list);
    }
    return Array.from(g.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permsQ.data]);

  const rpSet = useMemo(() => {
    const s = new Set<string>();
    for (const r of rpQ.data ?? []) s.add(`${r.role_code}|${r.permission_code}`);
    return s;
  }, [rpQ.data]);

  const toggleMut = useMutation({
    mutationFn: (v: { role_code: string; permission_code: string; enabled: boolean }) =>
      setRp({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-perms"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkMut = useMutation({
    mutationFn: (v: { role_code: string; permission_codes: string[] }) => bulkSet({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-perms"] });
      toast.success("Bulk updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [visibleRoles, setVisibleRoles] = useState<string[] | null>(null);
  const rolesToShow = (rolesQ.data ?? []).filter((r) =>
    visibleRoles ? visibleRoles.includes(r.code) : true,
  );

  const doExport = () => {
    const rows = (rpQ.data ?? []).map((r) => `${r.role_code},${r.permission_code}`);
    const csv = "role_code,permission_code\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "role-permissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/).slice(1);
    const byRole = new Map<string, string[]>();
    for (const line of lines) {
      const [role, perm] = line.split(",").map((s) => s.trim());
      if (!role || !perm) continue;
      const list = byRole.get(role) ?? [];
      list.push(perm);
      byRole.set(role, list);
    }
    for (const [role, perms] of byRole)
      await bulkMut.mutateAsync({ role_code: role, permission_codes: perms });
    toast.success(`Imported ${byRole.size} role(s)`);
  };

  if (rolesQ.isLoading || permsQ.isLoading || rpQ.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading matrix…</div>;
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Permission Matrix</h3>
          <p className="text-sm text-muted-foreground">
            {permsQ.data?.length ?? 0} permissions across {rolesQ.data?.length ?? 0} roles.
            Changes save immediately.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1 text-xs cursor-pointer text-muted-foreground hover:text-foreground">
            <Upload className="h-3.5 w-3.5" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
              }}
            />
          </label>
          <Button variant="outline" size="sm" onClick={doExport}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(rolesQ.data ?? []).map((r) => {
          const active = !visibleRoles || visibleRoles.includes(r.code);
          return (
            <button
              type="button"
              key={r.code}
              onClick={() => {
                const cur = visibleRoles ?? (rolesQ.data ?? []).map((x) => x.code);
                const next = cur.includes(r.code)
                  ? cur.filter((c) => c !== r.code)
                  : [...cur, r.code];
                setVisibleRoles(next);
              }}
              className={`text-[11px] px-2 py-0.5 rounded-md border ${
                active
                  ? "bg-primary/10 border-primary/30 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {r.name}
            </button>
          );
        })}
        {visibleRoles && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline"
            onClick={() => setVisibleRoles(null)}
          >
            reset
          </button>
        )}
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="text-xs w-full">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              <th className="text-left p-2 min-w-[240px]">Permission</th>
              {rolesToShow.map((r) => (
                <th key={r.code} className="p-2 text-center font-medium min-w-[80px]">
                  <div className="whitespace-nowrap">{r.name}</div>
                  <div className="text-[9px] text-muted-foreground font-normal">L{r.level}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([resource, perms]) => (
              <>
                <tr key={`h-${resource}`} className="bg-muted/20">
                  <td colSpan={rolesToShow.length + 1} className="px-2 py-1 font-semibold uppercase text-[10px] tracking-wider text-muted-foreground">
                    {resource}
                  </td>
                </tr>
                {(perms ?? []).map((p) => (
                  <tr key={p.code} className="border-t">
                    <td className="p-2">
                      <div className="font-mono text-[11px]">{p.code}</div>
                      {p.description && (
                        <div className="text-muted-foreground text-[10px]">{p.description}</div>
                      )}
                    </td>
                    {rolesToShow.map((r) => {
                      const on = rpSet.has(`${r.code}|${p.code}`);
                      return (
                        <td key={r.code} className="p-2 text-center">
                          <Checkbox
                            checked={on}
                            onCheckedChange={(v) =>
                              toggleMut.mutate({
                                role_code: r.code,
                                permission_code: p.code,
                                enabled: !!v,
                              })
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
