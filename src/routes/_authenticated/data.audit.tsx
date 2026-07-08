import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAuditLogs, listActivityLogs, listIpLogs, listDeviceLogs,
} from "@/lib/api/data.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/data/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { activeTenantId } = useTenant();
  const auditFn = useServerFn(listAuditLogs);
  const activityFn = useServerFn(listActivityLogs);
  const ipFn = useServerFn(listIpLogs);
  const deviceFn = useServerFn(listDeviceLogs);

  const [q, setQ] = useState("");
  const [tableName, setTableName] = useState("");

  const { data: audit = [] } = useQuery({
    queryKey: ["data", "audit", activeTenantId, q, tableName],
    queryFn: () => auditFn({ data: { tenantId: activeTenantId, q: q || undefined, tableName: tableName || undefined } }),
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["data", "activity", activeTenantId],
    queryFn: () => activityFn({ data: { tenantId: activeTenantId } }),
  });
  const { data: ips = [] } = useQuery({
    queryKey: ["data", "ips"],
    queryFn: () => ipFn({ data: {} }),
  });
  const { data: devices = [] } = useQuery({
    queryKey: ["data", "devices"],
    queryFn: () => deviceFn({ data: {} }),
  });

  return (
    <Card className="p-4">
      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Audit ({audit.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity ({activity.length})</TabsTrigger>
          <TabsTrigger value="ip">IP logs ({ips.length})</TabsTrigger>
          <TabsTrigger value="device">Devices ({devices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-4">
          <div className="flex gap-3 mb-3">
            <div><Label className="text-xs">Search</Label><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="table / action / row" className="w-64" /></div>
            <div><Label className="text-xs">Table</Label><Input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="e.g. leads" className="w-48" /></div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>Table</TableHead><TableHead>Row</TableHead>
              <TableHead>Action</TableHead><TableHead>Actor</TableHead><TableHead>IP</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {audit.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No records.</TableCell></TableRow>}
              {audit.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{new Date(a.ts).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{a.table_name}</TableCell>
                  <TableCell className="font-mono text-xs">{a.row_id?.slice(0, 12)}</TableCell>
                  <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{a.actor_id?.slice(0, 8) ?? "system"}</TableCell>
                  <TableCell className="text-xs">{a.ip ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>Verb</TableHead>
              <TableHead>Object</TableHead><TableHead>Actor</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {activity.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No activity.</TableCell></TableRow>}
              {activity.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{new Date(a.ts).toLocaleString()}</TableCell>
                  <TableCell><Badge>{a.verb}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{a.object_type}:{a.object_id?.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono text-xs">{a.actor_id?.slice(0, 8)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="ip" className="mt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>User</TableHead>
              <TableHead>IP</TableHead><TableHead>Event</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {ips.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No entries.</TableCell></TableRow>}
              {ips.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs">{new Date(i.ts).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{i.user_id?.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">{i.ip ?? "—"}</TableCell>
                  <TableCell>{i.event}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="device" className="mt-4">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>User</TableHead>
              <TableHead>Device</TableHead><TableHead>OS</TableHead><TableHead>App</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {devices.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No entries.</TableCell></TableRow>}
              {devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs">{new Date(d.ts).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{d.user_id?.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">{d.device_id}</TableCell>
                  <TableCell className="text-xs">{d.os}</TableCell>
                  <TableCell className="text-xs">{d.app}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

        </TabsContent>
      </Tabs>
    </Card>
  );
}
