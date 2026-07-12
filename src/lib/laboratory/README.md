# Phase 2.8 Laboratory — Stage 2 Business Layer

Server-side only. UI is Stage 3.

## Architecture

```
src/lib/laboratory/
├── validators.ts                # Zod schemas — the ONLY input surface
├── helpers.server.ts            # emitLabEvent / logLabTimeline / indexLabSearch
│                                # / recordLabRevenue / writeLabAudit / nextDocumentNumber
├── repositories.server.ts       # All Stage 1 tables (lab_* + rad_*) — pure CRUD
├── engines/
│   ├── order.engine.server.ts          # OrderEngine (lifecycle, revenue signal)
│   ├── specimen.engine.server.ts       # SpecimenEngine, BarcodeEngine, AccessionEngine
│   ├── analyzer.engine.server.ts       # AnalyzerEngine (registry + queue + ingest)
│   ├── qc.engine.server.ts             # QualityControlEngine (Westgard), CalibrationEngine
│   ├── result.engine.server.ts         # ReferenceRange / DeltaCheck / CriticalAlert /
│   │                                   # Result / Verification / Release engines
│   ├── microbiology.engine.server.ts   # Microbiology / Culture / Sensitivity engines
│   ├── pathology.engine.server.ts      # PathologyEngine
│   ├── radiology.engine.server.ts      # RadiologyEngine + ImagingMetadataEngine
│   └── distribution.engine.server.ts   # Distribution / ExternalLab / Turnaround
├── orders.functions.ts
├── catalog.functions.ts
├── specimens.functions.ts
├── accessions.functions.ts
├── results.functions.ts
├── verification.functions.ts
├── release.functions.ts
├── qc.functions.ts
├── calibration.functions.ts
├── instrument.functions.ts
├── microbiology.functions.ts
├── pathology.functions.ts
├── radiology.functions.ts
├── distribution.functions.ts
├── external.functions.ts
└── analytics.functions.ts
```

## Lifecycle diagrams

### Lab order

```
placed ─▶ in_progress ─▶ completed
   └──────▶ cancelled
```

### Specimen

```
collected ─▶ in_transit ─▶ received ─▶ stored ─▶ disposed
                                └─▶ rejected
```

### Result

```
pending ─▶ verified ─▶ released
   └▶ amended (with version snapshot) ─▶ verified ─▶ released
```

### Pathology case

```
received ─▶ grossing ─▶ processing ─▶ reviewing ─▶ reported
```

### Radiology study

```
placed ─▶ scheduled ─▶ acquired ─▶ reported
```

## Business rules (each rule lives ONLY inside an engine)

- **Order lifecycle** — `OrderEngine.place / cancel / markInProgress / markCompletedIfAllVerified`
- **Chain of custody** — `SpecimenEngine.collect / transit / reject` append immutable steps to `chain_of_custody`
- **Barcode uniqueness** — `BarcodeEngine.print` retries until a tenant-unique value is allocated
- **Accession numbering** — `AccessionEngine.create` retries until a tenant-unique `accession_no` is allocated
- **Analyzer queue** — `AnalyzerEngine.enqueue` blocks duplicate queue rows for the same order-item + instrument
- **Reference range resolution** — most-specific-match (condition > sex > age)
- **Delta check** — `DeltaCheckEngine.evaluate` compares against most recent prior result for the same person/test; `action:"block"` throws before entry
- **Critical value** — `CriticalAlertEngine.evaluate` marks result critical and emits `lab.result.critical`
- **Westgard QC** — `QualityControlEngine.recordRun` implements 1-2s / 1-3s / 2-2s / R-4s / 4-1s / 10x
- **Calibration** — `CalibrationEngine.record` writes calibration row and emits `lab.calibration.completed`
- **Auto verification** — `VerificationEngine.autoVerify` only advances safe (non-critical, non-delta) results
- **Manual verification** — `VerificationEngine.manualVerify` allows verification of pending/amended
- **Result amendments** — `ResultEngine.amend` snapshots the previous version to `lab_result_versions` before mutating
- **Version history** — `ResultVersionRepository.nextVersion` guarantees monotonically-increasing versions per result
- **Result release** — `ReleaseEngine.release` propagates status to the order item and closes the order when all items are released
- **Microbiology / Culture / Sensitivity** — dedicated engines; emit `microbiology.*` events at each transition
- **Pathology** — case_no allocation + transition events for every stage
- **Radiology / Imaging metadata** — order → schedule → study acquired → reported; DICOM metadata attached separately
- **Distribution** — `DistributionEngine.send` routes external channels (email/whatsapp/sms/fhir/hl7) through the Integration Dispatcher
- **External laboratory** — `ExternalLabEngine.submit / ingestResult` also routes through the Dispatcher
- **Turnaround / SLA** — `TurnaroundEngine.logMilestone / evaluateBreach` emits `lab.tat.breached`

## Reuse matrix

| Concern | Reused module |
|---|---|
| Workflow / automation | `emit_automation_event` RPC (Automation Engine) |
| Timeline | `log_timeline_event` RPC |
| Search | `index_search_entity` RPC |
| Revenue | `revenue_events` table via Revenue module |
| Audit | `lab_audit` table (Stage 1) |
| Billing | `lab_orders.invoice_id`, `rad_orders.invoice_id` — no duplicate billing tables |
| Insurance | `lab_orders.authorization_id`, `rad_orders.authorization_id` |
| Clinical context | Callers pass `clinicalOrderRef` from `ClinicalContextLoader`; the engine does not re-load context |
| Approvals | `lab_test_catalog.requires_approval` funnels into the Approval Engine (Stage 3 UI) |
| Notifications | Notification Engine subscribes to the events emitted here |
| Integrations | `dispatch()` — HL7 / FHIR / ASTM / DICOM / PACS / RIS / External Labs |
| KPI dictionary | Additions from Stage 1 `kpi-definitions.md` — analytics functions expose snapshots only |
| Reports | Data Foundation Reports module (no duplicate reports here) |

## Event flow

```
Order placed ─────▶ emit_automation_event(lab.order.placed)  ─▶ Workflow Engine ─▶ Notification / Timeline / Analytics
Specimen collected ─▶ lab.specimen.collected ─▶ Timeline (person)
Result pending / verified / released ─▶ lab.result.* ─▶ Notification + Timeline
Critical value ─▶ lab.result.critical ─▶ Notification (ack window)
QC violation ─▶ lab.qc.out_of_control ─▶ Notification + Analytics
TAT breach ─▶ lab.tat.breached ─▶ SLA / Analytics
External submit / receive ─▶ lab.external.* (via Integration Dispatcher)
Report delivered / failed ─▶ lab.report.delivered | .delivery_failed
```

## Pipeline

```
Clinical Order → LAB placement → Accession → Specimen collect → Barcode
  → Analyzer queue → Analyzer result ingest → Result entry (range + delta + critical)
  → Verification (auto|manual) → Release → Distribution → Turnaround close
                                                 └─▶ Timeline / Search / Revenue
```

Radiology and Pathology follow parallel pipelines that terminate in the same
Distribution + Turnaround stages. External-lab paths substitute the analyzer
segment with `ExternalLabEngine.submit → ingestResult`.

## What Stage 2 does NOT do

- Ship any React, routes, dashboards, or KPI computations
- Duplicate any billing, insurance, workflow, notification, approval, timeline,
  search, or reports logic
- Introduce any new HTTP calls outside the Integration Dispatcher
- Modify the Stage 1 schema, RLS, or GRANTs
