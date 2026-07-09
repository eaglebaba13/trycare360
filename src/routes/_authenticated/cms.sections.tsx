import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminListSections, adminSaveSection, adminDeleteSection,
} from "@/lib/cms/marketing.functions";

export const Route = createFileRoute("/_authenticated/cms/sections")({
  component: SectionsPage,
});

function SectionsPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListSections);
  const save = useServerFn(adminSaveSection);
  const del = useServerFn(adminDeleteSection);
  const { data: sections = [] } = useQuery({ queryKey: ["cms-sections"], queryFn: () => list() });

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [json, setJson] = useState('{"type":"hero","data":{"title":"..."}}');

  const saveMut = useMutation({
    mutationFn: async () => {
      const block = JSON.parse(json);
      return save({ data: { name, category, block, is_global: true } });
    },
    onSuccess: () => {
      toast.success("Section saved");
      qc.invalidateQueries({ queryKey: ["cms-sections"] });
      setName(""); setCategory("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-sections"] }),
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight">Section library</h1>
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Save a new section</div>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="hero, cta, testimonials..." /></div>
            <div><Label>Block JSON</Label><Textarea rows={8} className="font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} /></div>
            <Button onClick={() => saveMut.mutate()} disabled={!name || saveMut.isPending}>Save section</Button>
          </div>
        </Card>
        <div className="grid gap-3">
          {(sections as Array<Record<string, unknown>>).map((s) => (
            <Card key={s.id as string} className="flex items-center justify-between p-4">
              <div>
                <div className="font-semibold">{s.name as string}</div>
                <div className="text-xs text-muted-foreground">{(s.category as string) ?? "—"} · {((s.block as { type?: string })?.type) ?? "?"}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => delMut.mutate(s.id as string)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
          {sections.length === 0 && (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No saved sections yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
