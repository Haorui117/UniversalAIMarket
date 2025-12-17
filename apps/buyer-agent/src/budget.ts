/**
 * Budget Management
 *
 * 跟踪 Buyer Agent 的预算使用情况。
 * 确保不会超出用户设定的预算限制。
 */

export interface BudgetConfig {
  maxPerDealUSDC: number;   // 单笔交易最大金额
  totalBudgetUSDC: number;  // 总预算
}

export class BudgetManager {
  private config: BudgetConfig;
  private spentUSDC: number = 0;
  private pendingDeals: Map<string, number> = new Map(); // orderId -> amount

  constructor(config: BudgetConfig) {
    this.config = config;
  }

  /**
   * 检查是否可以接受这个价格
   */
  canAccept(priceUSDC: number): { allowed: boolean; reason?: string } {
    // 检查单笔限额
    if (priceUSDC > this.config.maxPerDealUSDC) {
      return {
        allowed: false,
        reason: `Price ${priceUSDC} USDC exceeds max per deal limit (${this.config.maxPerDealUSDC} USDC)`,
      };
    }

    // 检查剩余预算
    const remaining = this.remainingBudget();
    if (priceUSDC > remaining) {
      return {
        allowed: false,
        reason: `Price ${priceUSDC} USDC exceeds remaining budget (${remaining} USDC)`,
      };
    }

    return { allowed: true };
  }

  /**
   * 预留预算（签名时调用）
   */
  reserve(orderId: string, amountUSDC: number): boolean {
    const check = this.canAccept(amountUSDC);
    if (!check.allowed) {
      return false;
    }
    this.pendingDeals.set(orderId, amountUSDC);
    return true;
  }

  /**
   * 确认消费（链上交易成功后调用）
   */
  confirm(orderId: string): void {
    const amount = this.pendingDeals.get(orderId);
    if (amount) {
      this.spentUSDC += amount;
      this.pendingDeals.delete(orderId);
    }
  }

  /**
   * 取消预留（交易失败时调用）
   */
  cancel(orderId: string): void {
    this.pendingDeals.delete(orderId);
  }

  /**
   * 获取剩余预算
   */
  remainingBudget(): number {
    const pending = Array.from(this.pendingDeals.values()).reduce((a, b) => a + b, 0);
    return this.config.totalBudgetUSDC - this.spentUSDC - pending;
  }

  /**
   * 获取预算状态
   */
  getStatus() {
    const pending = Array.from(this.pendingDeals.values()).reduce((a, b) => a + b, 0);
    return {
      maxPerDealUSDC: this.config.maxPerDealUSDC.toFixed(2),
      totalBudgetUSDC: this.config.totalBudgetUSDC.toFixed(2),
      spentUSDC: this.spentUSDC.toFixed(2),
      pendingUSDC: pending.toFixed(2),
      remainingUSDC: this.remainingBudget().toFixed(2),
    };
  }
}

/**
 * 从环境变量创建 BudgetManager
 */
export function createBudgetFromEnv(): BudgetManager {
  const maxPerDeal = parseFloat(process.env.MAX_PER_DEAL_USDC || "50");
  const totalBudget = parseFloat(process.env.TOTAL_BUDGET_USDC || "100");

  return new BudgetManager({
    maxPerDealUSDC: maxPerDeal,
    totalBudgetUSDC: totalBudget,
  });
}
