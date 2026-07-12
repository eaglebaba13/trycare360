# Phase 2.6 — Pharmacy & Medication Management (Stage 2)

Stage 2 delivers the **server-side pipeline** for the Enterprise Pharmacy
platform: repositories, validators, business engines, and server
functions. No UI, no routes, no new tables — everything runs on top of
the Stage 1 schema.

## Layout

```
src/lib/pharmacy/
├── events.ts                              # workflow event constants (Stage 1)
├── validators.ts                          # Zod schemas for all inputs
├── repositories.server.ts                 # 17 typed repos (no logic)
├── helpers.server.ts                      # emit / timeline / search / revenue
├── engines/
│   ├── inventory.engine.server.ts         # ledger + projection + reservations
│   ├── batch.engine.server.ts             # FEFO, expiry, quarantine, recall block
│   ├── warehouse.engine.server.ts         # hierarchy + transfers
│   ├── dispense.engine.server.ts          # prescription → dispense pipeline
│   ├── purchase.engine.server.ts          # PO lifecycle + GRN posting
│   ├── supplier.engine.server.ts          # preferred supplier + scoring
│   ├── controlled.engine.server.ts        # controlled register + witness rules
│   ├── coldchain.engine.server.ts         # temperature validation + excursions
│   ├── recall.engine.server.ts            # batch + patient impact scanning
│   ├── kit.engine.server.ts               # atomic kit expansion / reservation
│   └── forecast.engine.server.ts          # interfaces only (Stage 5/6 fills in)
├── masters.functions.ts                   # drugs, kits
├── inventory.functions.ts                 # receive / adjust / reserve / destroy
├── warehouse.functions.ts                 # warehouses, locations, bins
├── supplier.functions.ts                  # suppliers + supplier products
├── purchase.functions.ts                  # PO + GRN
├── dispense.functions.ts                  # dispense + cancel + list
├── transfers.functions.ts                 # inter-warehouse transfers
├── returns.functions.ts                   # patient + supplier returns
├── controlled.functions.ts                # controlled register + variance
├── coldchain.functions.ts                 # cold-chain readings
├── recall.functions.ts                    # recall initiate / complete
└── analytics.functions.ts                 # near-expiry, forecasts, snapshot
```

## Golden rules (do not violate)

1. **Ledger is source of truth.** Every stock change goes through
   `InventoryEngine.postMovement()` which writes an immutable row to
   `pharmacy_inventory_ledger`. Stock-on-hand is a projection only.
2. **Never update the ledger.** Reversals create a new ledger row with
   `reverses_id` set. Stage 1 DB triggers enforce this too.
3. **Never write to clinical tables.** `DispenseEngine` loads context via
   the shared `ClinicalContextLoader` and validates prescriptions
   read-only. Clinical EMR owns diagnosis, treatment plans, and
   prescription creation; Pharmacy owns dispensing and inventory.
4. **FEFO is the default.** `BatchEngine.pickFefo()` sorts by
   `expiry_date` ascending, skips recalled/quarantined batches, and never
   picks expired batches.
5. **Controlled substances need a witness.** Any register entry with
   `quantity_out > 0` requires `witness_id`. Balance underflows throw.
6. **Reuse the platform.** Events go through `emit_automation_event`,
   timeline goes through `log_timeline_event`, search goes through
   `index_search_entity`, revenue goes through `revenue_events`. No
   pharmacy-specific event bus.

## Pharmacy pipeline (canonical dispense flow)

```
 clinician prescribes (Clinical EMR)                       [read-only for us]
        │
        ▼
 DispenseEngine.createDispense()
        │  1. validate prescription   (read-only)
        │  2. load clinical context   (ClinicalContextLoader)
        │  3. FEFO batch selection    (BatchEngine.pickFefo)
        │  4. insert dispense header + items
        │  5. commit outbound stock   (InventoryEngine → ledger + projection)
        │  6. controlled register     (ControlledDrugEngine, if scheduled)
        │  7. prescription fill row   (PrescriptionFillRepository)
        │  8. revenue_event           (recordPharmacyRevenue)
        │  9. workflow event          (emit_automation_event)
        │ 10. timeline + search       (log_timeline_event + index_search_entity)
        ▼
        result: { dispense, warnings }
```

## Reused platform services

| Layer               | Reused via                                            |
| ------------------- | ----------------------------------------------------- |
| Auth / RBAC / RLS   | `requireSupabaseAuth` middleware + Stage 1 policies   |
| Clinical context    | `@/lib/clinical/context-loader.server`                |
| Workflow / triggers | `emit_automation_event` RPC                           |
| Timeline            | `log_timeline_event` RPC                              |
| Search              | `index_search_entity` RPC                             |
| Revenue             | `revenue_events` table (via `recordPharmacyRevenue`)  |
| Approvals           | `pharmacy_purchase_orders.approval_request_id` FK     |
| Notifications       | Workflow rules subscribed to `pharmacy.*` events       |
| Identity            | `context.userId` set by auth middleware               |
| Analytics           | Read from Stage 1 tables; dashboards land in Stage 6  |

## Deferred to later stages

- Forecasting model (Stage 5/6 provides a `ForecastProvider`).
- Pharmacy AI Assistant (Stage 5).
- Analytics dashboards, executive BI, supplier KPIs, warehouse KPIs
  (Stage 6).
- UI: Drug catalog UI, dispensing workspace, PO workspace, controlled
  register UI, recall workspace (Stages 3/4/5).
