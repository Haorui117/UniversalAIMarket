/**
 * Wallet Management
 *
 * Buyer Agent 的钱包管理模块。
 * 私钥保存在 Agent 本地，不会发送给任何外部服务。
 */

import { ethers, TypedDataDomain, TypedDataField } from "ethers";

export class AgentWallet {
  private wallet: ethers.Wallet;

  constructor(privateKey: string) {
    if (!privateKey) {
      throw new Error("BUYER_PRIVATE_KEY is required");
    }
    this.wallet = new ethers.Wallet(privateKey);
  }

  get address(): string {
    return this.wallet.address;
  }

  /**
   * 签名 EIP-712 类型数据
   * 用于签署交易授权（如 Deal 结算）
   */
  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    message: Record<string, unknown>
  ): Promise<string> {
    // ethers v6 的 signTypedData 方法
    const signature = await this.wallet.signTypedData(domain, types, message);
    return signature;
  }

  /**
   * 签名普通消息
   */
  async signMessage(message: string): Promise<string> {
    return this.wallet.signMessage(message);
  }

  /**
   * 获取钱包对应的 provider（如果需要查询余额等）
   */
  connect(provider: ethers.Provider): ethers.Wallet {
    return this.wallet.connect(provider);
  }
}

/**
 * 从环境变量创建钱包
 */
export function createWalletFromEnv(): AgentWallet {
  const pk = process.env.BUYER_PRIVATE_KEY;
  if (!pk) {
    throw new Error("Missing BUYER_PRIVATE_KEY environment variable");
  }
  return new AgentWallet(pk);
}
