/**
 * Negotiation Strategy
 *
 * Buyer Agent 的砍价策略模块。
 * 可以配置不同的砍价风格和参数。
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";

export type StrategyStyle = "aggressive" | "balanced" | "conservative";

export interface StrategyConfig {
  style: StrategyStyle;
  minDiscountPercent: number;  // 期望最低折扣（如 15 表示 15%）
  maxRounds: number;
  budgetUSDC: number;  // 预算限制
}

export interface LLMConfig {
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface NegotiationContext {
  productName: string;
  listPriceUSDC: number;
  sellerName: string;
  storeName: string;
  currentSellerQuote?: number;
  round: number;
  transcript: Array<{ role: "buyer" | "seller"; content: string }>;
}

/**
 * 砍价策略执行器
 */
export class NegotiationStrategy {
  private config: StrategyConfig;
  private llm: ChatOpenAI | null;

  constructor(config: StrategyConfig, llmConfig?: LLMConfig) {
    this.config = config;

    // 如果提供了 LLM 配置，创建 ChatOpenAI 实例
    if (llmConfig?.apiKey) {
      this.llm = new ChatOpenAI({
        model: llmConfig.model,
        apiKey: llmConfig.apiKey,
        configuration: llmConfig.baseUrl ? { baseURL: llmConfig.baseUrl } : undefined,
        temperature: 0.5,
      });
    } else {
      this.llm = null;
    }
  }

  /**
   * 生成开场白
   */
  async generateOpening(ctx: NegotiationContext): Promise<string> {
    const targetPrice = this.calculateTargetPrice(ctx.listPriceUSDC, 1);

    if (!this.llm) {
      return this.fallbackOpening(ctx, targetPrice);
    }

    const systemPrompt = this.buildSystemPrompt("opening");
    const userPrompt = `
你正在联系卖家「${ctx.sellerName}」（店铺：${ctx.storeName}）
商品：${ctx.productName}，标价 ${ctx.listPriceUSDC} USDC
你的预算上限：${this.config.budgetUSDC} USDC
你的目标价：${targetPrice.toFixed(2)} USDC

请发起对话，表达购买意向并暗示会砍价。1-2句话。
`.trim();

    return this.invokeChat(systemPrompt, userPrompt, ctx.transcript);
  }

  /**
   * 生成砍价回复
   */
  async generateBargain(ctx: NegotiationContext): Promise<{
    message: string;
    offerPriceUSDC: number;
  }> {
    const offerPrice = this.calculateTargetPrice(ctx.listPriceUSDC, ctx.round);

    if (!this.llm) {
      return {
        message: this.fallbackBargain(ctx, offerPrice),
        offerPriceUSDC: offerPrice,
      };
    }

    const systemPrompt = this.buildSystemPrompt("bargain");
    const userPrompt = `
商品：${ctx.productName}
标价：${ctx.listPriceUSDC} USDC
卖家当前报价：${ctx.currentSellerQuote} USDC
你的预算：${this.config.budgetUSDC} USDC
你这轮的出价：${offerPrice.toFixed(2)} USDC（必须包含这个数字）
当前第 ${ctx.round} 轮

请生成砍价回复。语气${this.getStyleDescription()}。1-2句话。
`.trim();

    const message = await this.invokeChat(systemPrompt, userPrompt, ctx.transcript);
    return { message, offerPriceUSDC: offerPrice };
  }

  /**
   * 决定是否接受当前报价
   */
  shouldAccept(
    listPriceUSDC: number,
    currentQuoteUSDC: number,
    round: number
  ): { accept: boolean; reason: string } {
    // 1. 超出预算，直接拒绝
    if (currentQuoteUSDC > this.config.budgetUSDC) {
      return {
        accept: false,
        reason: `Price ${currentQuoteUSDC} exceeds budget ${this.config.budgetUSDC}`,
      };
    }

    // 2. 计算折扣
    const discountPercent = ((listPriceUSDC - currentQuoteUSDC) / listPriceUSDC) * 100;

    // 3. 根据轮次和风格决定
    const acceptThreshold = this.getAcceptThreshold(round);

    if (discountPercent >= acceptThreshold) {
      return {
        accept: true,
        reason: `Discount ${discountPercent.toFixed(1)}% >= threshold ${acceptThreshold}% at round ${round}`,
      };
    }

    // 4. 最后一轮，如果在预算内就接受
    if (round >= this.config.maxRounds && currentQuoteUSDC <= this.config.budgetUSDC) {
      return {
        accept: true,
        reason: `Final round ${round}, price ${currentQuoteUSDC} is within budget`,
      };
    }

    return {
      accept: false,
      reason: `Discount ${discountPercent.toFixed(1)}% < threshold ${acceptThreshold}% at round ${round}`,
    };
  }

  /**
   * 生成接受报价的消息
   */
  async generateAcceptance(ctx: NegotiationContext, finalPrice: number): Promise<string> {
    if (!this.llm) {
      return `好，${finalPrice} USDC 成交！请帮我生成订单。`;
    }

    const systemPrompt = this.buildSystemPrompt("accept");
    const userPrompt = `
你同意以 ${finalPrice} USDC 购买「${ctx.productName}」。
请用1句话确认成交，并要求生成订单进入跨链结算。
`.trim();

    return this.invokeChat(systemPrompt, userPrompt, ctx.transcript);
  }

  /**
   * 生成拒绝/放弃的消息
   */
  async generateRejection(ctx: NegotiationContext, reason: string): Promise<string> {
    if (!this.llm) {
      return `抱歉，价格超出我的预算了，这次先不买了。`;
    }

    const systemPrompt = this.buildSystemPrompt("reject");
    const userPrompt = `
你决定放弃购买「${ctx.productName}」。
原因：${reason}
请用1句话礼貌地拒绝并结束对话。
`.trim();

    return this.invokeChat(systemPrompt, userPrompt, ctx.transcript);
  }

  // ============================================
  // 私有方法
  // ============================================

  private calculateTargetPrice(listPrice: number, round: number): number {
    // 根据风格和轮次计算目标价
    const baseFactors: Record<StrategyStyle, number[]> = {
      aggressive: [0.60, 0.65, 0.70, 0.75, 0.80],
      balanced: [0.70, 0.75, 0.80, 0.82, 0.85],
      conservative: [0.80, 0.82, 0.85, 0.87, 0.90],
    };

    const factors = baseFactors[this.config.style];
    const factor = factors[Math.min(round - 1, factors.length - 1)];
    const target = listPrice * factor;

    // 确保不超过预算
    return Math.min(target, this.config.budgetUSDC);
  }

  private getAcceptThreshold(round: number): number {
    // 根据风格和轮次确定接受阈值（最低折扣要求）
    const thresholds: Record<StrategyStyle, number[]> = {
      aggressive: [20, 18, 15, 12, 8],
      balanced: [15, 12, 10, 8, 5],
      conservative: [10, 8, 6, 4, 2],
    };

    const values = thresholds[this.config.style];
    return values[Math.min(round - 1, values.length - 1)];
  }

  private getStyleDescription(): string {
    switch (this.config.style) {
      case "aggressive":
        return "强势，有点火气但不粗鲁";
      case "conservative":
        return "温和委婉，但坚持底线";
      default:
        return "有理有据，适度拉扯";
    }
  }

  private buildSystemPrompt(stage: "opening" | "bargain" | "accept" | "reject"): string {
    const base = `你是买家 Agent，正在一个 AI 电商市场里砍价购物。
你有明确的预算限制（${this.config.budgetUSDC} USDC），超出预算的交易你无法接受。
风格：${this.getStyleDescription()}
要求：中文，简洁自然，禁止辱骂/脏话/人身攻击。`;

    const stageHints: Record<string, string> = {
      opening: "这是开场，表达购买意向并暗示你会砍价。",
      bargain: "这是砍价环节，提出你的报价并给出理由。",
      accept: "你已决定接受报价，确认成交。",
      reject: "你决定放弃购买，礼貌拒绝。",
    };

    return `${base}\n\n${stageHints[stage]}`;
  }

  private async invokeChat(
    systemPrompt: string,
    userPrompt: string,
    transcript: Array<{ role: "buyer" | "seller"; content: string }>
  ): Promise<string> {
    if (!this.llm) {
      return userPrompt;
    }

    const messages: BaseMessage[] = [new SystemMessage(systemPrompt)];

    // 添加历史对话
    for (const turn of transcript) {
      if (turn.role === "buyer") {
        messages.push(new AIMessage(turn.content));
      } else {
        messages.push(new HumanMessage(turn.content));
      }
    }

    messages.push(new HumanMessage(userPrompt));

    const res = await this.llm.invoke(messages);
    return res.content.toString().trim();
  }

  // Fallback 消息（无 LLM 时使用）
  private fallbackOpening(ctx: NegotiationContext, targetPrice: number): string {
    return `你好，我想买「${ctx.productName}」，标价 ${ctx.listPriceUSDC} USDC 有点贵，能优惠吗？`;
  }

  private fallbackBargain(ctx: NegotiationContext, offerPrice: number): string {
    return `${ctx.currentSellerQuote} USDC 还是高了，我最多出 ${offerPrice.toFixed(2)} USDC。`;
  }
}

/**
 * 从环境变量创建策略
 */
export function createStrategyFromEnv(budgetUSDC: number): NegotiationStrategy {
  const style = (process.env.NEGOTIATION_STYLE as StrategyStyle) || "balanced";
  const minDiscount = parseFloat(process.env.MIN_DISCOUNT_PERCENT || "10");
  const maxRounds = parseInt(process.env.MAX_NEGOTIATION_ROUNDS || "5", 10);

  const llmConfig: LLMConfig | undefined = process.env.LLM_API_KEY
    ? {
        model: process.env.LLM_MODEL || "qwen3-max",
        apiKey: process.env.LLM_API_KEY,
        baseUrl: process.env.LLM_BASE_URL,
      }
    : undefined;

  return new NegotiationStrategy(
    {
      style,
      minDiscountPercent: minDiscount,
      maxRounds,
      budgetUSDC,
    },
    llmConfig
  );
}
