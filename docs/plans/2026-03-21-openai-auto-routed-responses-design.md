# OpenAI Auto-Routed Responses API Design

## Goal
移除独立的 Responses API provider UI，把 `/v1/responses` 作为 OpenAI-compatible provider 的内部能力。用户仍然只配置 OpenAI-compatible，但在测试连接和真实分析时，系统会根据 model 名优先判断，并在合适的失败场景下自动从 chat completions 回退到 Responses API。

## Context
当前实现把 Responses API 暴露成了一个独立 provider，导致设置页多出一个突兀的配置入口。这个设计不符合用户心智：Responses API 不是一个新的厂商，而是 OpenAI 生态中的另一种 endpoint 形态。它不应该与 Claude、Gemini 并列显示，也不应该要求用户主动理解并选择 chat 或 responses。

## Chosen Approach
采用单一 OpenAI UI + 内部自动路由：

1. UI 层只保留 `OpenAI-compatible`、`Claude`、`Gemini` 三个 provider。
2. OpenAI provider 内部根据 model 名做第一层路由判断。
3. 若首次走 chat completions 且返回的错误看起来像 endpoint / protocol mismatch，再自动回退到 `/v1/responses`。
4. Claude 和 Gemini 保持现状，不显示任何 Responses 相关信息。

## Alternatives Considered

### 方案 A：单一 OpenAI UI + model 优先判断 + 失败回退（采用）
优点：UI 最干净，行为最符合用户预期，对代理兼容性更强。
缺点：OpenAI provider 内部逻辑比之前复杂。

### 方案 B：只按 model 名判断，不做回退
优点：实现简单，可预测。
缺点：对模型命名不规范的代理兼容性较差，没有兜底能力。

### 方案 C：永远先试 chat，再试 responses
优点：兼容性最强。
缺点：多打一遍请求，测试连接和真实调用都更慢，错误链更复杂。

## Architecture

### UI / Settings Layer
- 删除 `responses` 这个独立 provider type。
- 恢复固定 provider 列表为：`openai`、`claude`、`gemini`。
- 移除设置页中的 `Responses API` 标签、描述、颜色和单独卡片。
- OpenAI 表单仍只显示 API key、Model、Base URL。
- Claude / Gemini 页面不显示任何 Responses 相关入口或文案。
- `Edit configuration` 文案应被移除或弱化，避免不必要的视觉噪音。

### Provider Layer
OpenAI-compatible provider 升级为内部双通道实现：

- `shouldPreferResponsesApi(model)`
  - 根据 model 名决定是否优先走 `/v1/responses`
  - 例如 `gpt-5`、`gpt-5-*` 一类 reasoning-oriented 模型优先走 responses

- `analyzeViaChatCompletions(...)`
  - 负责原有 `/chat/completions` 路径
  - 继续支持标准 JSON 与 SSE 兼容解析

- `analyzeViaResponsesApi(...)`
  - 负责 `/v1/responses` 路径
  - 解析 `output[].content[].text`
  - 跳过 `reasoning` 项，提取最终 message 文本

- `shouldFallbackToResponses(error)`
  - 只在“看起来像 endpoint / protocol mismatch”的失败上允许回退

### Shared Routing Rules
- 若 model 命中 responses 优先规则：先走 responses
- 否则先走 chat completions
- chat 失败时，若属于可回退错误，再试 responses
- responses 失败后不再继续兜底回 chat，避免循环和噪声

## Error Handling

### 不回退的错误
以下错误直接返回，不触发 endpoint 切换：
- `auth_error`
- `rate_limit_error`
- 明确的 `server_error`
- 普通 `network_error`

这些错误通常与账号、额度、服务状态有关，切 endpoint 不会解决问题。

### 允许回退的错误
以下错误允许从 chat 自动回退到 responses：
- `bad_model_output`
- `invalid_response`
- chat 成功返回但没有 `message.content`
- SSE 成功返回但没有 `delta.content`
- 返回结构明显不是 chat completion 预期结构
- 一些明确表示 request shape / endpoint mismatch 的 4xx 错误

这样可以覆盖“模型实际只支持 responses”或“代理把 reasoning model 放在 responses 通道”的情况，又不会掩盖真实认证类错误。

## Testing Strategy

### UI / Settings Tests
- `responses` 不再出现在 provider rail、默认 provider 选项、保存结果中。
- OpenAI / Claude / Gemini 三项恢复为固定列表。
- 选择 Claude 或 Gemini 时，看不到任何 Responses 相关文案。

### OpenAI Provider Tests
- 普通 model 默认走 `/chat/completions`
- `gpt-5*` 这类 model 优先走 `/v1/responses`
- chat 路径遇到可回退错误时，会自动再试 responses
- chat 路径遇到 auth / rate limit / server error 时，不回退
- responses 路径可正确提取 `output_text`
- reasoning item 会被忽略

### Integration Consistency
- `testConnection` 和真实 analyze 必须走同一套路由逻辑
- 避免出现“测试连接成功但正式分析失败，或者反过来”的行为差异

## Migration Plan
1. 删除 `responses` 作为 `ProviderType` 的对外暴露。
2. 回退 UI 中新增的 responses provider 相关内容。
3. 把 responses 解析逻辑保留为 OpenAI provider 的内部实现或 helper。
4. 更新 tests，使 UI、保存逻辑、provider factory 和 provider 单测都反映新行为。

## Expected UX Outcome
用户看到的仍然是一个简单的 OpenAI-compatible 配置：
- API key
- Model
- Base URL

用户不需要知道 chat completions 与 responses 的差别。系统会在连接测试和真实请求时自动判断最合适的 endpoint，并在合理场景下自动回退，提高兼容性，同时保持 Claude / Gemini 配置界面干净一致。
