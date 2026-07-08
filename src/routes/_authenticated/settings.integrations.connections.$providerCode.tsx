import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listConnections,
  listProviders,
  upsertConnection,
  deleteConnection,
  testConnection,
} from "@/lib/api/integrations.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/integrations/connections/$providerCode")({
  component: ConnectionEditor,
});

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  readonly?: boolean;
  options?: string[];
};

function ConnectionEditor() {
  const { providerCode } = Route.useParams();
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();

  const provFn = useServerFn(listProviders);
  const connFn = useServerFn(listConnections);
  const upsertFn = useServerFn(upsertConnection);
  const deleteFn = useServerFn(deleteConnection);
  const testFn = useServerFn(testConnection);

  const { data: providers = [] } = useQuery({
    queryKey: ["integrations", "providers"],
    queryFn: () => provFn(),
  });
  const { data: connections = [] } = useQuery({
    queryKey: ["integrations", "connections", activeTenantId],
    queryFn: () => connFn({ data: { tenantId: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const provider = (providers as {
    code: string;
    name: string;
    description: string | null;
    config_schema: { fields?: Field[] };
    docs_url: string | null;
    auth_type: string;
  }[]).find((p) => p.code === providerCode);

  const existing = (connections as { provider_code: string; id: string; label: string; credentials_ref: string | null; config: Record<string, unknown>; status: string; last_error: string | null }[]).find(
    (c) => c.provider_code === providerCode,
  );

  const fields: Field[] = useMemo(() => provider?.config_schema?.fields ?? [], [provider]);

  const [label, setLabel] = useState(existing?.label ?? provider?.name ?? "");
  const [credRef, setCredRef] = useState(existing?.credentials_ref ?? "");
  const [config, setConfig] = useState<Record<string, unknown>>(existing?.config ?? {});

  const save = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          id: existing?.id,
          tenant_id: activeTenantId!,
          provider_code: providerCode,
          label: label || provider?.name || providerCode,
          credentials_ref: credRef || null,
          config,
          scopes: [],
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: (id: string) => testFn({ data: { id } }),
    onSuccess: (r) => {
      if (r.ok) toast.success(`Connected (${r.latencyMs}ms)`);
      else toast.error(`Failed: ${r.error ?? "unknown"}`);
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["integrations"] });
      setLabel(provider?.name ?? "");
      setCredRef("");
      setConfig({});
    },
  });

  if (!provider) return <div className="text-sm text-muted-foreground">Unknown provider.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-semibold">{provider.name}</h2>
          {existing && (
            <Badge variant={existing.status === "connected" ? "default" : existing.status === "error" ? "destructive" : "outline"}>
              {existing.status}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{provider.description}</p>
        {existing?.last_error && (
          <div className="mt-2 rounded bg-destructive/10 text-destructive text-xs p-2 font-mono">
            {existing.last_error}
          </div>
        )}
      </div>

      <Card className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Production, Staging…" />
        </div>
        <div className="space-y-1.5">
          <Label>Credentials secret name</Label>
          <Input
            value={credRef}
            onChange={(e) => setCredRef(e.target.value)}
            placeholder="e.g. WHATSAPP_TOKEN — must match a stored Lovable secret"
          />
          <p className="text-xs text-muted-foreground">
            Save the secret in Project Settings → Secrets, then paste its name here. Raw values are never stored in the database.
          </p>
        </div>

        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
            {f.type === "boolean" ? (
              <Switch checked={!!config[f.key]} onCheckedChange={(v) => setConfig({ ...config, [f.key]: v })} />
            ) : f.type === "textarea" ? (
              <Textarea
                value={(config[f.key] as string) ?? ""}
                onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                disabled={f.readonly}
              />
            ) : f.type === "select" ? (
              <Select
                value={(config[f.key] as string) ?? ""}
                onValueChange={(v) => setConfig({ ...config, [f.key]: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {f.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={f.type === "number" ? "number" : "text"}
                value={(config[f.key] as string | number) ?? ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    [f.key]: f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value,
                  })
                }
                placeholder={f.placeholder}
                disabled={f.readonly}
              />
            )}
          </div>
        ))}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : existing ? "Update" : "Connect"}
          </Button>
          {existing && (
            <>
              <Button variant="outline" onClick={() => test.mutate(existing.id)} disabled={test.isPending}>
                {test.isPending ? "Testing…" : "Test connection"}
              </Button>
              <Button variant="ghost" className="text-destructive ml-auto" onClick={() => del.mutate(existing.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Remove
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
