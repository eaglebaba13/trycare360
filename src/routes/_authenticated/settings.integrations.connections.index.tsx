import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listConnections } from "@/lib/api/integrations.functions";
import { useTenant } from "@/hooks/use-tenant";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings/integrations/connections/")({
  component: ConnectionsList,
});

function ConnectionsList() {
  const { activeTenantId } = useTenant();
  const call = useServerFn(listConnections);
  const { data = [] } = useQuery({
    queryKey: ["integrations", "connections", activeTenantId],
    queryFn: () => call({ data: { tenantId: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  return (
    <Card className="p-0 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last sync</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data as {
            id: string;
            label: string;
            provider_code: string;
            status: string;
            last_sync_at: string | null;
          }[]).length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                No connections yet. Start from the Catalog tab.
              </TableCell>
            </TableRow>
          ) : (
            (data as {
              id: string;
              label: string;
              provider_code: string;
              status: string;
              last_sync_at: string | null;
            }[]).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.label}</TableCell>
                <TableCell className="capitalize">{c.provider_code}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      c.status === "connected" ? "default" : c.status === "error" ? "destructive" : "outline"
                    }
                  >
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.last_sync_at ? new Date(c.last_sync_at).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link
                      to="/settings/integrations/connections/$providerCode"
                      params={{ providerCode: c.provider_code }}
                    >
                      Open
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
