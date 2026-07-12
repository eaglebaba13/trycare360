/**
 * Shared date-window state for the Clinical Analytics tabs.
 * Purely client-side; each dashboard passes it to the corresponding
 * Stage 6 server function.
 */
import { useState } from "react";

export interface ClinicalWindow {
  from: string;
  to: string;
}

export function useClinicalWindow(days = 30): [ClinicalWindow, (patch: Partial<ClinicalWindow>) => void, () => void] {
  const [w, setW] = useState<ClinicalWindow>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  });
  const patch = (p: Partial<ClinicalWindow>) => setW((cur) => ({ ...cur, ...p }));
  const reset = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setW({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) });
  };
  return [w, patch, reset];
}
