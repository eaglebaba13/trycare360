import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSessionBootstrap, type SessionBootstrap } from "@/lib/api/session.functions";

export const SESSION_QUERY_KEY = ["session-bootstrap"] as const;

export function useSession() {
  const fetchSession = useServerFn(getSessionBootstrap);
  return useQuery<SessionBootstrap>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => fetchSession({}),
    staleTime: 60_000,
    retry: 1,
  });
}
