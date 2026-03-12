// packages/core/src/credits/index.ts
// 积分核心业务逻辑
// ============================================================

export type { UserCredits, CreditTransaction } from "../db/schema.js";
export type { CreditRepository } from "../db/repository.js";

// 积分扣减结果
export interface DeductResult {
    success: boolean;
    balanceAfter: number;
    error?: "insufficient" | "not_found" | "conflict";
}

// 积分充值结果
export interface AddResult {
    success: boolean;
    balanceAfter: number;
    idempotent?: boolean; // true = 幂等键已存在，跳过
}
