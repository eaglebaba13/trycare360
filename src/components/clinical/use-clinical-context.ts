/**
 * useClinicalContext — the single, canonical data hook for every
 * Clinical / EMR workspace surface (Doctor, Therapist, encounter view,
 * dashboards). It wraps the Stage 2 `getClinicalContext` server function
 * so no screen fires independent queries for patient data, allergies,
 * vitals, scheduling, billing, or history.
 *
 * DO NOT bypass this hook. Add new derived views on top of the returned
 * context instead of introducing parallel loaders.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getClinicalContext } from "@/lib/clinical/clinical.functions";

export type ClinicalContextData = Awaited<ReturnType<typeof getClinicalContext>>;

export function useClinicalContext(args: {
  tenantId: string | null | undefined;
  personId: string | null | undefined;
  encounterId?: string | null;
  historyLimit?: number;
}) {
  const fn = useServerFn(getClinicalContext);
  return useQuery<ClinicalContextData>({
    queryKey: [
      "clinical-context",
      args.tenantId,
      args.personId,
      args.encounterId ?? null,
      args.historyLimit ?? 10,
    ],
    queryFn: () =>
      fn({
        data: {
          tenantId: args.tenantId!,
          personId: args.personId!,
          encounterId: args.encounterId ?? null,
          historyLimit: args.historyLimit ?? 10,
        },
      }),
    enabled: Boolean(args.tenantId && args.personId),
    staleTime: 15_000,
  });
}
