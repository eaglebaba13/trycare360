import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { data } = useSession();
  const unread = data?.unreadNotifications ?? 0;
  const { notifications, markRead, markAllRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium leading-4 text-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllRead()}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[380px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "px-4 py-3 hover:bg-muted/50 cursor-pointer",
                    !n.read_at && "bg-accent/30",
                  )}
                  onClick={() => !n.read_at && markRead(n.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(n.ts).toLocaleDateString()}
                    </span>
                  </div>
                  {n.body && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {n.body}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
