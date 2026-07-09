/**
 * Patient Quick Actions bar — module-agnostic. Wire handlers as
 * downstream modules (Appointments, Clinical, Billing) come online.
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  Stethoscope,
  Upload,
  StickyNote,
  FileText,
  Wallet,
  ClipboardCheck,
  MessageCircle,
  ListChecks,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACTIONS = [
  { key: "book", label: "Book Appointment", icon: CalendarPlus },
  { key: "consult", label: "Start Consultation", icon: Stethoscope },
  { key: "upload", label: "Upload Report", icon: Upload },
  { key: "note", label: "Add Note", icon: StickyNote },
  { key: "invoice", label: "Generate Invoice", icon: FileText },
  { key: "payment", label: "Collect Payment", icon: Wallet },
  { key: "assess", label: "Start Assessment", icon: ClipboardCheck },
  { key: "whatsapp", label: "Send WhatsApp", icon: MessageCircle },
  { key: "task", label: "Assign Task", icon: ListChecks },
] as const;

export function QuickActions() {
  const [primary] = useState(ACTIONS.slice(0, 3));
  const overflow = ACTIONS.slice(3);
  const notReady = (label: string) =>
    toast.info(`${label} — connects when its module ships.`);
  return (
    <div className="flex items-center gap-1.5">
      {primary.map((a) => (
        <Button key={a.key} size="sm" variant="outline" onClick={() => notReady(a.label)} className="gap-1.5">
          <a.icon className="h-4 w-4" />
          <span className="hidden md:inline">{a.label}</span>
        </Button>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {overflow.map((a) => (
            <DropdownMenuItem key={a.key} onClick={() => notReady(a.label)} className="gap-2">
              <a.icon className="h-4 w-4" /> {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
