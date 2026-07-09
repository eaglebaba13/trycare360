import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export interface FilterBarProps {
  search?: string;
  onSearchChange?: (v: string) => void;
  placeholder?: string;
  children?: ReactNode;
  onReset?: () => void;
  actions?: ReactNode;
}

export function FilterBar({ search, onSearchChange, placeholder = "Search…", children, onReset, actions }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
      {onSearchChange && (
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="pl-8 h-9"
          />
        </div>
      )}
      {children}
      <div className="flex-1" />
      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="h-4 w-4 mr-1" /> Reset
        </Button>
      )}
      {actions}
    </div>
  );
}
