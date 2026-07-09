import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/consultations/definitions")({
  component: Definitions,
});

function Definitions() {
  const { data } = useQuery({
    queryKey: ["assessment-defs"],
    queryFn: async () => {
      const { data } = await supabase.from("assessment_definitions").select("*").order("category");
      return data ?? [];
    },
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(data ?? []).map((d) => (
        <Card key={d.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{d.name}</CardTitle>
              <Badge variant={d.is_active ? "default" : "secondary"}>{d.is_active ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">{d.code} · v{d.version} · <span className="capitalize">{d.category}</span></div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>{d.description}</div>
            <div className="text-xs text-muted-foreground">
              {(d.sections as Array<{ questions: unknown[] }>).reduce((acc, s) => acc + (s.questions?.length ?? 0), 0)} questions across{" "}
              {(d.sections as unknown[]).length} sections · {(d.photo_slots as string[]).length} photo slots
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
