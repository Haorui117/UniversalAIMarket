# Seller Agent Service

独立的 Seller Agent 服务，代表卖家进行客服和砍价对话。

## 功能

- **多种风格**：支持 `aggressive`（强势）、`pro`（专业）、`friendly`（热情）三种销售风格
- **智能报价**：根据砍价轮次动态调整报价，有底价保护
- **LLM 增强**：使用 Qwen 大模型生成自然对话，失败时自动降级到模板
- **成交确认**：通过 `prepare_deal` 接口分析聊天记录确定最终成交价

## 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/seller/chat` | POST | 砍价对话，返回回复和报价 |
| `/api/seller/prepare_deal` | POST | 分析聊天记录，确认成交价格 |
| `/health` | GET | 健康检查 |

---

## 快速启动

```bash
# 1. 配置环境变量
cp .env.seller-a.example .env.seller-a
cp .env.seller-b.example .env.seller-b
# 编辑 .env 文件，填入 API Key

# 2. 启动两个卖家 Agent（不同风格）
pnpm dev:a  # Seller A (aggressive, 端口 8081)
pnpm dev:b  # Seller B (pro, 端口 8082)
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `8081` |
| `SELLER_ID` | 卖家标识 | `seller-agent` |
| `SELLER_NAME` | 显示名称 | `卖家 Agent` |
| `SELLER_STYLE` | 销售风格 | `pro` |
| `MIN_PRICE_FACTOR` | 最低价格系数（相对标价） | `0.80` |
| `MAX_DISCOUNT_PER_ROUND` | 每轮最大降价幅度 | `0.06` |
| `MODEL` | LLM 模型 | `qwen-plus` |
| `LLM_API_KEY` | Qwen API Key | - |
| `LLM_BASE_URL` | API 地址 | DashScope |

---

## 销售风格

| 风格 | 特点 |
|------|------|
| `aggressive` | 强势，坚持高价，降价幅度小 |
| `pro` | 专业，平衡价格和成交率 |
| `friendly` | 热情，更愿意让步促成交易 |

---

## API 示例

### POST /api/seller/chat

```bash
curl -X POST http://localhost:8081/api/seller/chat \
  -H "content-type: application/json" \
  -d '{
    "sessionId": "session-123",
    "round": 1,
    "buyerMessage": "这个价格有点贵，能便宜点吗？",
    "store": { "id": "store-1", "name": "Polyguns 军械库" },
    "product": { "id": "weapon-1", "name": "量子之剑", "priceUSDC": "0.50" }
  }'
```

响应：
```json
{
  "sellerId": "seller-agent-a",
  "sellerName": "卖家 Agent A",
  "reply": "这把量子之剑品质上乘，0.48 USDC 已经是很优惠的价格了！\n报价: 0.48 USDC",
  "quotePriceUSDC": "0.48"
}
```

### POST /api/seller/prepare_deal

```bash
curl -X POST http://localhost:8081/api/seller/prepare_deal \
  -H "content-type: application/json" \
  -d '{
    "sessionId": "session-123",
    "transcript": [
      { "speaker": "buyer", "content": "0.42 成交！" },
      { "speaker": "seller", "content": "好的，成交！" }
    ],
    "product": { "id": "weapon-1", "name": "量子之剑", "listPriceUSDC": "0.50" },
    "store": { "id": "store-1", "name": "Polyguns 军械库" }
  }'
```

响应：
```json
{
  "ok": true,
  "dealReady": true,
  "sellerId": "seller-agent-a",
  "sellerName": "卖家 Agent A",
  "deal": {
    "productId": "weapon-1",
    "productName": "量子之剑",
    "storeId": "store-1",
    "storeName": "Polyguns 军械库",
    "listPriceUSDC": "0.50",
    "finalPriceUSDC": "0.42",
    "discount": 16
  }
}
```

---

## 与 Agent Hub 集成

Seller Agent 作为独立服务运行，由 Agent Hub 协调：

```
Agent Hub (8080)
     │
     ├── /api/seller/chat ──────→  Seller Agent A (8081)
     │                                    │
     │                                    └── 返回报价
     │
     ├── /api/seller/chat ──────→  Seller Agent B (8082)
     │                                    │
     │                                    └── 返回报价
     │
     └── /api/seller/prepare_deal ──→  Winner Seller
                                             │
                                             └── 确认成交价
```

---

## LLM 配置

使用 Qwen 模型进行自然语言生成：

```env
MODEL=qwen-plus
LLM_API_KEY=sk-your-dashscope-key
LLM_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

启动时会自动测试 LLM 连接：

```
[seller-agent] 测试 LLM 连接... (model: qwen-plus)
[seller-agent] ✅ LLM 连接成功，响应: "OK"
[seller-agent] listening on http://localhost:8081 (seller-a, aggressive)
```

如果 LLM 不可用，自动降级到模板模式：

```
[seller-agent] ❌ LLM 连接失败
[seller-agent] fallback 到固定话术模式
```
