# Phase 2.9 Finance & Accounting — Stage 2 (Business Layer)

Stage 2 delivers the server-side business layer over the Stage 1
`fin_*` schema: repositories, engines, validators, helpers, and typed
server functions.

## Layout

```
src/lib/finance/
├── events.ts                 # Stage 1 event catalogue (reused)
├── validators.ts             # Zod schemas — ONLY input surface for functions
├── helpers.server.ts         # Thin wrappers over platform RPCs + audit + numbering
├── repositories.server.ts    # Pure CRUD wrappers around every fin_* table
├── engines/
│   ├── accounting.engine.server.ts     # Chart of accounts + fiscal calendar
│   ├── ledger.engine.server.ts         # GL / AR / AP projections
│   ├── journal.engine.server.ts        # Double-entry, posting, reversal
│   ├── cash.engine.server.ts           # Receipts, payments, petty, recon
│   ├── expense.engine.server.ts        # Expense submission + decision
│   ├── asset.engine.server.ts          # Register / depreciate / dispose
│   ├── budget.engine.server.ts         # Budget CRUD + variance projection
│   ├── forecast.engine.server.ts       # Scenario forecasts
│   ├── royalty.engine.server.ts        # Franchise royalty accrual + settle
│   ├── vendor.engine.server.ts         # AP bills + payments
│   ├── tax.engine.server.ts            # GST / TDS / TCS ledger
│   └── financial-report.engine.server.ts  # TB / P&L / BS / CF
└── *.functions.ts            # createServerFn — chart / journal / cash / ...
```

## Contract

- Every server function uses `requireSupabaseAuth` (bearer-token
  authenticated) and parses input through a Zod schema in `validators.ts`.
- Server functions never run SQL directly. They construct one repository
  and/or one engine, delegate, and return a plain DTO.
- Engines never run SQL directly. They use the repositories in
  `repositories.server.ts`.
- Repositories are pure CRUD — no business logic, no cross-table
  orchestration.

## Platform primitives reused

| Concern         | Helper                          | Underlying platform RPC          |
|-----------------|---------------------------------|----------------------------------|
| Workflow bus    | `emitFinanceEvent`              | `emit_automation_event`          |
| Timeline        | `logFinanceTimeline`            | `log_timeline_event`             |
| Search index    | `indexFinanceSearch`            | `index_search_entity`            |
| Numbering       | `nextFinanceNumber`             | `fin_next_sequence`              |
| Approvals       | Emitted via `finance.*` events  | Shared Approval Engine consumes  |
| Notifications   | Emitted via `finance.*` events  | Shared Notification Engine       |
| Analytics / KPI | Reads from `fin_*`              | Analytics Snapshot Engine        |
| Reports / PDF   | Payload built in engines        | Shared Reports module renders    |
| Revenue         | Journals via `source_module`    | Revenue / Commission ledgers     |
| Billing         | Journals via `source_module`    | Billing engine posts through JE  |

No new event bus, timeline, search index, revenue ledger, approval
engine, notification engine, or report renderer is introduced. Every
downstream effect flows through the primitives above.

## Business rules enforced

- **Double-entry** — `JournalEngine.create` rejects unbalanced entries
  and emits `finance.journal.unbalanced`.
- **Period lock** — journal create / post rejects when the target
  accounting period is not `open`. Period close rejects when draft
  journals still exist inside the period.
- **Immutable posting** — posted journals cannot be edited; changes go
  through `reverseJournal` which writes a mirrored `JE-REV-*` entry
  linked via `reversed_entry_id`.
- **Sequence-safe numbering** — every voucher, receipt, payment, bill,
  journal, settlement number comes from `fin_next_sequence`.
- **Approval routing** — Expense submit, vendor bill approve, royalty
  settle only mutate their own record; approval routing is delegated to
  the shared Approval Engine which listens for the emitted events.
- **Audit trail** — every state transition writes a row into
  `fin_audit_log` with actor, before, after, event type and metadata.

Stage 3 (UI) and Stage 4 (analytics) consume these server functions
directly — they never bypass into raw table access.
