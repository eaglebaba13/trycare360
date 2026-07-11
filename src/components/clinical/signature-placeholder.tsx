/**
 * SignaturePlaceholder — electronic-signature affordance used by the
 * SOAP signer, prescription issuer, and consent forms. Stage 4 stores
 * the actor + timestamp in `signature_meta`; real cryptographic signing
 * lands with the trust module later.
 */
import { useState } from "react";
import { PenLine, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/standards-format";

export interface SignaturePlaceholderProps {
  signed?: boolean;
  signedAt?: string | null;
  signedByLabel?: string | null;
  disabled?: boolean;
  onSign?: (note: string) => Promise<void> | void;
  label?: string;
}

export function SignaturePlaceholder({
  signed,
  signedAt,
  signedByLabel,
  disabled,
  onSign,
  label = "Sign",
}: SignaturePlaceholderProps) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (signed) {
    return (
      <div className="rounded-md border bg-emerald-500/5 p-3 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-500" />
        <div className="text-xs text-muted-foreground">
          <div className="font-medium text-foreground">
            Signed {signedAt ? `on ${formatDateTime(signedAt)}` : ""}
          </div>
          {signedByLabel && <div>By {signedByLabel}</div>}
          <div className="text-[10px] uppercase tracking-wider mt-1">Electronic signature (placeholder)</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-md border p-3 space-y-2 bg-muted/20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">Signature required</Badge>
        <span>Real e-signature integration lands with the trust module.</span>
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Optional attestation note"
        disabled={disabled || busy}
        className="text-xs"
      />
      <Button
        size="sm"
        disabled={disabled || busy || !onSign}
        onClick={async () => {
          if (!onSign) return;
          setBusy(true);
          try {
            await onSign(note.trim());
            setNote("");
          } finally {
            setBusy(false);
          }
        }}
      >
        <PenLine className="h-3.5 w-3.5 mr-1" /> {busy ? "Signing…" : label}
      </Button>
    </div>
  );
}
