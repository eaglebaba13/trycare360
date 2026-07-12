import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import {
  PurchaseDashboard,
  PurchaseOrderGrid,
  PurchaseOrderWizard,
} from "@/components/pharmacy/purchase";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pharmacy/purchase")({
  component: PurchasePage,
});

function PurchasePage() {
  const { activeTenantId } = useTenant();
  const [open, setOpen] = useState(false);
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="space-y-4">
      <PurchaseDashboard tenantId={activeTenantId} />
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New purchase order</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Create purchase order</DialogTitle></DialogHeader>
            <PurchaseOrderWizard tenantId={activeTenantId} onCreated={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <PurchaseOrderGrid tenantId={activeTenantId} />
    </div>
  );
}
