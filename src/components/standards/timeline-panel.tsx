import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "@/lib/standards-format";

export interface TimelineItem {
  ts: string;
  event_type: string;
  title: string;
  body?: string | null;
  source?: string;
}

export function TimelinePanel({ items, emptyMessage = "No activity yet." }: { items: TimelineItem[]; emptyMessage?: string }) {
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</div>;
  }
  return (
    <ol className="relative border-l border-border ml-2 space-y-4">
      {items.map((it, i) => (
        <li key={`${it.ts}-${i}`} className="ml-4">
          <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary" />
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{it.title}</div>
                  {it.body && <div className="text-xs text-muted-foreground mt-1">{it.body}</div>}
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className="text-[10px]">{it.event_type}</Badge>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {formatDistanceToNow(it.ts)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}
