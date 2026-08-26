## 1. Project Setup

- [ ] 1.1 Configure backend dependencies and application entry point, and verify the backend starts in the default local profile
- [ ] 1.2 Configure runtime profiles for in-memory test database, PostgreSQL and MySQL, and verify each profile resolves its datasource settings
- [ ] 1.3 Configure external API properties for CNPJ, CEP and quote providers, and verify missing required credentials produce explicit startup or operation feedback
- [ ] 1.4 Configure frontend project structure and build scripts, and verify the frontend production build succeeds
- [ ] 1.5 Configure container packaging for backend, frontend and relational database, and verify the composed environment starts with the application reachable over HTTP

## 2. Persistence

- [ ] 2.1 Create versioned database migrations for users, brokers, assets, wallets and positions, and verify a clean database migrates successfully
- [ ] 2.2 Add uniqueness constraints for email, session token, CNPJ, ticker and wallet-position pairs, and verify duplicate inserts are rejected
- [ ] 2.3 Add foreign-key relationships between users, wallets, assets, brokers and positions, and verify invalid references are rejected
- [ ] 2.4 Add demonstration broker and asset seed data, and verify migrated local environments contain usable initial catalog data
- [ ] 2.5 Implement persistence models and repositories, and verify repository queries return expected records by email, token, CNPJ, ticker, wallet and position

## 3. Authentication

- [ ] 3.1 Implement user registration with validation, password hashing and default investor role, and verify registration tests cover success, invalid email, short password and duplicate email
- [ ] 3.2 Implement login with opaque session token generation, and verify valid credentials return token/name/email/role while invalid credentials return unauthorized
- [ ] 3.3 Implement Bearer token authentication lookup for protected operations, and verify missing, blank and unknown tokens are rejected
- [ ] 3.4 Implement logout token invalidation, and verify a token cannot access protected endpoints after logout
- [ ] 3.5 Implement default user seeding for administrator and investor accounts, and verify startup creates missing default accounts and wallets idempotently

## 4. External Integrations

- [ ] 4.1 Implement CNPJ lookup adapter and market-participant detection, and verify tests cover active financial companies, inactive companies, non-financial companies and provider failures
- [ ] 4.2 Implement CNPJ lookup caching, and verify repeated CNPJ lookups avoid redundant provider calls while returning the same mapped data
- [ ] 4.3 Implement CEP lookup adapter and validation behavior, and verify tests cover valid CEP, missing CEP, provider "not found" responses and provider failures
- [ ] 4.4 Implement CEP lookup caching, and verify repeated CEP lookups avoid redundant provider calls while returning the same mapped data
- [ ] 4.5 Implement BR quote lookup, and verify a valid BR ticker returns symbol, company name, currency and current price
- [ ] 4.6 Implement US quote lookup with required credential handling, and verify valid credentials return price while missing credentials produce a clear error
- [ ] 4.7 Implement unsupported-market and quote-provider error handling, and verify invalid markets, missing tickers, rate limits and credential errors return normalized API errors

## 5. Broker And Asset APIs

- [ ] 5.1 Implement broker creation by CNPJ, and verify it normalizes formatted input, validates check digits, enriches public data, validates CEP and persists the broker
- [ ] 5.2 Implement broker duplicate and provider-failure handling, and verify invalid CNPJ, duplicate CNPJ, missing company data and invalid CEP are rejected
- [ ] 5.3 Implement broker list, find-by-id and find-by-CNPJ endpoints, and verify authenticated requests return expected data or not-found responses
- [ ] 5.4 Implement asset creation with ticker normalization, broker eligibility and quote lookup, and verify created assets include ticker, company, market, currency, quote, timestamp and broker summary
- [ ] 5.5 Implement asset duplicate, invalid-market and unvalidated-broker handling, and verify each rule returns a normalized error
- [ ] 5.6 Implement asset list, find-by-id, find-by-ticker and quote-refresh endpoints, and verify authenticated requests return expected assets and refreshed quote data

## 6. Portfolio And Dashboard

- [ ] 6.1 Implement principal-wallet creation and lookup, and verify a missing wallet is created with zero balances while existing wallets are reused
- [ ] 6.2 Implement wallet contribution, and verify positive values increase cash balance while zero, negative or missing values are rejected
- [ ] 6.3 Implement asset purchase, and verify the operation refreshes quote, checks cash balance, debits cash, creates or updates position, recalculates average price and recalculates stock balance
- [ ] 6.4 Implement purchase failure handling, and verify insufficient cash, invalid quantity and missing asset cases are rejected
- [ ] 6.5 Implement asset sale, and verify partial sales reduce quantity, full sales remove active position, cash is credited and stock balance is recalculated
- [ ] 6.6 Implement wallet isolation, and verify users can list and access only wallets and positions linked to their authenticated account
- [ ] 6.7 Implement wallet REST endpoints for listing, principal wallet, recalculation, contribution and cash-balance update, and verify endpoint tests cover success and failure paths
- [ ] 6.8 Implement dashboard endpoints for stats, brokers, assets and wallets, and verify dashboard responses aggregate only the expected authenticated-user data

## 7. Frontend

- [ ] 7.1 Implement shared API URL and request helper, and verify authenticated requests include Bearer token while unauthorized responses clear local session
- [ ] 7.2 Implement local auth service for login, registration, logout and session parsing, and verify corrupted or tokenless local data is treated as unauthenticated
- [ ] 7.3 Implement protected and public client routes for login, dashboard, brokers, assets and wallet, and verify unauthenticated navigation redirects to login
- [ ] 7.4 Implement login and registration UI flow, and verify successful registration returns to login while successful login navigates to dashboard
- [ ] 7.5 Implement dashboard UI with cards, position list and charts, and verify it renders loaded data and empty states correctly
- [ ] 7.6 Implement broker management UI, and verify CNPJ submission, success/warning/error messages, validation badge display and table sorting
- [ ] 7.7 Implement asset catalog and trade UI, and verify asset creation, buy flow, sell modal, position table and empty states
- [ ] 7.8 Implement wallet UI, and verify balances, contribution flow, total calculation and positions table update after API responses
- [ ] 7.9 Implement shared navigation and market ticker components, and verify all protected pages provide consistent navigation and logout behavior

## 8. Verification And Delivery

- [ ] 8.1 Add unit tests for authentication, broker, asset, wallet and integration-adapter services, and verify the backend test command passes
- [ ] 8.2 Add application context and migration validation tests, and verify startup succeeds against the test profile
- [ ] 8.3 Add API collection or equivalent request documentation, and verify it covers auth, brokers, assets, wallet operations and dashboard endpoints
- [ ] 8.4 Run frontend build validation, and verify the generated static assets are suitable for backend packaging
- [ ] 8.5 Run full local verification with backend, frontend and database, and verify the end-to-end flow of register/login, broker creation, asset creation, contribution, buy, sell and dashboard refresh
- [ ] 8.6 Validate the OpenSpec change, and verify proposal, specs, design and tasks pass schema validation before implementation starts
