# Security and demo boundaries

[简体中文](SECURITY.md) | **English**

TanTan is a food ordering prototype for learning, portfolio presentation, and local demonstrations. Files and configuration were reviewed and cleaned before publication, but the project has not undergone a comprehensive security audit, penetration test, or production reliability assessment. Use fictional data and a separate demo database rather than real customer records or transactions.

## Identity and access control

- Merchant and administrator accounts use password login, scrypt password hashes, signed tokens, and role and merchant ownership checks.
- Customers use a browser-generated `buyerId`, stored in `localStorage` and sent in the `X-Buyer-Id` header to access their demo orders. This is not a verified account identity. Obtaining or forging the identifier can undermine order isolation; it cannot replace customer authentication.
- Merchant and administrator tokens are also stored in `localStorage`. Session management, credential rotation, input validation, browser security policies, and audit logging require further work before production use.

## Payments and orders

The payment flow displays a merchant's payment QR code, accepts the customer's declaration of payment, and relies on the merchant to check it manually. Uploaded payment proofs support manual review. The project does not integrate WeChat Pay or Alipay server-side transactions, verified callbacks, automated reconciliation, or actual refunds.

The `payment-callback` endpoint is an administrator-protected operation that marks an order; it is not a payment provider callback implementation. Business states such as `pending-confirmation` currently mark the order record as `paid`. This field does not prove that funds have been received or verified. Do not upload real payment QR codes or transaction screenshots for a demonstration.

Stock validation and updates need stronger concurrency handling, and order state constraints do not cover all production scenarios. The displayed order states, statistics, and transaction identifiers are demonstration data, not evidence of real business activity.

## Environment and demo data

- Keep local environment files, database files, and dumps out of version control. Use the environment example to configure an isolated instance, and protect your own database, object storage, and AI credentials.
- `DEMO_SEED=true` permits fictional merchants, products, orders, and a default address to be inserted when the corresponding tables are empty. It also enables password backfilling for legacy demo merchants. If unset, seeding defaults to enabled outside production and disabled when `NODE_ENV=production`. Set `DEMO_SEED=false` explicitly to disable it.
- Disabling seeding does not remove existing data or prevent initialization of tables, basic application settings, or the administrator account configured through environment variables. Evaluate configuration changes in a separate empty database.
- Documented demo accounts and default development credentials are public and intended only for local use. Do not use them for internet-facing deployments or reuse them for other services. Production configuration checks are not a guarantee of production security.
- Image uploads require separately configured object storage; AI features require an optional service key. Do not include real personal or payment information in demo uploads or AI requests.

## Historical files excluded from the published copy

- `SECURITY_AUDIT_REPORT.md`, which contained historical environment credentials and request examples.
- `c-app/tools/auth-proxy.cjs`, which contained a historical default access password.
- Legacy SQLite inspection and repair scripts that no longer match the MySQL implementation.

Seed merchant passwords were replaced with explicit demo values, and remaining example phone numbers were replaced or redacted. This cleanup applies to the published copy only; it does not invalidate historical credentials. If an old credential is still used by a service, its owner should rotate it in that service.

## Further security work

Production use requires an independent assessment and implementation of customer authentication, payment verification and reconciliation, upload validation and access isolation, concurrent stock control, order state constraints, trusted proxy configuration, and durable rate limiting. The current in-memory rate limiter and prototype access checks do not provide comprehensive protection.

If you find a vulnerability, use a private vulnerability reporting channel where one is available for the repository. Do not post keys, real personal information, payment proofs, or tokens that grant access to live services in a public issue. If no private channel is available, start with a contact request that omits sensitive details.
