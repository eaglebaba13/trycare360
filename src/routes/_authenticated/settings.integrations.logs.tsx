import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listApiLogs, listJobs, retryJob } from "@/lib/api/integrations.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/integrations/logs")({
  component: Logs,
});

function Logs() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const logsFn = useServerFn(listApiLogs);
  const jobsFn = useServerFn(listJobs);
  const retryFn = useServerFn(retryJob);
  const [tab, setTab] = useState("api");

  const { data: logs = [] } = useQuery({
    queryKey: ["integrations", "api-logs", activeTenantId],
    queryFn: () => logsFn({ data: { tenantId: activeTenantId!, limit: 100 } }),
    enabled: !!activeTenantId && tab === "api",
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ["integrations", "jobs", activeTenantId],
    queryFn: () => jobsFn({ data: { tenantId: activeTenantId!, limit: 100 } }),
    enabled: !!activeTenantId && tab === "jobs",
  });

  const retry = useMutation({
    mutationFn: (id: string) => retryFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Requeued");
      qc.invalidateQueries({ queryKey: ["integrations", "jobs"] });
    },
  });

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="api">API calls</TabsTrigger>
        <TabsTrigger value="jobs">Job queue</TabsTrigger>
      </TabsList>

      <TabsContent value="api" className="mt-4">
        <Card className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logs as { id: string; created_at: string; provider_code: string; endpoint: string; status_code: number; latency_ms: number; error: string | null }[]).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{l.provider_code}</TableCell>
                  <TableCell className="font-mono text-xs">{l.endpoint}</TableCell>
                  <TableCell>
                    <Badge variant={l.status_code < 400 ? "default" : "destructive"}>{l.status_code}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{l.latency_ms}ms</TableCell>
                  <TableCell className="text-xs text-destructive font-mono max-w-md truncate">{l.error ?? ""}</TableCell>
                </TableRow>
              ))}
              {(logs as unknown[]).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No API calls logged yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      <TabsContent value="jobs" className="mt-4">
        <Card className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Error</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(jobs as { id: string; created_at: string; provider_code: string; job_type: string; status: string; attempts: number; max_attempts: number; last_error: string | null }[]).map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="text-xs">{new Date(j.created_at).toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{j.provider_code}</TableCell>
                  <TableCell className="font-mono text-xs">{j.job_type}</TableCell>
                  <TableCell>
                    <Badge variant={j.status === "success" ? "default" : j.status === "dead" ? "destructive" : "outline"}>
                      {j.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{j.attempts}/{j.max_attempts}</TableCell>
                  <TableCell className="text-xs text-destructive font-mono max-w-md truncate">{j.last_error ?? ""}</TableCell>
                  <TableCell className="text-right">
                    {(j.status === "failed" || j.status === "dead") && (
                      <Button size="icon" variant="ghost" onClick={() => retry.mutate(j.id)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(jobs as unknown[]).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No jobs yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
