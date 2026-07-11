/**
 * Scheduling Analytics — shared window state + branch filter.
 * Uses SchedulerShell for consistent scheduling UX; child pages consume
 * `useSchedulingWindow` for the same `from/to/branch_id` values.
 */
import { useMemo, useState } from "react";
import { startOfDay, endOfDay, subDays } from "date-fns";

export type SchedulingWindow = {
  from: string;
  to: string;
  branch_id: string | null;
};

export function useSchedulingWindow(): [
  SchedulingWindow,
  (p: Partial<SchedulingWindow>) => void,
  Date,
  (d: Date) => void,
  Date,
  (d: Date) => void,
] {
  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 30));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string | null>(null);
  const value = useMemo<SchedulingWindow>(
    () => ({
      from: startOfDay(fromDate).toISOString(),
      to: endOfDay(toDate).toISOString(),
      branch_id: branchId,
    }),
    [fromDate, toDate, branchId],
  );
  const patch = (p: Partial<SchedulingWindow>) => {
    if (p.branch_id !== undefined) setBranchId(p.branch_id);
  };
  return [value, patch, fromDate, setFromDate, toDate, setToDate];
}
