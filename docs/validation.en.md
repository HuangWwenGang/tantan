# Validation Record

[简体中文](validation.md) | **English**

The following checks were completed on October 17, 2026, using an isolated local MySQL 8.4 demo database. Screenshots were captured from the running applications, and all displayed figures are fictional demo data.

| Check | Result |
| --- | --- |
| TypeScript checks across all four workspaces | Passed |
| Vite builds for the three frontends and TypeScript build for the API | Passed |
| `npm test` | 7 tests passed, covering opening hours across midnight, stock boundaries, merchant isolation, option pricing, and cart keys |
| `npm audit` | 0 known vulnerabilities reported for the lockfile at the time of validation; this is a dependency-audit result, not a full security audit |
| API and database | Health check, administrator/merchant login, and product and merchant reads passed |
| Order flow | Order placement → customer marks payment as made → merchant confirms payment receipt → ready for pickup → completed passed |
| Access isolation | Attempts to modify the order using a different customer identifier or merchant were rejected |
| Timestamp regression | `createdAt` was preserved when orders were read from the database, and relative times displayed correctly in the workspace |
| Interface | Customer stall-code entry, merchant login, administrator login, and the merchant list were functional |

Real payments, real delivery, external Gemini calls, object-storage uploads, and public production deployment were not validated. The Docker Compose configuration is provided for local startup; this integration validation used a standalone MySQL process. GitHub Actions reruns type checks, tests, and builds after pushes.

Core checks that can be reproduced:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm audit
```
