## Context

See `proposal.md` for motivation and capability scope. The planned system is a web platform with a REST backend, relational persistence, external public-data integrations and a single-page frontend. The domain centers on authenticated users, broker registration, asset catalog management and investor wallet operations.

The design should keep business rules in application services, expose stable HTTP contracts through DTOs, and isolate external providers behind domain-facing integration ports.

## Goals / Non-Goals

**Goals:**

- Keep the backend organized as controller -> service -> repository -> entity, with DTOs at the API boundary.
- Keep external CNPJ, CEP and quote providers replaceable through ports and adapters.
- Use database migrations as the source of truth for schema creation and evolution.
- Provide a frontend that consumes the REST API directly and protects internal routes through local session state.
- Support local development, automated tests and containerized execution with minimal environment differences.

**Non-Goals:**

- Do not build a trading integration with real broker order execution.
- Do not provide multi-factor authentication, OAuth or password reset in this change.
- Do not implement portfolio performance history or audit ledger beyond current wallet balances and active positions.
- Do not build a full role/permission administration UI.
- Do not depend on paid-only data sources for the basic happy path.

## Decisions

### Layered backend with domain ports

Use a layered backend with REST controllers, services, repositories and entities. Services own business rules such as CNPJ validation, broker eligibility, asset quote refresh, wallet balance checks and average-price calculation.

Alternatives considered:

- Put rules in controllers: rejected because HTTP concerns and business behavior would be coupled.
- Put provider logic directly in services: rejected because provider changes would leak into domain flows.

### DTOs for public API contracts

Use request and response DTOs for REST payloads where the API exposes broker, asset and position data. Avoid exposing persistence-only fields such as password hash or session token through entity serialization.

Alternatives considered:

- Return entities everywhere: simpler initially, but increases coupling and accidental data exposure.
- Introduce a full mapping framework: unnecessary for the expected object graph size.

### Session-token authentication

Use email/password login with hashed passwords and a server-generated opaque session token. Protected endpoints require `Authorization: Bearer <token>`. Logout invalidates the current token.

Alternatives considered:

- JWT: useful for stateless services, but adds expiration/signing concerns not needed for a small monolith.
- HTTP session cookies: convenient for server-rendered apps, but less explicit for an API consumed by a SPA.

Role values for administrator and investor should exist in the user model. Enforcement can be added at controller/service boundaries where a requirement needs role-specific access.

### Relational model with migration-first schema

Use a relational schema for users, brokers, assets, wallets and positions. Migrations create tables, constraints and relationships, and the ORM validates that entities match the schema.

Alternatives considered:

- ORM-generated schema: faster in prototypes, weaker for controlled evolution and multiple database engines.
- Document database: poor fit for wallet-position relationships, uniqueness constraints and transactional updates.

### Portfolio operations as transactional service methods

Wallet operations should be transactional. Buying an asset refreshes quote, checks cash balance, updates or creates position, recalculates average price and updates balances atomically. Selling refreshes quote, checks available quantity, credits cash, reduces or removes position and recalculates balances.

Alternatives considered:

- Split operations across several independent API calls: rejected because partial updates could leave inconsistent balances.
- Store only transactions and derive positions dynamically: more auditable, but beyond this change's scope.

### External integrations through Feign-style clients

Use HTTP clients for Brasil API, ViaCEP, brapi and Alpha Vantage. Adapters translate provider-specific payloads into domain records. CNPJ and CEP results are cacheable because they are relatively stable; quote lookups should stay fresh for operations.

Alternatives considered:

- Use one generic HTTP client directly everywhere: rejected because each provider has distinct payload and error handling.
- Cache quotes aggressively: rejected because buy/sell should use current prices as much as the providers allow.

### React single-page frontend

Use a React/Vite SPA with routes for login, dashboard, brokers, assets and wallet. Store minimal session information in browser local storage and include the Bearer token through a shared request helper.

Alternatives considered:

- Server-rendered pages: simpler deployment in one backend, but less ergonomic for repeated dashboard/table interactions.
- Angular: heavier project structure for this scope and not required by the desired UI behavior.

### Error response normalization

Normalize API error responses with timestamp, status, error and message. Include field-level details for request validation errors. Map external provider failures to meaningful HTTP status and user-facing messages where possible.

Alternatives considered:

- Return raw exceptions: rejected because clients would receive unstable and potentially sensitive details.
- Hide all external failures as generic 500 errors: rejected because users need actionable feedback for missing credentials, rate limits and not-found cases.

## Risks / Trade-offs

- Session tokens stored in the database can be invalidated easily -> Mitigate by indexing/uniqueness and keeping token values opaque.
- Local storage is exposed to browser-side script execution -> Mitigate with minimal stored data and future hardening if stronger auth is required.
- Role values without explicit enforcement can mislead API consumers -> Mitigate by adding role checks where specs require administrator-only behavior.
- Public APIs can change shape, rate-limit calls or become unavailable -> Mitigate with adapters, cache for stable lookups and explicit error handling.
- Quote refresh during buy/sell can make operations slower or fail due to provider limits -> Mitigate with clear messages and retry-friendly client behavior.
- Supporting multiple database engines can expose type differences for UUID and numeric precision -> Mitigate with Liquibase migrations validated under each supported profile.
- A global asset catalog simplifies reuse but prevents different broker-specific ticker metadata -> Mitigate by keeping broker relation explicit and adding richer catalog rules only when needed.

## Migration Plan

1. Create the backend project structure, runtime configuration and database migrations.
2. Implement domain entities, repositories and service-level business rules.
3. Implement external integration ports, adapters and provider clients.
4. Implement REST controllers, DTOs and error handling.
5. Implement frontend routes, shared API/auth services and screens.
6. Add unit tests for services/adapters and integration/context tests for startup.
7. Add container packaging that builds the frontend and serves it from the backend artifact.
8. Validate happy paths and failure scenarios with API tests and manual frontend checks.

Rollback strategy: keep database changes additive during early delivery. If deployment fails before real user data exists, rebuild the environment from migrations. After production data exists, future destructive schema changes must include explicit rollback or data migration steps.
