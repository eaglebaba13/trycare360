import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenant } from "@/hooks/use-tenant";
import { cn } from "@/lib/utils";

export function TenantSwitcher({ className }: { className?: string }) {
  const { tenants, activeTenantId, setActiveTenant, isSwitching } = useTenant();
  const active = tenants.find((t) => t.id === activeTenantId);

  if (tenants.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isSwitching}
          className={cn("gap-2 min-w-[180px] justify-between", className)}
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{active?.name ?? "Select tenant"}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        <DropdownMenuLabel>Switch tenant</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={() => setActiveTenant(t.id)}>
            <span className="truncate">{t.name}</span>
            {t.id === activeTenantId && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
