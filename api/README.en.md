# TanTan · API

[简体中文](README.md) | **English**

An Express + TypeScript service shared by all three frontend applications. It runs at `http://localhost:8787` in development and stores data in MySQL 8.

Follow the [root quick-start guide](../README.en.md#quick-start) to create `api/.env.local` and start MySQL, then run these commands from the repository root:

```bash
npm run dev -w api
npm run typecheck -w api
```

The service reads `.env.local` from the API working directory, falling back to `.env` if that file is absent. On startup, it creates the database schema. With `DEMO_SEED=true`, it populates the relevant empty tables with demo data from `data.ts`. `npm run build -w api` performs TypeScript checks; it does not generate standalone JavaScript output.

## Configuration

| Setting | Purpose |
| --- | --- |
| `API_HOST`, `API_PORT` | Listen address and port; defaults to local `127.0.0.1:8787` |
| `DEMO_SEED` | Enable fictional demo data; disabled by default in production |
| `MYSQL_*` | MySQL connection settings |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Initial administrator account |
| `AUTH_SECRET`, `ADMIN_TOKEN` | Signing and administrative API credentials |
| `CLIENT_BASE_URL`, `CORS_ORIGIN` | Customer app URL and allowed cross-origin source |
| `GEMINI_API_KEY` | Optional AI service |
| `RAINYUN_*` | Optional S3-compatible image storage |

See [`.env.example`](.env.example) for a complete local configuration example. Keep secrets in local environment files or your deployment platform's configuration.

## Core endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Health check |
| `POST /api/admin/login`, `POST /api/merchant/login` | Administrator and merchant login |
| `/api/vendors`, `/api/products` | Read and write merchants and products; writes are subject to role-based access checks |
| `GET /api/vendors/:id/qrcode` | Generate a stall entry QR code |
| `GET/POST /api/orders` | Retrieve or create orders |
| `PATCH /api/orders/:id/status` | Update an order's status |
| `POST /api/orders/:id/payment-proof` | Upload proof of payment |
| `/api/app-config`, `/api/config` | Platform settings and default configuration |
| `/api/ai/recommendation`, `/api/ai/daily-breeze` | Optional AI recommendations and messages |

Refer to `server/index.ts` for request details, authentication, and input validation. `server/db.ts` implements persistence and business calculations, `server/oss.ts` handles image storage, and `server/ai-service.ts` handles Gemini calls.

Customer orders are associated with an anonymous `X-Buyer-Id`, and payments use a manual confirmation workflow. The `payment-callback` endpoint only performs an administrator-triggered business status update; it does not verify payment-provider signatures. The [current scope](../README.en.md#current-scope) and [architecture notes](../docs/architecture.en.md) describe capabilities that still require further work.
