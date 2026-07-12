/**
 * Phase 2.8 Laboratory — Zod validators for Stage 2 server functions.
 *
 * These schemas are the ONLY input surface for the lab module. Every
 * `createServerFn().inputValidator(...)` in this module must parse through
 * one of these. Engines assume already-validated data.
 */
import { z } from "zod";

const uuid = z.string().uuid();
const optionalUuid = uuid.nullish();
const iso = z.string().datetime({ offset: true }).or(z.string().min(1));
const jsonRecord = z.record(z.string(), z.unknown());

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export const orderItemInputSchema = z.object({
  itemKind: z.enum(["test", "panel"]),
  testId: optionalUuid,
  panelId: optionalUuid,
  meta: jsonRecord.optional(),
});
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

export const orderCreateSchema = z.object({
  tenantId: uuid,
  branchId: optionalUuid,
  personId: optionalUuid,
  patientId: optionalUuid,
  encounterId: optionalUuid,
  orderingProviderId: optionalUuid,
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  fasting: z.boolean().optional(),
  notes: z.string().nullish(),
  diagnosisCodes: z.array(z.string()).optional(),
  clinicalOrderRef: jsonRecord.optional(),
  externalOrderRef: z.string().nullish(),
  invoiceId: optionalUuid,
  authorizationId: optionalUuid,
  items: z.array(orderItemInputSchema).min(1),
});
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

export const orderIdSchema = z.object({ tenantId: uuid, orderId: uuid });
export const orderListSchema = z.object({
  tenantId: uuid,
  status: z.string().optional(),
  branchId: optionalUuid,
  personId: optionalUuid,
  from: iso.optional(),
  to: iso.optional(),
  limit: z.number().int().min(1).max(500).default(100),
});
export const orderCancelSchema = orderIdSchema.extend({ reason: z.string().min(1) });

// ---------------------------------------------------------------------------
// Catalog (tests, panels, ranges, delta, critical, masters)
// ---------------------------------------------------------------------------
export const testUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().nullish(),
  loincCode: z.string().nullish(),
  cptCode: z.string().nullish(),
  departmentId: optionalUuid,
  sampleTypeId: optionalUuid,
  containerTypeId: optionalUuid,
  analyzerTypeId: optionalUuid,
  unitId: optionalUuid,
  method: z.string().nullish(),
  resultKind: z.enum(["numeric", "text", "coded", "titre", "growth"]).default("numeric"),
  tatMinutes: z.number().int().positive().nullish(),
  price: z.number().nonnegative().nullish(),
  isReflex: z.boolean().optional(),
  reflexConfig: jsonRecord.optional(),
  requiresApproval: z.boolean().optional(),
  isActive: z.boolean().optional(),
  meta: jsonRecord.optional(),
});
export type TestUpsertInput = z.infer<typeof testUpsertSchema>;

export const panelUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  departmentId: optionalUuid,
  price: z.number().nonnegative().nullish(),
  isActive: z.boolean().optional(),
  meta: jsonRecord.optional(),
  tests: z
    .array(
      z.object({
        testId: uuid,
        sequence: z.number().int().default(0),
        isOptional: z.boolean().default(false),
      }),
    )
    .default([]),
});
export type PanelUpsertInput = z.infer<typeof panelUpsertSchema>;

export const catalogListSchema = z.object({
  tenantId: uuid,
  search: z.string().optional(),
  activeOnly: z.boolean().default(true),
  limit: z.number().int().min(1).max(500).default(100),
});

export const referenceRangeUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  testId: uuid,
  unitId: optionalUuid,
  rangeType: z.enum(["numeric", "qualitative"]).default("numeric"),
  sex: z.enum(["male", "female", "any"]).nullish(),
  ageMinDays: z.number().int().nullish(),
  ageMaxDays: z.number().int().nullish(),
  condition: z.string().nullish(),
  lowValue: z.number().nullish(),
  highValue: z.number().nullish(),
  qualitativeExpected: z.string().nullish(),
  isActive: z.boolean().optional(),
  meta: jsonRecord.optional(),
});

export const deltaCheckUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  testId: uuid,
  deltaKind: z.enum(["absolute", "percent"]).default("percent"),
  threshold: z.number().positive(),
  windowDays: z.number().int().positive().default(30),
  action: z.enum(["flag", "block"]).default("flag"),
  isActive: z.boolean().optional(),
});

export const criticalRuleUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  testId: uuid,
  lowCritical: z.number().nullish(),
  highCritical: z.number().nullish(),
  qualitativeCritical: z.string().nullish(),
  ackRequired: z.boolean().default(true),
  ackWindowMinutes: z.number().int().positive().default(30),
  notifyChannels: jsonRecord.optional(),
  isActive: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Specimens & accession
// ---------------------------------------------------------------------------
export const specimenCollectSchema = z.object({
  tenantId: uuid,
  orderId: uuid,
  branchId: optionalUuid,
  sampleTypeId: optionalUuid,
  collectionSite: z.string().nullish(),
  volumeMl: z.number().positive().nullish(),
  collectedAt: iso.optional(),
  collectedBy: optionalUuid,
  containers: z
    .array(
      z.object({
        containerTypeId: optionalUuid,
        containerNo: z.string().nullish(),
        volumeMl: z.number().positive().nullish(),
      }),
    )
    .default([]),
});
export type SpecimenCollectInput = z.infer<typeof specimenCollectSchema>;

export const specimenIdSchema = z.object({ tenantId: uuid, specimenId: uuid });
export const specimenTransitSchema = specimenIdSchema.extend({
  event: z.enum(["received", "in_transit", "stored", "rejected", "disposed"]),
  location: z.string().nullish(),
  temperatureC: z.number().nullish(),
  meta: jsonRecord.optional(),
});
export const specimenRejectSchema = specimenIdSchema.extend({ reason: z.string().min(1) });

export const barcodePrintSchema = z.object({
  tenantId: uuid,
  specimenId: optionalUuid,
  containerId: optionalUuid,
  symbology: z.enum(["code128", "qr", "datamatrix"]).default("code128"),
});

export const accessionCreateSchema = z.object({
  tenantId: uuid,
  orderId: uuid,
  branchId: optionalUuid,
  receivedLocation: z.string().nullish(),
  receivedBy: optionalUuid,
});

// ---------------------------------------------------------------------------
// Analyzers, QC, calibration
// ---------------------------------------------------------------------------
export const instrumentUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  branchId: optionalUuid,
  analyzerTypeId: optionalUuid,
  serialNo: z.string().nullish(),
  location: z.string().nullish(),
  connection: jsonRecord.optional(),
  status: z.enum(["online", "offline", "maintenance", "retired"]).default("online"),
  meta: jsonRecord.optional(),
});

export const analyzerEnqueueSchema = z.object({
  tenantId: uuid,
  instrumentId: uuid,
  orderItemId: optionalUuid,
  specimenId: optionalUuid,
  meta: jsonRecord.optional(),
});

export const analyzerResultSchema = z.object({
  tenantId: uuid,
  instrumentId: uuid,
  queueId: optionalUuid,
  orderItemId: optionalUuid,
  testId: optionalUuid,
  numericValue: z.number().nullish(),
  textValue: z.string().nullish(),
  unitCode: z.string().nullish(),
  flag: z.string().nullish(),
  rawPayload: jsonRecord.optional(),
});

export const qcRunSchema = z.object({
  tenantId: uuid,
  instrumentId: optionalUuid,
  testId: optionalUuid,
  qcMaterialId: optionalUuid,
  observedValue: z.number(),
  actorId: optionalUuid,
  comment: z.string().nullish(),
});

export const calibrationRecordSchema = z.object({
  tenantId: uuid,
  instrumentId: uuid,
  testId: optionalUuid,
  method: z.string().nullish(),
  slope: z.number().nullish(),
  intercept: z.number().nullish(),
  result: z.enum(["pass", "fail"]).default("pass"),
  nextDueAt: iso.nullish(),
  documentId: optionalUuid,
});

// ---------------------------------------------------------------------------
// Results (entry, verify, release, amend)
// ---------------------------------------------------------------------------
export const resultEntrySchema = z.object({
  tenantId: uuid,
  orderId: uuid,
  orderItemId: uuid,
  specimenId: optionalUuid,
  testId: uuid,
  numericValue: z.number().nullish(),
  textValue: z.string().nullish(),
  codedValue: z.string().nullish(),
  unitCode: z.string().nullish(),
  method: z.string().nullish(),
  performedAt: iso.optional(),
  attachments: jsonRecord.optional(),
});
export type ResultEntryInput = z.infer<typeof resultEntrySchema>;

export const resultIdSchema = z.object({ tenantId: uuid, resultId: uuid });
export const resultAmendSchema = resultIdSchema.extend({
  reason: z.string().min(1),
  numericValue: z.number().nullish(),
  textValue: z.string().nullish(),
  codedValue: z.string().nullish(),
});
export const resultListSchema = z.object({
  tenantId: uuid,
  orderId: optionalUuid,
  status: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(200),
});

// ---------------------------------------------------------------------------
// Microbiology / Pathology / Radiology
// ---------------------------------------------------------------------------
export const microStartSchema = z.object({
  tenantId: uuid,
  orderId: uuid,
  orderItemId: optionalUuid,
  specimenId: optionalUuid,
  requestKind: z.enum(["culture", "sensitivity", "stain", "other"]).default("culture"),
});

export const cultureReportSchema = z.object({
  tenantId: uuid,
  microbiologyOrderId: uuid,
  growthStatus: z.enum(["no_growth", "positive", "mixed", "contaminated", "pending"]),
  gramStain: z.string().nullish(),
  colonyCount: z.string().nullish(),
  organismCode: z.string().nullish(),
  organismName: z.string().nullish(),
  notes: z.string().nullish(),
  reportedBy: optionalUuid,
});

export const sensitivitySchema = z.object({
  tenantId: uuid,
  cultureId: uuid,
  entries: z
    .array(
      z.object({
        antibioticCode: z.string(),
        antibioticName: z.string(),
        method: z.string().nullish(),
        mic: z.number().nullish(),
        interpretation: z.enum(["S", "I", "R", "SDD"]).nullish(),
      }),
    )
    .min(1),
});

export const pathologyCreateSchema = z.object({
  tenantId: uuid,
  orderId: optionalUuid,
  specimenId: optionalUuid,
  branchId: optionalUuid,
  caseKind: z.enum(["histopathology", "cytology", "frozen", "immunohisto"]).default("histopathology"),
  pathologistId: optionalUuid,
});
export const pathologyReportSchema = z.object({
  tenantId: uuid,
  caseId: uuid,
  grossDescription: z.string().nullish(),
  microscopicDescription: z.string().nullish(),
  diagnosis: z.string().nullish(),
  icdOCode: z.string().nullish(),
  attachments: jsonRecord.optional(),
});

export const radiologyOrderSchema = z.object({
  tenantId: uuid,
  branchId: optionalUuid,
  personId: optionalUuid,
  patientId: optionalUuid,
  encounterId: optionalUuid,
  orderingProviderId: optionalUuid,
  modalityId: optionalUuid,
  bodyPartId: optionalUuid,
  laterality: z.enum(["left", "right", "bilateral", "na"]).nullish(),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  clinicalHistory: z.string().nullish(),
  scheduledAt: iso.nullish(),
  invoiceId: optionalUuid,
  authorizationId: optionalUuid,
});
export const radiologyStudySchema = z.object({
  tenantId: uuid,
  radOrderId: uuid,
  studyUid: z.string().nullish(),
  accessionNo: z.string().nullish(),
  modalityCode: z.string().nullish(),
  technologistId: optionalUuid,
  performedAt: iso.optional(),
});
export const radiologyReportSchema = z.object({
  tenantId: uuid,
  studyId: uuid,
  reportText: z.string().min(1),
  impression: z.string().nullish(),
  radiologistId: optionalUuid,
  attachments: jsonRecord.optional(),
});
export const imagingMetadataSchema = z.object({
  tenantId: uuid,
  studyId: uuid,
  seriesUid: z.string().nullish(),
  instanceUid: z.string().nullish(),
  sopClassUid: z.string().nullish(),
  rows: z.number().int().nullish(),
  cols: z.number().int().nullish(),
  frameCount: z.number().int().nullish(),
  storageUrl: z.string().nullish(),
});

// ---------------------------------------------------------------------------
// Distribution & External Lab
// ---------------------------------------------------------------------------
export const distributionSendSchema = z.object({
  tenantId: uuid,
  orderId: uuid,
  channel: z.enum(["email", "whatsapp", "sms", "print", "portal", "fhir", "hl7"]),
  recipient: z.string().nullish(),
  meta: jsonRecord.optional(),
});

export const externalSubmitSchema = z.object({
  tenantId: uuid,
  orderId: uuid,
  vendorCode: z.string().min(1),
  cost: z.number().nonnegative().nullish(),
  currency: z.string().default("INR"),
  meta: jsonRecord.optional(),
});
export const externalIngestSchema = z.object({
  tenantId: uuid,
  externalOrderId: uuid,
  payload: jsonRecord,
});

export const analyticsWindowSchema = z.object({
  tenantId: uuid,
  from: iso.optional(),
  to: iso.optional(),
  branchId: optionalUuid,
});
