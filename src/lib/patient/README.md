# Phase 2.10 Patient Portal — Stage 2

Server-only foundation: repositories, business engines and TanStack
`createServerFn` wrappers over the Stage 1 `patient_*` schema. This
stage adds NO SQL, NO routes, NO React components.

## Repository map (`repositories.server.ts`)

Pure CRUD wrappers, no business logic:

| Domain | Repositories |
| --- | --- |
| Identity | `PatientProfileRepository`, `PatientPreferencesRepository`, `PatientSettingsRepository` |
| Devices | `PatientDeviceRepository`, `PushTokenRepository`, `NotificationPreferencesRepository` |
| Health | `HealthGoalRepository`, `HealthMetricRepository`, `HealthPassportRepository` |
| Documents | `PatientDocumentRepository`, `PatientDocumentFolderRepository`, `SavedReportRepository`, `SavedPrescriptionRepository` |
| Saved / favourites | `SavedDoctorRepository`, `FavouriteRepository`, `BookmarkRepository` |
| Family | `FamilyAccountRepository`, `FamilyMemberRepository`, `PatientRelationshipRepository` |
| Sessions | `PortalSessionRepository`, `PatientActivityRepository` |
| Support | `FeedbackRepository`, `SupportTicketRepository` |
| Conversations | `ConversationRepository`, `ChatMessageRepository` |
| Wallet | `WalletRepository`, `WalletTransactionRepository` |
| Membership | `MembershipRepository`, `MembershipHistoryRepository` |
| Loyalty | `LoyaltyAccountRepository`, `LoyaltyTransactionRepository`, `RewardRepository`, `RewardRedemptionRepository` |
| Consent | `DigitalConsentRepository` |
| Notifications | `NotificationHistoryRepository`, `ChannelPreferenceRepository` |
| Preferences | `AppPreferenceRepository`, `ThemePreferenceRepository`, `DashboardPreferenceRepository` |

## Engine ownership (`engines/*.engine.server.ts`)

| Engine | Responsibility |
| --- | --- |
| `PatientProfileEngine` | Profile, preferences, settings, saved doctors, favourites, bookmarks |
| `FamilyEngine` | Family accounts, delegated permissions (`view / book / pay / manage`), context switching |
| `DashboardEngine` | Single-call Patient Portal 360 aggregation |
| `AppointmentPortalEngine` | Patient-side appointments, queue, self check-in (delegates to Scheduling) |
| `TeleconsultEngine` | Teleconsult metadata + join eligibility (delegates to Scheduling + Video) |
| `PatientRecordsEngine` | Read-only aggregation across Clinical / Lab / Pharmacy / Billing via `ClinicalContextLoader` |
| `DocumentsEngine` | Patient documents, folders, saved reports/prescriptions, signed URLs |
| `WalletEngine` | Append-only wallet ledger with idempotency and balance invariants |
| `MembershipEngine` | Activate / renew / pause / cancel with immutable history |
| `LoyaltyEngine` | Append-only points ledger (earn / redeem / expire / reverse / adjust) |
| `RewardsEngine` | Reward catalogue, eligibility, redemption (points spend via LoyaltyEngine) |
| `ConsentEngine` | Versioned digital consents, never hard-deleted |
| `NotificationEngine` | Patient preferences, push-token registration, history (delegates delivery) |
| `HealthEngine` | Non-diagnostic goals & metrics |
| `HealthPassportEngine` | Emergency-safe compiled patient summary |
| `SupportEngine` | Support tickets + feedback (escalation via platform Workflow) |
| `ConversationEngine` | Patient chat (delegates fan-out to Notification Engine) |
| `SessionEngine` | Portal sessions, login/logout, revocation |
| `PaymentPortalEngine` | Invoice / payment reads + payment-link / refund via Integration Dispatcher |

## Server function groups

`*.functions.ts` files map 1:1 to the required Stage 2 spec:

- `profile.functions.ts` — `getMyPatientProfile`, `updateMyPatientProfile`, `getMyPreferences`, `updateMyPreferences`, `getMySettings`, `updateMySettings`
- `family.functions.ts` — `createFamilyAccount`, `addFamilyMember`, `updateFamilyPermissions`, `removeFamilyMember`, `listFamilyMembers`, `switchPatientContext`
- `dashboard.functions.ts` — `getPatientPortalDashboard`
- `appointments.functions.ts` — `listMyAppointments`, `bookMyAppointment`, `rescheduleMyAppointment`, `cancelMyAppointment`, `getMyQueueStatus`, `selfCheckIn`
- `teleconsult.functions.ts` — `listMyTeleconsultations`, `getTeleconsultJoinInfo`
- `records.functions.ts` — clinical / prescriptions / treatment plans / lab / radiology / pathology / pharmacy
- `documents.functions.ts` — documents, folders, saveReport, savePrescription, signed URLs
- `wallet.functions.ts` — `getMyWallet`, `listWalletTransactions`, `requestWalletPayment`
- `membership.functions.ts` — list / activate / renew / pause / cancel
- `loyalty.functions.ts` — account, transactions, rewards, redemption
- `rewards.functions.ts` — re-exports rewards handlers
- `notifications.functions.ts` — preferences, push tokens, history
- `health.functions.ts` — goals & metrics
- `passport.functions.ts` — health passport
- `consent.functions.ts` — record / withdraw digital consent
- `support.functions.ts` — tickets + feedback
- `conversations.functions.ts` — create / list / send / mark read
- `sessions.functions.ts` — list / revoke portal sessions
- `payments.functions.ts` — invoices / payments / payment link / refund status

## Patient authentication mapping

- `auth.users.id` is the primary Patient Portal identity (`patient_user_id`).
- `helpers.server.resolvePatientIdentity(sb, userId)` returns `{ userId, profile, personId, patientId, tenantId }` by joining
  `patient_profiles` → `persons`/`patients`. Profiles are lazily created on first read.
- Every server function calls `requireSupabaseAuth`; RLS is preserved throughout.

## Delegated family permission model

- Rows in `patient_family_members` carry independent `can_view / can_book / can_pay / can_manage` flags plus `status`.
- `assertFamilyPermission({ viewerUserId, targetUserId, capability })` enforces the capability at every cross-user surface.
- `switchPatientContext` requires the viewer to hold at least `view` delegation with `status = accepted`.

## Dashboard aggregation pipeline

`DashboardEngine.getDashboard()` runs a single fan-out that gathers:
`profile → person/patient → upcoming appointments → encounters →
prescriptions → lab / radiology / pharmacy → invoices / payments →
wallet → memberships → reward redemptions → documents →
notifications → health goals → family access → consents → dashboard
layout preferences → delegated permission mask`.

All reads reuse the existing platform loaders and repositories — no
copies of clinical, billing or scheduling data are stored in
`patient_*` tables.

## Wallet & loyalty invariants

1. Balances are derived from the append-only transaction ledger.
2. Debits require `balance >= amount`.
3. Every posting checks the incoming `idempotencyKey` against recent
   transactions to avoid double posting.
4. Loyalty spends flow through `LoyaltyEngine` — `RewardsEngine`
   never writes to `patient_loyalty_transactions` directly.
5. Every mutation emits a `PATIENT_EVENTS.Wallet*` /
   `PATIENT_EVENTS.Loyalty*` / `PATIENT_EVENTS.Reward*` event and a
   timeline entry.

## Cross-module reuse matrix

| Need | Reused from |
| --- | --- |
| Person / patient identity | Master Person Registry (`persons`, `patients`) |
| Clinical 360 | `src/lib/clinical/context-loader.server.ts` (`ClinicalContextLoader`) |
| Appointments, queue, waitlist | `src/lib/scheduling/*` |
| Prescriptions / SOAP / plans | Clinical EMR tables (read-only from portal) |
| Pharmacy | `pharmacy_dispenses` (read-only) |
| Lab / Radiology / Pathology | `lab_orders` filtered by `meta.category` |
| Billing / Revenue | `revenue_events` (read-only) |
| Payments / gateway | `src/lib/integrations/dispatcher.server.ts` (`dispatch()`) |
| Workflow / automation | `emit_automation_event` RPC (never a per-module bus) |
| Timeline | `log_timeline_event` RPC |
| Search | `index_search_entity` RPC |
| Notifications delivery | Existing platform Notification Engine (portal only manages preferences + push tokens) |
| Storage / signed URLs | Supabase Storage; no raw paths are ever returned to clients |
| RBAC | Platform helpers (`can_read_patient_portal`, `can_write_patient_portal`) |

## Event flow

Every state change funnels through `emitPatientEvent()` →
`emit_automation_event` RPC. The Automation / Workflow Engine picks
up the event and drives notifications, escalations and reporting.
Constants come from `./events.ts` (`PATIENT_EVENTS`).

## Security rules

- No anonymous server functions — all wrappers use
  `requireSupabaseAuth` and Zod validation.
- All cross-user reads/writes are gated by `assertFamilyPermission`.
- Wallet and loyalty ledgers are append-only through the engines.
- Session revocation is audit-logged (`patient_activity_log` + event).
- Storage returns short-lived signed URLs, never raw paths.
- No direct calls to SMS / WhatsApp / email / push providers — those
  go through the platform Notification Engine.
- No direct payment-gateway `fetch()` — everything goes through the
  Integration Dispatcher.
