/**
 * Interactive Organization Tree with expand/collapse, search and HTML5 drag & drop.
 */
import { useMemo, useState, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Search,
  GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  listOrgUnits,
  moveOrgUnit,
  type OrgUnitRow,
} from "@/lib/api/organization.functions";

const TYPE_LABEL: Record<string, string> = {
  platform: "Platform",
  corporate: "Corporate HQ",
  state_master: "State Master",
  city_franchise: "City Franchise",
  advanced_center: "Advanced Center",
  express_center: "Express Center",
  department: "Department",
};

type Node = OrgUnitRow & { children: Node[] };

function buildTree(rows: OrgUnitRow[]): Node[] {
  const map = new Map<string, Node>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  });
  return roots;
}

export function OrgTree({
  onSelect,
  selectedId,
  tenantId,
}: {
  onSelect?: (node: OrgUnitRow) => void;
  selectedId?: string;
  tenantId?: string | null;
}) {
  const list = useServerFn(listOrgUnits);
  const move = useServerFn(moveOrgUnit);
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["org-units", tenantId ?? "all"],
    queryFn: () => list({ data: { tenantId: tenantId ?? undefined } }),
  });

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(rows), [rows]);
  const matchIds = useMemo(() => {
    if (!search.trim()) return null;
    const s = search.toLowerCase();
    return new Set(
      rows
        .filter((r) => r.name.toLowerCase().includes(s) || (r.code ?? "").toLowerCase().includes(s))
        .map((r) => r.id),
    );
  }, [rows, search]);

  const moveMut = useMutation({
    mutationFn: (v: { unitId: string; newParentId: string | null }) => move({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-units"] });
      toast.success("Moved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="border rounded-md bg-card">
      <div className="p-3 border-b flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search org units…"
          className="h-8 border-0 shadow-none focus-visible:ring-0"
        />
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(new Set(rows.map((r) => r.id)))}
        >
          Expand all
        </button>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(new Set())}
        >
          Collapse
        </button>
      </div>
      <div className="p-2 max-h-[600px] overflow-auto">
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-4">Loading…</div>
        ) : tree.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4">
            No org units yet. Create one to start the hierarchy.
          </div>
        ) : (
          tree.map((n) => (
            <TreeNode
              key={n.id}
              node={n}
              depth={0}
              expanded={expanded}
              setExpanded={setExpanded}
              matchIds={matchIds}
              selectedId={selectedId}
              onSelect={onSelect}
              onDrop={(unitId, targetId) =>
                moveMut.mutate({ unitId, newParentId: targetId })
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  setExpanded,
  matchIds,
  selectedId,
  onSelect,
  onDrop,
}: {
  node: Node;
  depth: number;
  expanded: Set<string>;
  setExpanded: (s: Set<string>) => void;
  matchIds: Set<string> | null;
  selectedId?: string;
  onSelect?: (n: OrgUnitRow) => void;
  onDrop: (unitId: string, targetId: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const isOpen = expanded.has(node.id) || (matchIds !== null);
  const hasChildren = node.children.length > 0;
  const dim = matchIds !== null && !matchIds.has(node.id) && !descHasMatch(node, matchIds);

  const toggle = () => {
    const next = new Set(expanded);
    if (next.has(node.id)) next.delete(node.id);
    else next.add(node.id);
    setExpanded(next);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/org-unit", node.id);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("text/org-unit")) return;
    e.preventDefault();
    setDragOver(true);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData("text/org-unit");
    if (id && id !== node.id) onDrop(id, node.id);
  };

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "group flex items-center gap-1 px-1.5 py-1 rounded-md cursor-pointer text-sm transition-colors",
          selectedId === node.id
            ? "bg-primary/10 text-foreground"
            : "hover:bg-accent/60",
          dragOver && "ring-2 ring-primary/60 bg-primary/10",
          dim && "opacity-40",
        )}
        style={{ paddingLeft: 6 + depth * 16 }}
        onClick={() => onSelect?.(node)}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100" />
        {hasChildren ? (
          <button
            type="button"
            className="p-0.5 rounded hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Building2 className="h-3.5 w-3.5 text-primary/70" />
        <span className="font-medium truncate">{node.name}</span>
        {node.code && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {node.code}
          </span>
        )}
        <Badge variant="outline" className="ml-auto text-[10px] py-0 px-1.5">
          {TYPE_LABEL[node.type] ?? node.type}
        </Badge>
      </div>
      {isOpen &&
        node.children.map((c) => (
          <TreeNode
            key={c.id}
            node={c}
            depth={depth + 1}
            expanded={expanded}
            setExpanded={setExpanded}
            matchIds={matchIds}
            selectedId={selectedId}
            onSelect={onSelect}
            onDrop={onDrop}
          />
        ))}
    </div>
  );
}

function descHasMatch(node: Node, matchIds: Set<string>): boolean {
  if (matchIds.has(node.id)) return true;
  return node.children.some((c) => descHasMatch(c, matchIds));
}
