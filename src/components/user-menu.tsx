import { LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { ROLE_LABELS, type RoleCode } from "@/lib/rbac";

export function UserMenu() {
  const { data } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const initials =
    data?.profile?.full_name
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    data?.profile?.email?.[0]?.toUpperCase() ||
    "U";

  const primaryRole = data?.roles[0]?.role_code as RoleCode | undefined;

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 h-10 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={data?.profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="text-sm font-medium truncate max-w-[140px]">
              {data?.profile?.full_name ?? data?.profile?.email ?? "Account"}
            </span>
            {primaryRole && (
              <span className="text-[10px] text-muted-foreground">
                {ROLE_LABELS[primaryRole] ?? primaryRole}
              </span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{data?.profile?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
          <User className="mr-2 h-4 w-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
          <SettingsIcon className="mr-2 h-4 w-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
