import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Mic, Calendar, Pill, Image as ImgIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHAT_SEED, type ChatMsg } from "@/lib/dr-hair/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_public/dr-hair/coach")({
  head: () => ({ meta: [{ title: "Hair Coach — Dr Hair" }] }),
  component: CoachPage,
});

function CoachPage() {
  const [msgs, setMsgs] = useState<ChatMsg[]>(CHAT_SEED);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  function send(body: string, kind: ChatMsg["kind"] = "text") {
    if (!body.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMsgs((m) => [
      ...m,
      { id: crypto.randomUUID(), from: "me", text: body, ts: now, kind },
    ]);
    setText("");
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          from: "coach",
          text: coachReply(body),
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          kind: "text",
        },
      ]);
    }, 700);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-elev-2">
        <div className="grid lg:grid-cols-[280px_1fr]">
          {/* Coach panel */}
          <aside className="border-b bg-gradient-to-b from-[color:var(--dh-primary-soft)] to-transparent p-6 lg:border-b-0 lg:border-r">
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-[color:var(--dh-primary)] to-[color:var(--dh-secondary)] shadow-elev-2" />
            <div className="mt-4 text-center">
              <div className="font-display text-lg font-semibold">Nisha R.</div>
              <div className="text-xs text-muted-foreground">Certified Hair & Nutrition Coach</div>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[color:var(--dh-secondary-soft)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--dh-primary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--dh-success)]" /> Online now
              </div>
            </div>
            <div className="mt-6 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between"><span>Experience</span><span className="font-medium text-foreground">6 yrs</span></div>
              <div className="flex items-center justify-between"><span>Patients</span><span className="font-medium text-foreground">412</span></div>
              <div className="flex items-center justify-between"><span>Avg. rating</span><span className="font-medium text-foreground">4.9 ★</span></div>
            </div>
            <div className="mt-6 space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" /> Book review
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Pill className="mr-2 h-4 w-4" /> Medicine reminders
              </Button>
            </div>
          </aside>

          {/* Chat */}
          <div className="flex h-[70vh] flex-col">
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
              {msgs.map((m) => (
                <MsgBubble key={m.id} m={m} />
              ))}
            </div>

            <div className="border-t bg-background p-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {["I took my meds", "Feeling less hair fall", "Book a consult", "Share progress photo"].map((q) => (
                  <button
                    key={q}
                    className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
                    onClick={() => send(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(text);
                }}
                className="flex items-center gap-2"
              >
                <Button type="button" variant="ghost" size="icon" aria-label="Attach">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Photo">
                  <ImgIcon className="h-4 w-4" />
                </Button>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Message your coach…"
                />
                <Button type="button" variant="ghost" size="icon" aria-label="Voice">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className="bg-[color:var(--dh-primary)] text-white hover:bg-[color:var(--dh-primary)]/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function coachReply(input: string): string {
  const s = input.toLowerCase();
  if (s.includes("photo")) return "Great! Please upload from the Progress tab and I'll compare against last month.";
  if (s.includes("book") || s.includes("consult")) return "Sure — I've queued a slot with Dr. Aditi for Friday 6 PM. Confirmed?";
  if (s.includes("meds") || s.includes("med")) return "Perfect. Consistency is 80% of results. Keep going!";
  if (s.includes("hair fall")) return "That's a great sign. Track shedding for another 7 days — expect a further drop.";
  return "Noted! I'll add this to your weekly review with the dermatologist.";
}

function MsgBubble({ m }: { m: ChatMsg }) {
  const mine = m.from === "me";
  if (m.kind === "reminder") {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-amber-100 px-3 py-1 text-[11px] text-amber-800">🔔 {m.text}</div>
      </div>
    );
  }
  if (m.kind === "review") {
    return (
      <div className="flex justify-center">
        <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-elev-1">
          <div className="font-semibold">📅 {m.text}</div>
          <div className="text-muted-foreground">Tap dashboard to confirm</div>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-elev-1",
          mine
            ? "rounded-br-sm bg-[color:var(--dh-primary)] text-white"
            : "rounded-bl-sm bg-white text-foreground",
        )}
      >
        <div>{m.text}</div>
        <div className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>{m.ts}</div>
      </div>
    </div>
  );
}
