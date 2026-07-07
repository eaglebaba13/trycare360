import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setActiveTenant } from "@/lib/api/tenant.functions";
import { useSession, SESSION_QUERY_KEY } from "./use-session";

export function useTenant() {
  const { data } = useSession();
  const qc = useQueryClient();
  const call = useServerFn(setActiveTenant);
  const mut = useMutation({
    mutationFn: (input: { tenantId: string | null; orgUnitId?: string | null }) =>
      call({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  });
  return {
    activeTenantId: data?.profile?.active_tenant_id ?? null,
    activeOrgUnitId: data?.profile?.active_org_unit_id ?? null,
    tenants: data?.tenants ?? [],
    setActiveTenant: (tenantId: string | null, orgUnitId: string | null = null) =>
      mut.mutateAsync({ tenantId, orgUnitId }),
    isSwitching: mut.isPending,
  };
}
