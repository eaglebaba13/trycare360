# Phase 2.4 — Scheduling Platform (Stage 2)

Server-side engines, repositories, and TanStack server functions for the
Appointment & Scheduling platform. **No UI in this stage.**

## Layout

| File | Purpose |
|---|---|
| `events.ts` | Event constant contracts consumed by the Workflow Engine |
| `validators.ts` | Zod schemas for every server function (client-safe) |
| `repositories.server.ts` | Thin typed wrappers over Supabase tables |
| `policy.server.ts` | Scheduling Policy Engine (configurable only) |
| `capacity.server.ts` | Capacity Engine (plan + dimensions + overrides) |
| `conflict.server.ts` | Conflict Engine (locks, holds, overlap sweep, override) |
| `slots.server.ts` | Slot Engine (findSlots, checkAvailability, generateSlots) |
| `queue.server.ts` | Queue Engine (tokens, call, skip, recall, transfer, wait) |
| `waitlist.server.ts` | Waitlist Engine (find, offer, expire, accept, decline) |
| `recurrence.server.ts` | RFC 5545 subset materialization for series |
| `packages.server.ts` | Package sequence generation + dependency validation |
| `calendar.server.ts` | Google/Outlook provider abstraction (stubs for Stage 5) |
| `coordinator.server.ts` | **Booking Transaction Coordinator** — every booking goes through it |
| `appointments.functions.ts` | book/cancel/reschedule/check-in/start/complete/feedback/no-show/get |
| `slots.functions.ts` | findSlots / checkAvailability / holdSlot / releaseHold / generateSlots |
| `queue.functions.ts` | issue / callNext / skip / recall / transfer / estimateWait |
| `waitlist.functions.ts` | find / offer / expire / accept / decline |
| `engines.functions.ts` | materializeRecurrence / createPackageSequence / validateDependencies / evaluatePolicies / checkCapacity |

## Booking Transaction Coordinator

Single entry point for creating an appointment — regardless of origin
(website, AI consult, telecaller, mobile app, reception, workflow, API).

Pipeline:

1. **Policies** — `SchedulingPolicyEngine.evaluate()` (block/warn)
2. **Dependencies** — `PackageEngine.validateDependencies()`
3. **Availability** — `SlotEngine.checkAvailability()`
4. **Capacity** — `CapacityEngine.checkCapacity()`
5. **Temporary hold** — `ConflictEngine.createHold()` (soft transaction)
6. **Insert appointment** — `AppointmentRepository.insert()`
7. **Status history** — `appointment_status_history`
8. **Queue enrollment** — walk-ins issued a token
9. **Emit `appointment.created`** — via `emit_automation_event`
10. **Timeline + search** — `log_timeline_event`, `index_search_entity`
11. **Release hold** — appointment owns the slot now

On failure, the hold is released and a typed `BookingError` is thrown
(`policy_blocked`, `dependency_missing`, `unavailable`,
`capacity_exhausted`, `hold_failed`, `insert_failed`).

## Events emitted

`appointment.created`, `appointment.confirmed`, `appointment.cancelled`,
`appointment.rescheduled`, `appointment.checked_in`, `appointment.started`,
`appointment.completed`, `appointment.feedback_received`,
`queue.token_issued`, `queue.called`, `waitlist.offer_sent`,
`capacity.exhausted`, `resource.locked`.

## Rules honored

- **No hardcoded business rules** — every rule lives in
  `scheduling_policies` and is evaluated by the Policy Engine.
- **No duplicate audit/timeline/search primitives** — reuse
  `log_timeline_event`, `index_search_entity`, `emit_automation_event`.
- **All mutations authenticated** — every server fn uses
  `requireSupabaseAuth` and is scoped by RLS.
- **Zod validators** on every entrypoint; no `any` at the wire.
- **Server-only files** end in `.server.ts` or `.functions.ts`.

Stage 3+ (UI, calendar workspace, check-in screens, analytics) sits on
top of these functions without touching business logic here.
