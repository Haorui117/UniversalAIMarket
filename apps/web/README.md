# 通用 AI 市场（Web Demo）

Hackathon 友好演示 UI：

- 买家 Agent 浏览店铺/商品
- 买家 Agent <-> 卖家 Agent 协商（展示工具调用卡片）
- 跨链结算时间线（Base -> ZetaChain -> Polygon）
- 放大模式：左侧「需求」，右侧「流程」
- 结算模式：全自动（Agent 发起） / 需确认（你点确认结算）
- Agent 引擎：内置 Demo / 外部 LangChain（本机）

## 运行

在仓库根目录：

```bash
pnpm install
pnpm web:dev
```

打开 http://localhost:3000 ：

- 点击「开始逛」启动 Agent 流程
- 如果选择「需确认」结算模式，等待出现「确认结算」按钮后点击继续

## 测试网模式

复制 `apps/web/.env.example` 到 `apps/web/.env.local`，填入合约地址与测试私钥。

如果测试网资金/地址未配置好，UI 可切换到「模拟」模式演示全流程。

## Agent 适配架构（SSE）

前端只消费一条 Agent 事件流（SSE），展示：对话 / 工具调用 / 工具结果 / 跨链时间线。

### 1) Agent 事件流

`GET /api/agent/stream`（SSE）

常用 Query 参数：

- `engine=builtin|proxy`：内置 Demo / 代理到外部 Agent（本机）
- `mode=simulate|testnet`：模拟 / 测试网
- `checkoutMode=auto|confirm`：自动结算 / 等待确认
- `goal=...`、`buyerNote=...`
- `upstream=http://localhost:8080/api/agent/stream`（仅 `engine=proxy`）

事件类型（`event:`）：

- `message`：{ id, role, stage, speaker, content, ts }
- `tool_call`：{ id, stage, name, args, ts }
- `tool_result`：{ id, result, ts }（用同一个 id 对应 tool_call）
- `timeline_step`：{ id, status, detail?, txHash? }
- `state`：{ sessionId, selectedStoreId?, selectedProductId?, deal?, running?, settling?, awaitingConfirm? }
- `done` / `error`

### 2) 工具接口（给外部 Agent 调用）

- `GET /api/agent/tool`：返回工具清单（name/description/args）
- `POST /api/agent/tool`：执行工具

内置工具（目前）：

- `search_stores`
- `search_products`
- `prepare_deal`
- `settle_deal`（返回结算 SSE URL）

### 3) 确认结算（需确认模式）

`POST /api/agent/action`

Body:

```json
{ "sessionId": "...", "action": "confirm_settlement" }
```

### 4) 接入你的 LangChain Agent（本机）

推荐做法：

- 你的 LangChain Agent 输出与上面一致的 SSE 事件协议（或复用本项目的协议）
- 需要执行工具时，直接调用本项目的 `POST http://localhost:3000/api/agent/tool`
- 在 UI 里将「Agent 引擎」切换到「外部」，填入你的 `upstream` SSE 地址即可
