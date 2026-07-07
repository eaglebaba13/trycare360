import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { SESSION_QUERY_KEY } from "./use-session";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export function useNotifications() {
  const fetchAll = useServerFn(listNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => fetchAll({}),
    staleTime: 30_000,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => markOne({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => markAll({}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });

  // Realtime — refetch on any change to the user's notifications
  useEffect(() => {
    const channel = supabase
      .channel("notifications-self")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
          qc.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    markRead: (id: string) => markReadMut.mutateAsync(id),
    markAllRead: () => markAllMut.mutateAsync(),
  };
}
