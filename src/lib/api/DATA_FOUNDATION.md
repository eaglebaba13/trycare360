# Phase 1.5e — Data, Document & Analytics Foundation

Reusable primitives every business module must consume. Do NOT roll a
per-module timeline, notes, documents, reports, widgets, search or analytics.

## Contracts

| Concern | Write API | Read API |
|---|---|---|
| Activity timeline | `log_timeline_event(tenant, entity_type, entity_id, event_type, title, body, meta)` RPC / `logTimelineEvent` serverFn | `listTimeline` serverFn (filter by entity) |
| Documents | `upsertDocument` / `upsertDocumentFolder` | `listDocuments`, `listDocumentFolders`, `listDocumentTags` |
| Notes | `upsertNote` (public/private, pinned, mentions[], attachments[]) | `listNotes` (respects visibility RLS) |
| Search | `index_search_entity(...)` RPC / `indexSearchEntity` serverFn — call whenever a record is created/updated | `search_global(...)` RPC / `searchGlobal` serverFn |
| Widgets | `upsertDashboardLayout` + `upsertWidget` | `listDashboardLayouts` (role/user/tenant), `listWidgets` |
| Reports | `upsertReport`, `queueReportRun`, `upsertReportSchedule` | `listReports`, `listReportRuns` |
| Analytics | `upsertKpi`, insert `analytics_snapshots` | `listKpis`, `listKpiSnapshots` |
| Audit viewer | (auto — audit_logs, activity_logs, ip_logs, device_logs) | `listAuditLogs`, `listActivityLogs`, `listIpLogs`, `listDeviceLogs` |
| Files | `files` metadata + storage buckets | `listFiles` |

## Rules for future modules

1. **Never** query third-party APIs directly — go through the Integration
   Center (`dispatch()`).
2. **Never** hardcode workflow, message templates, notification rules,
   forms or approvals — go through the Automation Engine.
3. **Never** roll your own activity log, notes, documents, reports,
   widgets, search or analytics — use the primitives above.
4. Every dropdown that a Super Admin might want to change lives in
   `masters` (see `settings.masters`) — no hardcoded enums in components.
5. Whenever a business record is created/updated, also call
   `index_search_entity` so it appears in global search, and
   `log_timeline_event` so it appears on its own timeline.

## Masters added

- `timeline_event_types`, `document_categories`, `note_visibility`,
  `search_entity_types`, `widget_types`, `report_export_formats`,
  `kpi_categories` — all seeded, all editable through
  `/settings/masters`.

## Global KPI templates (seeded)

16 KPIs across Business / Clinical / Marketing / Financial / Franchise /
Operations. Tenants inherit them; per-tenant KPIs override by code.
