# 滩摊 · API

三个前端共用的 Express + TypeScript 服务，开发地址为 `http://localhost:8787`，数据保存在 MySQL 8。

按[仓库根目录快速启动](../README.md#快速启动)创建 `api/.env.local` 并启动 MySQL 后，在根目录运行：

```bash
npm run dev -w api
npm run typecheck -w api
```

服务会读取 API 工作目录中的 `.env.local`，没有该文件时读取 `.env`。启动时创建数据库结构，`DEMO_SEED=true` 时为相应空表写入 `data.ts` 中的演示数据。`npm run build -w api` 执行 TypeScript 检查，不生成独立 JavaScript 产物。

## 配置

| 配置 | 用途 |
| --- | --- |
| `API_HOST`、`API_PORT` | 监听地址与端口，默认本地 `127.0.0.1:8787` |
| `DEMO_SEED` | 是否写入虚构演示数据；生产默认关闭 |
| `MYSQL_*` | MySQL 连接 |
| `ADMIN_USERNAME`、`ADMIN_PASSWORD` | 首次初始化管理员账号 |
| `AUTH_SECRET`、`ADMIN_TOKEN` | 签名及管理接口凭据 |
| `CLIENT_BASE_URL`、`CORS_ORIGIN` | 顾客端地址与跨域来源 |
| `GEMINI_API_KEY` | 可选 AI 服务 |
| `RAINYUN_*` | 可选 S3 兼容图片存储 |

完整的本地示例见 [`.env.example`](.env.example)。密钥应只保存在本地环境或部署平台配置中。

## 核心接口

| 接口 | 用途 |
| --- | --- |
| `GET /api/health` | 健康检查 |
| `POST /api/admin/login`、`POST /api/merchant/login` | 管理员和商户登录 |
| `/api/vendors`、`/api/products` | 商户与商品读写，写入受角色权限约束 |
| `GET /api/vendors/:id/qrcode` | 生成摊位进店二维码 |
| `GET/POST /api/orders` | 获取或创建订单 |
| `PATCH /api/orders/:id/status` | 更新订单状态 |
| `POST /api/orders/:id/payment-proof` | 上传付款凭证 |
| `/api/app-config`、`/api/config` | 平台设置与默认配置 |
| `/api/ai/recommendation`、`/api/ai/daily-breeze` | 可选 AI 推荐与提示 |

具体请求、身份与输入校验以 `server/index.ts` 为准。`server/db.ts` 实现持久化与业务计算，`server/oss.ts` 处理图片存储，`server/ai-service.ts` 处理 Gemini 调用。

顾客订单使用匿名 `X-Buyer-Id` 关联；支付是人工确认流程。`payment-callback` 接口仅是管理员触发的业务状态更新，不包含支付平台签名校验。[完整边界](../README.md#功能边界)和[架构说明](../docs/architecture.md)列出了尚待完善的能力。
