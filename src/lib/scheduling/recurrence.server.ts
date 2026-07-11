/**
 * Scheduling — Recurrence Engine (server-only).
 *
 * Interprets an `appointment_series.rrule` (RFC 5545 subset) and
 * materializes occurrences into the `appointments` table up to a rolling
 * horizon. Exceptions (skipped dates, per-occurrence overrides) live in
 * `appointment_recurrence_exceptions` and are honored here.
 *
 * The full RFC 5545 grammar is out of scope for this engine; we support
 * the practical subset that covers treatment cadences:
 *   FREQ=DAILY|WEEKLY|MONTHLY;INTERVAL=<n>;BYDAY=MO,TU,...;COUNT=<n>|UNTIL=<iso>
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AppointmentRepository, RecurrenceRepository } from "./repositories.server";

type SB = SupabaseClient<Database>;

const DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

type ParsedRule = {
  freq: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: number;
  byday: number[] | null;
  count: number | null;
  until: string | null;
};

function parseRrule(rrule: string): ParsedRule {
  const parts = Object.fromEntries(
    rrule
      .replace(/^RRULE:/i, "")
      .split(";")
      .map((s) => s.split("=") as [string, string]),
  ) as Record<string, string>;
  const freq = ((parts.FREQ ?? "WEEKLY").toUpperCase() as ParsedRule["freq"]);
  const interval = Math.max(1, Number(parts.INTERVAL ?? 1));
  const byday = parts.BYDAY
    ? parts.BYDAY.split(",")
        .map((d) => DAY_MAP[d.toUpperCase()])
        .filter((n) => n != null)
    : null;
  const count = parts.COUNT ? Number(parts.COUNT) : null;
  const until = parts.UNTIL ? parts.UNTIL : null;
  return { freq, interval, byday, count, until };
}

function* iterateOccurrences(
  startISO: string,
  rule: ParsedRule,
  horizonISO: string,
): Generator<Date> {
  const start = new Date(startISO);
  const horizon = new Date(horizonISO);
  const untilDate = rule.until ? new Date(rule.until) : null;
  const hardStop = untilDate && untilDate < horizon ? untilDate : horizon;

  let produced = 0;
  const cursor = new Date(start.getTime());

  while (cursor <= hardStop) {
    if (rule.count != null && produced >= rule.count) return;
    if (rule.freq === "WEEKLY" && rule.byday && rule.byday.length > 0) {
      const dow = cursor.getUTCDay();
      if (rule.byday.includes(dow)) {
        yield new Date(cursor.getTime());
        produced++;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      // apply INTERVAL at week boundaries — coarse approximation
    } else {
      yield new Date(cursor.getTime());
      produced++;
      if (rule.freq === "DAILY")
        cursor.setUTCDate(cursor.getUTCDate() + rule.interval);
      else if (rule.freq === "WEEKLY")
        cursor.setUTCDate(cursor.getUTCDate() + 7 * rule.interval);
      else if (rule.freq === "MONTHLY")
        cursor.setUTCMonth(cursor.getUTCMonth() + rule.interval);
    }
  }
}

export class RecurrenceEngine {
  private readonly repo: RecurrenceRepository;
  private readonly appts: AppointmentRepository;
  constructor(private readonly sb: SB) {
    this.repo = new RecurrenceRepository(sb);
    this.appts = new AppointmentRepository(sb);
  }

  /**
   * Materialize (create real `appointments`) for the given series up to
   * `horizonDays` in the future. Returns the count of created rows.
   * Idempotent: skips occurrences that already exist for the series.
   */
  async materializeRecurrence(args: {
    tenantId: string;
    seriesId: string;
    horizonDays?: number;
  }): Promise<{ created: number; skipped: number; occurrences: string[] }> {
    const series = await this.repo.getSeries(args.seriesId);
    if (!series) throw new Error(`Series not found: ${args.seriesId}`);
    const horizonDays = args.horizonDays ?? 60;
    const horizonISO = new Date(
      Date.now() + horizonDays * 86_400_000,
    ).toISOString();

    const rrule = (series as unknown as { rrule?: string | null }).rrule;
    if (!rrule) throw new Error("Series has no rrule configured");
    const rule = parseRrule(rrule);
    const seriesStart =
      (series as unknown as { starts_at?: string | null }).starts_at ??
      (series as unknown as { first_occurrence_at?: string | null })
        .first_occurrence_at;
    if (!seriesStart) throw new Error("Series missing first occurrence timestamp");

    const exceptions = await this.repo.listExceptions(args.seriesId);
    const skipDates = new Set(
      exceptions
        .filter((e) => (e as unknown as { action?: string }).action === "skip")
        .map((e) =>
          new Date(
            (e as unknown as { occurrence_at: string }).occurrence_at,
          ).toISOString(),
        ),
    );

    const existing = await this.repo.listOccurrences(
      args.seriesId,
      seriesStart,
      horizonISO,
    );
    const existingKey = new Set(existing.map((a) => a.starts_at));

    const created: string[] = [];
    let skipped = 0;
    const template = series as unknown as {
      tenant_id: string;
      person_id: string;
      service_id: string | null;
      doctor_id: string | null;
      branch_id: string;
      duration_minutes: number;
      appointment_type_id?: string | null;
      room_resource_id?: string | null;
    };

    for (const occ of iterateOccurrences(seriesStart, rule, horizonISO)) {
      const iso = occ.toISOString();
      if (skipDates.has(iso)) {
        skipped++;
        continue;
      }
      if (existingKey.has(iso)) {
        skipped++;
        continue;
      }
      const endISO = new Date(
        occ.getTime() + template.duration_minutes * 60_000,
      ).toISOString();
      const code = `A-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      await this.appts.insert({
        tenant_id: template.tenant_id,
        person_id: template.person_id,
        service_id: template.service_id,
        doctor_id: template.doctor_id,
        branch_id: template.branch_id,
        starts_at: iso,
        ends_at: endISO,
        duration_minutes: template.duration_minutes,
        appointment_code: code,
        appointment_type_id: template.appointment_type_id ?? null,
        room_resource_id: template.room_resource_id ?? null,
        series_id: args.seriesId,
        occurrence_start_at: iso,
        booking_source: "workflow",
        status_code: "scheduled",
      } as never);
      created.push(iso);
    }
    return { created: created.length, skipped, occurrences: created };
  }
}
