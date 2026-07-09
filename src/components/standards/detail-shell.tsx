import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export interface DetailTab {
  id: string;
  label: string;
  content: ReactNode;
  count?: number;
}

export interface DetailShellProps {
  header: ReactNode;
  sidebar?: ReactNode;
  tabs: DetailTab[];
  defaultTab?: string;
}

export function DetailShell({ header, sidebar, tabs, defaultTab }: DetailShellProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">{header}</CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <Tabs defaultValue={defaultTab ?? tabs[0]?.id} className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="w-max">
                {tabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                    {t.label}
                    {t.count != null && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                        {t.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {tabs.map((t) => (
              <TabsContent key={t.id} value={t.id} className="mt-4">
                {t.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>
        {sidebar && <aside className="min-w-0">{sidebar}</aside>}
      </div>
    </div>
  );
}
