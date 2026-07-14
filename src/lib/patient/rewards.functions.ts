/**
 * Patient Portal — Rewards server functions (thin re-exports for callers
 * that expect a dedicated module; canonical implementations live in
 * ./loyalty.functions.ts).
 */
export { listAvailableRewards, redeemReward } from "./loyalty.functions";
