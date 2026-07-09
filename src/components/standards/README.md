# Enterprise UI Standard

Reusable building blocks that every module (People, CRM, Clinical,
Inventory, Finance, Franchise) MUST consume so the platform feels
cohesive and to reduce UI maintenance.

## Components

- **KpiCard / KpiGrid** — dashboard stat blocks.
- **DataGrid** — sortable, selectable, paginated table.
- **FilterBar** — search + inline filter controls + reset.
- **ActionToolbar / BulkActionsBar** — page and bulk action rows.
- **TimelinePanel** — chronological activity feed.
- **WizardShell** — multi-step form scaffold with step nav.
- **DetailShell** — header + tab strip + optional sidebar.

## Formatting

`src/lib/standards-format.ts` provides `formatDate`, `formatDateTime`,
`formatDistanceToNow`, `initials`, `percent`.

Never fork these; extend in place. New modules should not introduce
alternative grids, wizards, or KPI cards.
