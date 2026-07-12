/**
 * Phase 2.6 Pharmacy — Stage 2 Zod validators.
 *
 * These schemas validate every server-function input BEFORE any repository
 * or engine call. They mirror the Stage 1 schema — no new tables, no
 * duplicate clinical fields, no autonomous prescribing.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
export const uuid = z.string().uuid();
export const optionalUuid = uuid.nullable().optional();
export const nonEmpty = (label: string) => z.string().trim().min(1, `${label} required`);
export const positiveNumber = z.number().finite().positive();
export const nonNegative = z.number().finite().min(0);
export const isoDate = z.string().min(4);
export const jsonRecord = z.record(z.unknown()).default({});

// ---------------------------------------------------------------------------
// Drug master
// ---------------------------------------------------------------------------
export const drugUpsertSchema = z.object({
  tenantId: uuid.nullable().optional(),
  id: optionalUuid,
  code: nonEmpty("code"),
  name: nonEmpty("name"),
  genericName: z.string().nullish(),
  brandName: z.string().nullish(),
  strength: z.string().nullish(),
  strengthValue: z.number().nullish(),
  strengthUnitCode: z.string().nullish(),
  formCode: z.string().nullish(),
  baseUnitCode: nonEmpty("baseUnitCode"),
  packSize: z.number().positive().nullish(),
  packUnitCode: z.string().nullish(),
  categoryCode: z.string().nullish(),
  controlledScheduleCode: z.string().nullish(),
  storageConditionCode: z.string().nullish(),
  isColdChain: z.boolean().default(false),
  requiresPrescription: z.boolean().default(true),
  hsnCode: z.string().nullish(),
  atcCode: z.string().nullish(),
  barcode: z.string().nullish(),
  manufacturer: z.string().nullish(),
  isActive: z.boolean().default(true),
  meta: jsonRecord.optional(),
});

export const drugListSchema = z.object({
  tenantId: uuid.nullable().optional(),
  search: z.string().optional().default(""),
  activeOnly: z.boolean().default(true),
  requiresPrescription: z.boolean().optional(),
  controlledOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

// ---------------------------------------------------------------------------
// Warehouse / bins / locations
// ---------------------------------------------------------------------------
export const warehouseUpsertSchema = z.object({
  tenantId: uuid,
  id: optionalUuid,
  code: nonEmpty("code"),
  name: nonEmpty("name"),
  warehouseType: nonEmpty("warehouseType"),
  parentId: optionalUuid,
  branchId: optionalUuid,
  address: jsonRecord.optional(),
  gstin: z.string().nullish(),
  drugLicenseNo: z.string().nullish(),
  isActive: z.boolean().default(true),
  meta: jsonRecord.optional(),
});

export const warehouseListSchema = z.object({
  tenantId: uuid,
  branchId: optionalUuid,
  activeOnly: z.boolean().default(true),
});

export const warehouseLocationUpsertSchema = z.object({
  tenantId: uuid,
  id: optionalUuid,
  warehouseId: uuid,
  code: nonEmpty("code"),
  name: nonEmpty("name"),
  locationType: z.string().default("general"),
  temperatureMinC: z.number().nullish(),
  temperatureMaxC: z.number().nullish(),
  isActive: z.boolean().default(true),
  meta: jsonRecord.optional(),
});

export const warehouseBinUpsertSchema = z.object({
  tenantId: uuid,
  id: optionalUuid,
  warehouseId: uuid,
  locationId: optionalUuid,
  code: nonEmpty("code"),
  rack: z.string().nullish(),
  shelf: z.string().nullish(),
  bin: z.string().nullish(),
  capacity: z.number().nullish(),
  isActive: z.boolean().default(true),
  meta: jsonRecord.optional(),
});

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------
export const supplierUpsertSchema = z.object({
  tenantId: uuid,
  id: optionalUuid,
  code: nonEmpty("code"),
  name: nonEmpty("name"),
  legalName: z.string().nullish(),
  companyId: optionalUuid,
  contactPerson: z.string().nullish(),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  gstin: z.string().nullish(),
  drugLicenseNo: z.string().nullish(),
  paymentTerms: z.string().nullish(),
  leadTimeDays: z.number().int().nullish(),
  isActive: z.boolean().default(true),
  address: jsonRecord.optional(),
  meta: jsonRecord.optional(),
});

export const supplierListSchema = z.object({
  tenantId: uuid,
  search: z.string().default(""),
  activeOnly: z.boolean().default(true),
});

export const supplierProductUpsertSchema = z.object({
  tenantId: uuid,
  id: optionalUuid,
  supplierId: uuid,
  drugId: uuid,
  supplierSku: z.string().nullish(),
  leadTimeDays: z.number().int().nullish(),
  moq: z.number().nullish(),
  isPreferred: z.boolean().default(false),
  isActive: z.boolean().default(true),
  meta: jsonRecord.optional(),
});

// ---------------------------------------------------------------------------
// Inventory movements
// ---------------------------------------------------------------------------
export const receiveStockSchema = z.object({
  tenantId: uuid,
  warehouseId: uuid,
  locationId: optionalUuid,
  binId: optionalUuid,
  drugId: uuid,
  batchId: optionalUuid,
  quantity: positiveNumber,
  unitCode: nonEmpty("unitCode"),
  sourceType: z.string().default("adjustment"),
  sourceId: optionalUuid,
  reasonCode: z.string().nullish(),
  meta: jsonRecord.optional(),
});

export const adjustStockSchema = receiveStockSchema.extend({
  quantity: z.number().finite(),
  reasonCode: nonEmpty("reasonCode"),
});

export const reserveStockSchema = z.object({
  tenantId: uuid,
  warehouseId: uuid,
  drugId: uuid,
  batchId: optionalUuid,
  quantity: positiveNumber,
  unitCode: nonEmpty("unitCode"),
  reservedForType: nonEmpty("reservedForType"),
  reservedForId: optionalUuid,
  expiresAt: z.string().nullish(),
  meta: jsonRecord.optional(),
});

export const reservationIdSchema = z.object({
  tenantId: uuid,
  reservationId: uuid,
});

export const transferSchema = z.object({
  tenantId: uuid,
  fromWarehouseId: uuid,
  toWarehouseId: uuid,
  transferDate: isoDate.optional(),
  notes: z.string().nullish(),
  items: z
    .array(
      z.object({
        drugId: uuid,
        batchId: optionalUuid,
        quantity: positiveNumber,
        unitCode: nonEmpty("unitCode"),
      }),
    )
    .min(1),
});

export const destroyStockSchema = z.object({
  tenantId: uuid,
  warehouseId: uuid,
  drugId: uuid,
  batchId: optionalUuid,
  quantity: positiveNumber,
  unitCode: nonEmpty("unitCode"),
  reasonCode: nonEmpty("reasonCode"),
  meta: jsonRecord.optional(),
});

export const stockLookupSchema = z.object({
  tenantId: uuid,
  warehouseId: optionalUuid,
  drugId: optionalUuid,
  includeReserved: z.boolean().default(true),
  limit: z.number().int().min(1).max(500).default(100),
});

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------
export const batchUpsertSchema = z.object({
  tenantId: uuid,
  id: optionalUuid,
  drugId: uuid,
  batchNo: nonEmpty("batchNo"),
  lotNo: z.string().nullish(),
  expiryDate: isoDate,
  manufactureDate: z.string().nullish(),
  manufacturer: z.string().nullish(),
  supplierId: optionalUuid,
  costPrice: z.number().nullish(),
  mrp: z.number().nullish(),
  gstPercent: z.number().nullish(),
  hsnCode: z.string().nullish(),
  meta: jsonRecord.optional(),
});

export const batchQuarantineSchema = z.object({
  tenantId: uuid,
  batchId: uuid,
  reason: nonEmpty("reason"),
});

// ---------------------------------------------------------------------------
// Purchase orders / GRN
// ---------------------------------------------------------------------------
export const poItemSchema = z.object({
  drugId: uuid,
  quantityOrdered: positiveNumber,
  unitCode: nonEmpty("unitCode"),
  unitPrice: z.number().nullish(),
  discountPercent: z.number().nullish(),
  taxPercent: z.number().nullish(),
  notes: z.string().nullish(),
});

export const poCreateSchema = z.object({
  tenantId: uuid,
  branchId: optionalUuid,
  warehouseId: optionalUuid,
  supplierId: uuid,
  poDate: isoDate.optional(),
  expectedDate: z.string().nullish(),
  currency: z.string().default("INR"),
  notes: z.string().nullish(),
  items: z.array(poItemSchema).min(1),
});

export const poIdSchema = z.object({
  tenantId: uuid,
  poId: uuid,
});

export const poListSchema = z.object({
  tenantId: uuid,
  supplierId: optionalUuid,
  status: z.string().nullish(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const grnItemSchema = z.object({
  poItemId: optionalUuid,
  drugId: uuid,
  batchId: optionalUuid,
  // Batch info if new batch:
  batchNo: z.string().nullish(),
  lotNo: z.string().nullish(),
  expiryDate: z.string().nullish(),
  manufactureDate: z.string().nullish(),
  manufacturer: z.string().nullish(),
  costPrice: z.number().nullish(),
  mrp: z.number().nullish(),
  gstPercent: z.number().nullish(),
  hsnCode: z.string().nullish(),
  // GRN fields:
  quantityReceived: positiveNumber,
  unitCode: nonEmpty("unitCode"),
  unitCost: z.number().nullish(),
  locationId: optionalUuid,
  binId: optionalUuid,
  notes: z.string().nullish(),
});

export const grnPostSchema = z.object({
  tenantId: uuid,
  poId: optionalUuid,
  supplierId: optionalUuid,
  branchId: optionalUuid,
  warehouseId: uuid,
  grnDate: isoDate.optional(),
  invoiceNumber: z.string().nullish(),
  invoiceDate: z.string().nullish(),
  notes: z.string().nullish(),
  items: z.array(grnItemSchema).min(1),
});

// ---------------------------------------------------------------------------
// Dispense
// ---------------------------------------------------------------------------
export const dispenseItemSchema = z.object({
  prescriptionItemId: optionalUuid,
  drugId: uuid,
  quantity: positiveNumber,
  unitCode: nonEmpty("unitCode"),
  unitPrice: z.number().nullish(),
  notes: z.string().nullish(),
  isControlled: z.boolean().default(false),
  substitutedFromDrugId: optionalUuid,
  substitutionReason: z.string().nullish(),
  witnessId: optionalUuid,
});

export const dispenseCreateSchema = z.object({
  tenantId: uuid,
  branchId: optionalUuid,
  warehouseId: uuid,
  encounterId: optionalUuid,
  patientId: uuid,
  prescriptionId: optionalUuid,
  dispenseDate: isoDate.optional(),
  counsellingNotes: z.string().nullish(),
  items: z.array(dispenseItemSchema).min(1),
});

export const dispenseIdSchema = z.object({
  tenantId: uuid,
  dispenseId: uuid,
});

export const dispenseListSchema = z.object({
  tenantId: uuid,
  patientId: optionalUuid,
  encounterId: optionalUuid,
  warehouseId: optionalUuid,
  status: z.string().nullish(),
  limit: z.number().int().min(1).max(200).default(50),
});

// ---------------------------------------------------------------------------
// Returns
// ---------------------------------------------------------------------------
export const returnItemSchema = z.object({
  drugId: uuid,
  batchId: optionalUuid,
  quantity: positiveNumber,
  unitCode: nonEmpty("unitCode"),
  disposition: z.enum(["restock", "quarantine", "destroy"]).default("restock"),
  notes: z.string().nullish(),
});

export const returnCreateSchema = z.object({
  tenantId: uuid,
  branchId: optionalUuid,
  warehouseId: uuid,
  returnType: z.enum(["patient", "supplier"]),
  patientId: optionalUuid,
  supplierId: optionalUuid,
  sourceType: z.string().nullish(),
  sourceId: optionalUuid,
  reasonCode: z.string().nullish(),
  returnDate: isoDate.optional(),
  notes: z.string().nullish(),
  items: z.array(returnItemSchema).min(1),
});

// ---------------------------------------------------------------------------
// Controlled register
// ---------------------------------------------------------------------------
export const controlledEntrySchema = z.object({
  tenantId: uuid,
  warehouseId: uuid,
  drugId: uuid,
  batchId: optionalUuid,
  scheduleCode: nonEmpty("scheduleCode"),
  entryType: z.enum(["receipt", "dispense", "adjustment", "destroy", "transfer_in", "transfer_out"]),
  quantityIn: nonNegative.default(0),
  quantityOut: nonNegative.default(0),
  unitCode: nonEmpty("unitCode"),
  patientId: optionalUuid,
  prescriberId: optionalUuid,
  dispensedBy: optionalUuid,
  witnessId: uuid,
  referenceType: z.string().nullish(),
  referenceId: optionalUuid,
  meta: jsonRecord.optional(),
});

export const controlledListSchema = z.object({
  tenantId: uuid,
  warehouseId: optionalUuid,
  drugId: optionalUuid,
  from: z.string().nullish(),
  to: z.string().nullish(),
  discrepancyOnly: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(100),
});

// ---------------------------------------------------------------------------
// Cold chain
// ---------------------------------------------------------------------------
export const coldChainLogSchema = z.object({
  tenantId: uuid,
  warehouseId: uuid,
  locationId: optionalUuid,
  deviceId: z.string().nullish(),
  temperatureC: z.number().finite(),
  humidityPercent: z.number().nullish(),
  readingAt: isoDate.optional(),
  source: z.string().default("manual"),
  meta: jsonRecord.optional(),
});

export const coldChainListSchema = z.object({
  tenantId: uuid,
  warehouseId: optionalUuid,
  locationId: optionalUuid,
  excursionOnly: z.boolean().default(false),
  from: z.string().nullish(),
  to: z.string().nullish(),
  limit: z.number().int().min(1).max(500).default(200),
});

// ---------------------------------------------------------------------------
// Recall
// ---------------------------------------------------------------------------
export const recallCreateSchema = z.object({
  tenantId: uuid,
  drugId: optionalUuid,
  manufacturer: z.string().nullish(),
  recallClass: z.string().nullish(),
  regulatorReference: z.string().nullish(),
  reason: nonEmpty("reason"),
  scope: jsonRecord.optional(),
  batchNos: z.array(z.string()).optional().default([]),
});

export const recallIdSchema = z.object({
  tenantId: uuid,
  recallId: uuid,
});

// ---------------------------------------------------------------------------
// Medication kits
// ---------------------------------------------------------------------------
export const kitItemSchema = z.object({
  drugId: uuid,
  quantity: positiveNumber,
  unitCode: nonEmpty("unitCode"),
  isSubstitutable: z.boolean().default(false),
  isMandatory: z.boolean().default(true),
  notes: z.string().nullish(),
});

export const kitUpsertSchema = z.object({
  tenantId: uuid,
  id: optionalUuid,
  code: nonEmpty("code"),
  name: nonEmpty("name"),
  description: z.string().nullish(),
  serviceId: optionalUuid,
  isActive: z.boolean().default(true),
  items: z.array(kitItemSchema).default([]),
});

export const kitExpandSchema = z.object({
  tenantId: uuid,
  kitId: uuid,
  warehouseId: uuid,
});

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------
export const forecastListSchema = z.object({
  tenantId: uuid,
  warehouseId: optionalUuid,
  drugId: optionalUuid,
  limit: z.number().int().min(1).max(200).default(50),
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
export const analyticsWindowSchema = z.object({
  tenantId: uuid,
  warehouseId: optionalUuid,
  from: z.string().nullish(),
  to: z.string().nullish(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ReserveStockInput = z.infer<typeof reserveStockSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type DestroyStockInput = z.infer<typeof destroyStockSchema>;
export type DispenseCreateInput = z.infer<typeof dispenseCreateSchema>;
export type ReturnCreateInput = z.infer<typeof returnCreateSchema>;
export type PoCreateInput = z.infer<typeof poCreateSchema>;
export type GrnPostInput = z.infer<typeof grnPostSchema>;
export type ControlledEntryInput = z.infer<typeof controlledEntrySchema>;
export type ColdChainLogInput = z.infer<typeof coldChainLogSchema>;
export type RecallCreateInput = z.infer<typeof recallCreateSchema>;
export type KitUpsertInput = z.infer<typeof kitUpsertSchema>;
