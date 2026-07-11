# Gujarat Art & Craft ERP
## Enterprise System Architecture & Technical Design Specification
### Sections 1 – 25
### Version: 0.4
### Status: Sections 1–20 Approved and Frozen; Sections 21–25 Draft — Under Architecture Review

---

## Section 1 — Document Control

### 1.1 Document Metadata
* **Document Title:** Enterprise System Architecture and Technical Design Specification
* **Version:** 0.1
* **Status:** Draft — Sections 1–5 Under Review
* **Repository:** [gujarat-art-craft-erp](https://github.com/vatsal1927/gujarat-art-craft-erp)
* **Baseline Tag:** `phase-0-approved-v1.0`
* **Applies To:** Gujarat Art & Craft ERP Core Platform

### 1.2 Scope
This document defines the system context, frontend and backend patterns, data ownership, security configurations, and incremental migration designs for the Gujarat Art & Craft ERP.

#### In-Scope Items
1. Architectural audit of the React/TypeScript frontend and Motoko backend.
2. Definition of approved target architecture (clean separation of concerns, normalization).
3. Mapping of module boundaries, data-flows, and security controls.
4. Safe migration roadmap for legacy technical debt.
5. Definition of standard Candid API evolving strategies and upgrade verification.

#### Out-of-Scope Items
1. Integration of external SMS or email gateways (architectural specification only).
2. Rewrite of active production accounting ledger logic in this phase.
3. Third-party visual styling modifications or changing the core UI theme layout.

### 1.3 Key Assumptions
* The Motoko backend runs on the Internet Computer Protocol (ICP).
* Internet Identity (II) is the primary decentralized identity provider, supplemented by derived password-based Ed25519 identity keys for local staff convenience.
* Frontend applications are built with React, Vite, and Tailwind CSS.

### 1.4 Known Constraints & Dependencies
* **Candid Compatibility:** Motoko stable state upgrades must maintain Candid backward compatibility.
* **Legacy Serialization (taxId):** Customer metadata and invoice transaction snapshots are serialized in a pipe-delimited string format within the `taxId` property. This must not be broken during Phase 1.
* **Hybrid Storage:** Master vendor records and extended raw material metadata exist on the client side in `localStorage`.
* **Single Master Admin:** The system MUST enforce exactly one active Master Admin account. The owner's identity is deployment data and MUST NOT be hardcoded in architecture rules.

---

## Section 2 — Executive Architecture Summary

### 2.1 Current System Summary
The Gujarat Art & Craft ERP is a manufacturing enterprise planning application designed to run on and integrate with the Internet Computer Protocol (ICP). The frontend is a single-page application (SPA) built with React and TypeScript, leveraging React Query (v5.24.0) for server-state caching and `@tanstack/react-router` (v1.131.8) for client-side navigation. The backend is implemented as a Motoko canister, serving as an authoritative datastore.

### 2.2 Key Architectural Goals
1. **Decouple Client/Server Roles:** Shift authoritative business calculations and access controls from frontend hooks to backend canister services.
2. **Normalize Hybrid Data:** Gradually migrate vendor data and extended raw material metadata from browser `localStorage` into persistent canister-stable memory.
3. **Decentralized Security Hardening:** Ensure all backend mutations validate caller identity, roles, and resource ownership at the canister boundary.
4. **Preserve Operational Continuity:** Ensure that legacy data schemas (such as the pipe-delimited `taxId` string) remain readable while implementing versioned, dual-write migration pathways.

### 2.3 Key Architectural Risks
* **Data Loss on Local Storage Clear:** Storing master vendor data in `localStorage` creates a high risk of data loss if a user clears their browser cache.
* **Brittle Legacy Parsers:** Any deviation in the pipe-delimited format inside the `taxId` field will break invoice rendering, GST reporting, and outstanding balance summaries.
* **Canister State Limits:** As the transaction volume grows, storing large unbounded lists within Map variables on a single canister will increase heap utilization.

### 2.4 Migration Philosophy
All changes proposed in this specification follow a strict **non-disruptive, backward-compatible, incremental migration** model:
1. **No Breaking Upgrades:** The backend schema migrations must utilize fallback fields or adapter wrappers.
2. **Dual-Read compatibility:** The system will read from both new canister fields and legacy serialized strings.
3. **Strict Validation:** No code changes will be deployed without compiling and validating against existing TypeScript configurations.

---

## Section 3 — Current-State Architecture Audit

We inspected the complete repository to evaluate backend stability, frontend architecture, and data pipelines. The following files and modules were audited:
* **Backend:** `backend/main.mo`, `backend/migration.mo`
* **Frontend Config & Adapters:** `frontend/src/config.ts`, `frontend/src/backend.ts`, `frontend/src/mockBackend.ts`
* **Auth & Security:** `frontend/src/components/AuthGuard.tsx`, `frontend/src/utils/auth.ts`, `frontend/src/utils/authService.ts`
* **Queries & State:** `frontend/src/hooks/useQueries.ts`, `frontend/src/hooks/useActor.ts`
* **Calculation Utilities:** `frontend/src/utils/calculations.ts`, `frontend/src/utils/masterData.ts`
* **Layout Shell & Routing:** `frontend/src/App.tsx`, `frontend/package.json`

### 3.1 Architectural Findings & Violations

| Finding ID | Severity | Find Description | Affected Files | Business Impact | Security Impact | Treatment Rationale & Treatment |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **P1-FIND-001** | **High** | Extended vendor master profile data (bank information, PAN, rating, address) is currently stored in browser `localStorage`, while vendor transaction references exist in the canister. | `frontend/src/utils/masterData.ts`<br>`frontend/src/hooks/useQueries.ts` | Clearing cache/browser data permanently deletes all custom vendors and bank accounts. | No access controls on vendor master records; local data is susceptible to tampering by browser scripts. | **Rationale:** The canister contains transactional records that reference vendors, but master vendor profiles exist solely in the browser. Clear data loss risk.<br>**Treatment:** Define stable vendor records on backend and synchronize vendor storage. |
| **P1-FIND-002** | **Medium** | Extended Raw Material Metadata (Warehouse location, rack/bin, max stock, status, purchase rate overrides, image URL) resides in `localStorage`. | `frontend/src/utils/masterData.ts`<br>`frontend/src/hooks/useRawMaterialForm.ts` | Multi-user sync gaps; one client changing a warehouse location won't update other devices. | Unauthorized local editing of alert triggers or warehouse categorizations. | **Rationale:** Ledger records exist in Motoko, but extended operational parameters are stored in client settings. Moderate data synchronization issue.<br>**Treatment:** Refactor `RawMaterial` in `main.mo` to natively support these fields. |
| **P1-FIND-003** | **Medium** | Brittle Pipe-Delimited Customer Serialization format inside `taxId`. | `frontend/src/utils/calculations.ts`<br>`frontend/src/pages/CreateInvoice.tsx`<br>`frontend/src/pages/ViewInvoice.tsx` | A change in the delimiter structure instantly breaks outstanding balance calculations and historical GST reports. | Hard to validate input strings cryptographically. Backend cannot query nested data within Candid fields natively. | **Rationale:** Standard database integrity risk. Delimited serialization bypasses compiler-level safety guarantees.<br>**Treatment:** Maintain serializing logic for backward compatibility. Add a target migration pathway. |
| **P1-FIND-004** | **Low** | Client-side outstanding balance derivations. | `frontend/src/utils/calculations.ts` | Potential display mismatch if local calculations run with incomplete local datasets. | Exposes previous due balances and advance amounts to client-side logic overrides. Risk becomes **High** if backend save endpoints accept these snapshots without independent validation. | **Rationale:** Presentation-only calculation step. Low severity only if restricted to frontend display summaries. However, validation gaps represent a major threat if values are trusted by the canister during mutation endpoints.<br>**Treatment:** Verify whether invoice-save endpoints independently calculate or validate financial snapshots. If validation is missing, register a later backend hardening work package. |
| **P1-FIND-005** | **Low** | Layout-level frontend route protection rather than router loader guards. | `frontend/src/App.tsx` | Redirection is based on layout component triggers (`useEffect` hooks). | Route guards are not a security boundary; clients can bypass client navigation, making backend checks the ultimate filter. | **Rationale:** Low risk since backend canister validates principal-level access to endpoints.<br>**Treatment:** Ensure all sensitive queries and state-changing updates validate Principal roles. |

### 3.2 Reviewed Evidence Register

| File Inspected | Exact Architectural Claim Supported | Evidence Lines/Context |
| :--- | :--- | :--- |
| `frontend/package.json` | Verifies project dependencies: React Query (v5.24.0) and `@tanstack/react-router` (v1.131.8). | Lines 56–57: `"@tanstack/react-query": "^5.24.0"`, `"@tanstack/react-router": "~1.131.8"` |
| `frontend/src/App.tsx` | Shows TanStack router initialization and useEffect layout-level navigation redirects. | Lines 2, 83–155: LayoutContent navigation hook checks roles client-side. |
| `frontend/src/hooks/useActor.ts` | Shows password-derived identity path and fallback mock actor loading. | Lines 21–32: Reconstructs Ed25519KeyIdentity from local `user_session` or `sessionStorage` token. |
| `frontend/src/utils/calculations.ts` | Proves pipe-delimited parsing format indexes of `taxId` string. | Lines 41–53: Comments and parsing code showing pipe index offset mappings. |
| `frontend/src/utils/masterData.ts` | Proves vendor profile list is kept in `localStorage` under `mock_vendors`. | Lines 18–30: `localStorage.getItem('mock_vendors')` |
| `backend/main.mo` | Proves lack of a native backend `Vendor` table/map in the canister state. | Lines 667–687: Shows `purchasesList` and `vendorPaymentsList` but no vendor master table. |
| `frontend/src/components/AuthGuard.tsx` | Proves session storage mechanism is dynamically resolved using `localStorage` (if rememberMe is set) or `sessionStorage` (if not). | Lines 78, 519–522, 891, 995: Storage type chosen based on checkbox. |

### 3.3 Claims Requiring Further Verification
* **Canister Upgrade Calling path of `migration.mo`:** The actor declaration in `backend/main.mo` uses the syntax `(with migration = Migration.run) actor`. It is currently unverified how the migration runtime is invoked or triggered during live canister upgrades (e.g., standard `pre_upgrade`/`post_upgrade` system hooks are not declared in `main.mo`).
* **Offline Synchronization:** It is unverified if any automated offline transaction synchronization exists beyond standard browser storage caching.

---

## Section 4 — Architecture Principles

These principles convert the Phase 0 Constitution into technical system rules for Phase 1:

### P1-ARCH-001: Separation of Concerns (SoC)
* **Rule:** UI components must only render visual models and forward user actions. They must not formulate raw business queries or execute authoritative ledger updates.
* **Rationale:** Maximizes frontend reusability, simplifies testing, and prevents security validation gaps.

### P1-ARCH-002: Authoritative Calculations
* **Rule:** The system MUST distinguish authoritative backend calculations from permitted frontend display, preview, and formatting calculations. All final database postings, balances, and inventory adjustments must be calculated/validated by the canister.
* **Rationale:** Protects the integrity of corporate ledgers against client-side tampering.

### P1-ARCH-003: Core Identity Mapping
* **Rule:** Visible UI roles MUST remain exactly: **Master Admin**, **Admin**, **Staff**.
  Internal mappings are documented separately as:
  * Master Admin -> `#Admin`
  * Admin -> `#Manager`
  * Staff -> `#Staff`
  The UI MUST NEVER display "Manager", "Connected Admin", or "Staff Connected Admin" as user-facing roles.
* **Rationale:** Complies with UI role specifications while maintaining backend compatibility.

### P1-ARCH-004: Modular Boundaries
* **Rule:** Modules must import from public shared layers only (types, hooks, utils). Direct cross-imports between distinct domain page folders are forbidden.
* **Rationale:** Reduces circular dependency risks and allows safe decomposition of code.

### P1-ARCH-005: Authorization Checks
* **Rule:** Every sensitive query and every state-changing update MUST enforce authorization appropriate to the resource and operation. Route guards must not be relied upon as security boundaries.
* **Rationale:** Adheres to security-by-default architecture.

---

## Section 5 — System Context Architecture

The diagram below details the operational boundaries of the Gujarat Art & Craft ERP ecosystem:

```mermaid
graph TB
    subgraph Client Browser Context
        User([ERP User: Master Admin / Admin / Staff])
        SPA[React SPA App - SPA Shell]
        
        subgraph Client State & Storage
            RQ[React Query Cache]
            LStore[("Browser Local Storage<br>• Persistent User Session (Remember Me)<br>• Vendor Metadata<br>• Master Data")]
            SStore[("Session Storage<br>• Temporary User Session")]
        end
    end

    subgraph Canister Gateway & Dev Fallback
        Gateway[Gateway Adapter: backend.ts]
        Candid[Generated Candid Bindings]
        MockBE[Mock Backend - mockBackend.ts]
    end

    subgraph Internet Computer Protocol ICP
        IdentityProv[Internet Identity - II]
        
        subgraph Canister Container
            ActorInterface[Motoko Actor - main.mo]
            CanisterDB[(Canister Stable State)]
        end
    end

    subgraph Unverified Upgrade Engine
        MigrationEngine[Migration Engine - migration.mo]
    end

    subgraph Future Integrations (Proposed)
        NotificationProvider[Future Notification Gateway]
        EmailProvider[Future Email Service]
    end

    %% Interactions
    User -->|Uses Browser| SPA
    SPA -->|Read/Write UI Preferences| LStore
    SPA -->|Query Caching| RQ
    SPA -->|Verify Session| SStore
    
    %% Authentication Paths
    SPA -->|Decentralized Login| IdentityProv
    
    %% Password Login Routing Flow
    SPA -->|1. Password Login| AuthSvc[Auth Service]
    AuthSvc -->|2. Remember Me?| Decision{Remember Me?}
    Decision -->|YES| LStore
    Decision -->|NO| SStore
    
    %% Backend calls
    SPA -->|Request actor| Gateway
    Gateway -->|Invoke methods| Candid
    Candid -->|Calls Canister Endpoints| ActorInterface
    ActorInterface -->|Update/Fetch| CanisterDB
    
    %% Dev fallback
    Gateway -.->|Fallback in Dev| MockBE
    
    %% Migration Hook (Unverified Callpath)
    ActorInterface -.->|Invocation relationship under verification| MigrationEngine
    
    %% Future services
    ActorInterface -.->|Proposed future triggers| NotificationProvider
    ActorInterface -.->|Proposed future triggers| EmailProvider
```

---

## Section 6 — Frontend Architecture

### 6.1 Current Architecture
The current frontend application is built as a single-page application (SPA) using React (v19.1.0) and TypeScript, compiled via Vite. 
* **Application Shell:** Defined in `frontend/src/App.tsx`, which registers the core context providers (React Query `QueryClientProvider`, `AuthGuard` provider) and wraps the layout shell.
* **Routing:** Navigation is managed by `@tanstack/react-router` (v1.131.8). Page components (e.g. `Dashboard`, `CreateInvoice`, `Settings`, `Ledger`, `ProfitLoss`) are lazy-loaded using React's `lazy` and rendered within a `withSuspense` fallback wrapper.
* **Navigation Protection:** redirectional routing occurs within a `useEffect` hook in `LayoutContent` in `App.tsx` by parsing pathnames against user permissions and triggering redirects to `/unauthorized` client-side.
* **Business Logic Mapping:** Authoritative operations (such as tax calculations, balance validations, and stock calculations) are implemented directly inside frontend page components (`CreateInvoice.tsx`, `Purchases.tsx`, `JobWork.tsx`) or raw helper utilities (`calculations.ts`, `masterData.ts`).

### 6.2 Target Architecture
The target architecture refactors the frontend into clean, decoupled layers, moving route guards to route-level configurations and separating view concerns from business transactions:
* **Route Loaders & Guards:** Redirects must move from `useEffect` hooks in rendering layouts to `@tanstack/react-router`'s `beforeLoad` route configuration parameters. This recommendation represents the target architecture only and does not imply that the current implementation is incorrect. The existing layout-level routing remains functionally valid, but the proposed approach improves long-term scalability, maintainability, and separation of concerns.
* **View/Logic Separation:** Page components must contain zero logic for calculations or Candid formatting; they must delegate transactions to domain hook wrappers.
* **Layout Isolation:** Establish explicit route layouts (`MainLayout`, `ProductionLayout`) instead of keeping all layout redirection logic inside a single monolithic `App.tsx` file.

### 6.3 Responsibilities
* **SPA Shell (`App.tsx`):** Bootstrapping contexts and providers.
* **Route Configuration:** Defining path paths, lazy imports, and route-level loaders.
* **UI Components:** Presentation rendering and UI state.
* **Query Hooks:** Encapsulating network transactions and React Query cached data.

### 6.4 Public Interfaces
* **Route Definitions:** Exported routes from route configs.
* **Hooks API:** Standardized hooks (e.g. `useActor`, `useQueries`).

### 6.5 Dependency Rules
* Page components are permitted to import visual UI primitives and custom query hooks.
* Query hooks are permitted to import configuration settings and the backend actor client.
* Shared visual primitives must be presentation-only (no state mutations or hooks imports).

### 6.6 Forbidden Dependencies
* Page components must never directly import other page components (bundle boundaries).
* UI primitives (`components/ui/*`) must never import from query hooks or actors.
* Components must never import backend actor interfaces directly (bypassing `useActor` or custom query wrappers).

### 6.7 Architectural Rules
* **P1-ARCH-006 (Route Protection):** Frontend route redirection must occur at the router configuration level (`beforeLoad` hooks) rather than layout-level render hooks (`useEffect`).
* **P1-ARCH-007 (View Boundary):** React components must not contain inline Candid type formatting or raw cryptographic derivations. All mapping must be encapsulated in hooks or service utilities.

### 6.8 Reviewed Evidence
* `frontend/src/App.tsx` (lines 83–155): Verifies that navigation restrictions are currently handled client-side inside a `useEffect` layout trigger.
* `frontend/package.json` (lines 56–57): Verifies TanStack Router is the routing manager.

### 6.9 Risks
* **Layout Redirection Bypass:** Since layout-level redirects run after initial components mount, they can cause temporary flashes of unauthorized content or be bypassed if JS execution is modified.
* **Circular Imports:** A lack of strict directory boundaries creates risks of circular dependencies between page folders.

### 6.10 Open Questions
* Evaluate whether TanStack Router file-based routing provides measurable maintenance benefits over the current manually declared route configuration before adoption.

### 6.11 Acceptance Criteria
* REDIRECT checks reside in route configuration files.
* Component imports obey the layout-to-primitive tree hierarchy.
* No compile-time circular imports between feature folders.

### 6.12 Verification Plan
* Validate build outputs using local Vite compiler commands:
  ```powershell
  .\node_modules\.bin\vite.cmd build
  ```
* Perform compilation type check:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 7 — Feature Module Architecture

### 7.1 Current Architecture
Feature modules are currently located as flat files in a flat page directory structure and custom component files in `frontend/src/components/`. There are no directory boundaries enforcing component scoping.
* **Module List:**
  1. **Dashboard:** (`Dashboard.tsx`, `AnalyticsModal.tsx`) compiles invoice sales statistics, outstanding, and profit charts.
  2. **Sales:** (`CreateInvoice.tsx`, `ViewInvoice.tsx`, `InvoiceHistory.tsx`) handles client invoice entry, GST selection, and invoice printing configurations.
  3. **Purchase & Planning:** (`Purchases.tsx`, `PurchasePlanning.tsx`, `PurchaseInvoiceHistory.tsx`) manages purchase order creation, receipt of goods, and material planning.
  4. **Inventory:** (`Inventory.tsx`, `FinishedGoodsLogs.tsx`, `StockAlerts.tsx`) tracks raw material quantities, conversion configurations, and stock alerts.
  5. **Production:** (`Production.tsx`, `JobWork.tsx`, `Employees.tsx`) tracks worker allocations, wages, daily output collections, and job delays.
  6. **Finance:** (`Ledger.tsx`, `CashBankBook.tsx`, `OutstandingReport.tsx`, `ProfitLoss.tsx`) compiles double-entry models, customer accounts, and GST summaries.
  7. **Settings & Security:** (`Settings.tsx`, `AuthGuard.tsx`) manages branding, company profiles, user creation, and permissions.

### 7.2 Target Architecture
Organize feature files into domain directories under `frontend/src/features/` (e.g., `features/sales/`, `features/purchases/`, `features/production/`, `features/finance/`). 
* **Boundary Encapsulation:** Each directory exposes a clean public API (`index.ts`) containing only the page components. Inner utilities, layouts, and components are encapsulated and hidden from other feature folders.
* **Isolated Queries:** Group queries matching feature boundaries (e.g. `queries.ts` inside `features/sales/` instead of keeping all queries in a global 1800-line `useQueries.ts` file).

### 7.3 Responsibilities & Owned Data
* **Sales Module:** Owns invoices, client snapshots, and prints.
* **Purchases Module:** Owns purchase requirements, PO structures, and GRN receipts.
* **Inventory Module:** Owns raw materials, BOM items, and stock movement logs.
* **Production Module:** Owns worker lists, karigar ledgers, and allocations.
* **Finance Module:** Owns journal ledgers, cash/bank records, and P&L balances.

### 7.4 Public Interfaces
* Page entry components (e.g. `<SalesInvoiceHistory />`, `<ProductionPlanner />`).
* Feature-specific hooks.

### 7.5 Dependency Rules
* Feature modules must not import internal components belonging to other feature modules.
* Cross-module operations must go through shared services, common hooks, or the backend datastore.

### 7.6 Forbidden Dependencies
* `features/production` must never import sub-components directly from `features/sales`.
* `features/finance` must never directly mutate inventory query caches (invalidation must go through common queries).

### 7.7 Architectural Rules
* **P1-ARCH-008 (Feature Encapsulation):** Feature sub-components must reside inside their respective domain directory. Cross-imports of internal layout files between features are prohibited.
* **P1-ARCH-009 (Scoped Queries):** Page components must only call queries aligned with their operational scope.

### 7.8 Reviewed Evidence
* `frontend/src/pages/` listing: Audited flat directory containing numerous page modules currently located in `frontend/src/pages/`.
* `frontend/src/components/` listing: Audited mix of global components and page-specific sub-modals (e.g., `PurchasePaymentModal.tsx` mixed with `SmartDetailDropdown.tsx`).

### 7.9 Risks
* **Brittle Code Organization:** Maintaining a flat page directory structure increases the risk of naming collisions and makes isolating feature boundary failures difficult.
* **Tight Coupling:** Components directly querying other domains trigger massive cascading updates on query invalidations.

### 7.10 Open Questions
* Can we incrementally move pages to feature-based subdirectories without breaking the Vite compiler build config? (Yes, the import paths will be adjusted folder-by-folder).

### 7.11 Acceptance Criteria
* Page files are clustered in functional folders.
* Imports crossing feature directories go through root folders or shared utils.

### 7.12 Verification Plan
* Validate path bindings by running a check compile command:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 8 — Service Layer Architecture

### 8.1 Current Architecture
The current codebase integrates business logic, calculations, and data formatting inside the react query hooks and page components:
* **Client-Side Calculations:** [calculations.ts](frontend/src/utils/calculations.ts) handles discount deductions, tax rates, due calculations, and date parsing.
* **Metadata Normalization:** [masterData.ts](frontend/src/utils/masterData.ts) normalizes vendor fields, bank data, and raw material properties before they are processed by query mutations.
* **External Templates:** [whatsapp.ts](frontend/src/utils/whatsapp.ts) and [whatsappInvoice.ts](frontend/src/utils/whatsappInvoice.ts) compile URI templates for customer billing notifications.
* **Print Layouts:** [pdfGenerator.ts](frontend/src/utils/pdfGenerator.ts) coordinates client-side print stylesheets.

### 8.2 Target Architecture
Establish a clean Service Layer separating visual page interactions from core calculations and data translations:
* **Domain Services:** Extract complex business logic (such as future business services such as FIFO inventory valuation and double-entry postings) from frontend files into separate, testable services.
* **Calculations Distinction:** The frontend calculations must be clearly flagged as **presentation/preview formatting calculations**. Authoritative financial ledgers must be verified and persisted by the backend actor.
* **Integration Services:** Extract template formatting, PDF compilers, and communication integrations into application-level services.

### 8.3 Responsibilities
* **Calculation Services:** Processing GST brackets, totals, and invoice items for display preview.
* **Validation Services:** Verifying forms, phone formats, and input ranges before submission.
* **Integration Services:** Creating export files, prints, and WhatsApp link configurations.

### 8.4 Public Interfaces
* `CalculationEngine`: Interface representing display totals calculators.
* `NotificationService`: Interface wrapping communication link engines.

### 8.5 Dependency Rules
* View layers call services to compute display models.
* Services must not contain UI styling references (no JSX/TSX or Tailwind classes).
* Services must not mutate query cache states directly.

### 8.6 Forbidden Dependencies
* Calculation services must never import React hooks or react-router APIs.
* Services must not call backend actors directly (actor access must occur via repository/queries).

### 8.7 Architectural Rules
* **P1-ARCH-010 (Service Separation):** Authoritative business rules and calculation parameters must not be hardcoded in React view components. Mappings must be isolated in service helper classes.
* **P1-ARCH-011 (Formatting Services):** Integration formatting (such as WhatsApp URI parameters or PDF tables) must be handled by stateless utility functions.

### 8.8 Reviewed Evidence
* `frontend/src/utils/calculations.ts` (lines 4-137): Contains customer previous outstanding calculations.
* `frontend/src/utils/masterData.ts` (lines 52-72): Verifies client-side normalization rules for vendor profiles.

### 8.9 Risks
* **Calculation Discrepancies:** Mismatches between frontend tax calculations and backend canister ledger calculations will lead to inconsistencies in financial reports.
* **Leaking React State:** Services importing state setters create side-effects that are difficult to debug.

### 8.10 Open Questions
* What is the approved precision scaling strategy for float-based calculation engines to prevent JavaScript rounding issues? The rounding strategy should be formally defined during the financial calculation implementation phase.

### 8.11 Acceptance Criteria
* Calculations are isolated from view layout files.
* Unit tests can run against services without mounting components.

### 8.12 Verification Plan
* Compile checking of typescript boundaries:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 9 — Repository and Data Access Architecture

### 9.1 Current Architecture
The current data access layer is tightly coupled to the generated actor interface:
* **Direct Actor Queries:** Component queries inside `useQueries.ts` fetch the actor via the `useActor` hook and invoke canister endpoints directly.
* **Mock Actor Fallback:** In non-production environments where the canister replica is unavailable, the system falls back to `mockBackend.ts` (which replicates backend endpoints using `localStorage`).
* **Candid Marshalling:** Data translation (such as optional lists representation `[T]` to TypeScript properties, and mapping bigints to dates) is done inline in query hooks or view components using helpers like `candidHelpers.ts`.

### 9.2 Target Architecture
Introduce a structured Repository/Adapter layer to decouple the React query layer from Candid actor structures:
* **Canister Client Boundary:** Establish an adapter class that translates TypeScript types to Candid records.
* **Type Normalization:** Automatically map Motoko optional parameters (like `?Text` or optional lists `[]`/`[T]`) into clean TypeScript fields before delivering data to queries.
* **Error translation:** Intercept backend error logs and parse them into standard application exceptions.
* **Test Doubles:** Use clean interface mocks instead of relying on inline mock classes inside production files.

### 9.3 Responsibilities
* **Candid Adapter:** Map query inputs to Candid arguments.
* **Data Mapper:** Convert Candid records into domain entities.
* **Error Mapper:** Parse Candid trap errors into standard error types.

### 9.4 Proposed Repository Interfaces
* `InvoiceRepository`: Interface for invoice database query and mutation actions.
* `InventoryRepository`: Interface for raw material and stock operations.

### 9.5 Dependency Rules
* Query hooks are permitted to import repository interfaces.
* Repositories are permitted to import generated bindings and actor instances.
* Repositories must not import UI layers or React components.

### 9.6 Forbidden Dependencies
* Page components must never directly call Candid-generated binders.
* Repositories must never reference React state hook variables.

### 9.7 Architectural Rules
* **P1-ARCH-012 (Data Decoupling):** View layers and React Query hooks must access the database via repository abstractions. Direct invocations of the generated actor interface from components are forbidden.
* **P1-ARCH-013 (Candid Mapping):** Candid optional arrays (`[T]` / `[]`) must be mapped to TypeScript types (`T | undefined`) at the repository boundary.

### 9.8 Reviewed Evidence
* `frontend/src/hooks/useQueries.ts` (lines 32–1787): Verifies that queries directly call `actor.getDashboardStats()`, `actor.getInvoices()`, etc.
* `frontend/src/config.ts` (lines 78–133): Verifies HttpAgent initialization and binding configurations.

### 9.9 Risks
* **Candid Evolution Breaks:** Candid schema evolution may require regeneration of frontend bindings and repository adapters. A dedicated compatibility strategy should accompany future backend schema changes.
* **Brittle Mappings:** Inline mapping of bigint values creates rounding risks.

### 9.10 Open Questions
* Should we auto-generate repository adapter interfaces during the dfx binding generation step?

### 9.11 Acceptance Criteria
* Data queries import repository abstractions.
* Candid-specific formats are mapped to domain models.

### 9.12 Verification Plan
* Validate data maps using check compile commands:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 10 — State Management Architecture

### 10.1 Current Architecture
The current state management architecture uses a hybrid storage model:
* **Server State:** Handled in the React Query cache. Key invalidations occur inside query mutations.
* **Authentication Session:** Stored in AuthContext inside `AuthGuard.tsx`. Persistent session data (`user_session`) is written to `localStorage` (if rememberMe is set) or `sessionStorage` (if not).
* **Local Preferences:** Stored in local settings.
* **Operational Metadata:** Vendor configurations (`mock_vendors`) and raw-material overrides (`mock_raw_materials_metadata`) are saved in browser `localStorage`.
* **URL State:** Tab selection query parameters.

### 10.2 Target Architecture
Establish a clean, single-source-of-truth state management model:
* **Server State (React Query):** Remains the source of truth for all backend datastores.
* **Metadata Migration:** Migrate vendor listings and raw material metadata into stable canister maps, removing local storage overrides.
* **Cache Key Normalization:** Define strict cache key patterns to manage dependent query invalidations.
* **Session Lifecycle:** Enforce session clearing upon logout or timeout.

### 10.3 Responsibilities
* **React Query:** Syncing and caching backend datastores.
* **Auth Context:** Managing user session state.
* **URL Router:** Managing filter and tab options.

### 10.4 Public Interfaces
* React Query hooks.
* Auth context provider.

### 10.5 Dependency Rules
* Page components read state from query hooks.
* Query hooks sync state with repositories.

### 10.6 Forbidden Dependencies
* Local component variables must not replicate values stored in React Query cache.
* Local storage must not be used to persist cache records.

### 10.7 Architectural Rules
* **P1-ARCH-014 (State Normalization):** Browser `localStorage` must not be used to persist master operational data. All features must treat the backend canister as the single source of truth.
* **P1-ARCH-015 (Cache Keys):** Query keys must be declared using unified templates to manage cache invalidations.

### 10.8 Reviewed Evidence
* `frontend/src/components/AuthGuard.tsx` (lines 78, 519–522): Shows session storage choices.
* `frontend/src/utils/masterData.ts` (lines 19, 78): Shows `mock_vendors` and `mock_raw_materials_metadata` storage keys.

### 10.9 Risks
* **Cache Desynchronization:** Outdated caches will display stale data if mutations fail to trigger query invalidations.
* **Local Data Tampering:** Storing master data in local storage allows data editing via browser consoles.

### 10.10 Open Questions
* Current React Query default cache settings appear appropriate, subject to future performance testing and production workload validation.

### 10.11 Acceptance Criteria
* Target architecture requires master vendor operations to query the canister database after the planned metadata migration.
* Cache keys use unified naming templates.

### 10.12 Verification Plan
* Compile verification checking:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 11 — Backend Architecture

### 11.1 Current Architecture
The backend is built as a Motoko actor within a single canister defined in `backend/main.mo`.
* **State Management:** Backend state is maintained in-memory inside the actor container using Map (`Map.empty<K, V>()`) and List (`List.empty<V>()`) structures. No variables inside `backend/main.mo` are currently annotated with the `stable` modifier directly, leaving upgrade states managed via the compiler macro `(with migration = Migration.run) actor` routing to `backend/migration.mo`.
* **Logging System:** Current logging uses two systems:
  1. `logActivity` (lines 709–728) appends entries to a linked `activityLogs` list.
  2. `createAuditLogInternal` (lines 730–750) writes to an `auditLogsList` map keyed by sequential `Nat` IDs.

### 11.2 Target Architecture
* **Evaluation of Migration Mechanism:** Evaluate the current enhanced-persistence/migration mechanism, compiler compatibility, upgrade behavior, rollback requirements, and staging verification before pursuing any structural changes to direct stable state management.
* **Bounded Logging Collections:** Replace the linked list structure (`List.List<ActivityLog>`) for operational activity logs with a bounded Map or circular buffer to limit heap consumption during linear traversals.

### 11.3 Responsibilities
* **Authoritative Store:** Serve as the source of truth for invoices, payments, raw material ledgers, and audit trails.
* **Access Control:** Authenticate callers and enforce role-based access.
* **State Upgrades:** Ensure backward compatibility of schema fields during deployments.

### 11.4 Public Interfaces
* Representative list of key verified public endpoints:
  * Invoices: `getInvoices`, `getInvoiceById`, `getNextInvoiceNumber`, `saveInvoice`, `updateInvoice`, `deleteInvoice`
  * Settings: `getSettings`, `saveSettings`
  * User Administration: `registerOrGetSelf`, `getUsers`, `createUser`, `editUser`, `deleteUser`, `updateProfile`, `changePassword`, `toggleUserStatus`, `adminResetPassword`
  * Logging & Auditing: `getActivityLogs`, `logUserAction`
  * Business Operations: `getProducts`, `saveProduct`, `deleteProduct`, `getCustomers`, `saveCustomer`, `deleteCustomer`, `getRawMaterials`, `saveRawMaterial`, `deleteRawMaterial`, `getPurchases`, `savePurchase`, `collectPayment`, `getPayments`, `getPaymentsByCustomer`

### 11.5 Dependency Rules
* Backend actor files must import only standard base libraries (`mo:base/*`), core libraries (`mo:core/*`), and local migration specifications (`migration.mo`).
* The backend actor must not import or depend on client-side modules or frontend routing scripts.

### 11.6 Forbidden Dependencies
* The backend actor must never make outbound HTTP calls relying on unauthenticated client details for local transaction validation.
* Database schemas must not reference frontend-specific visual models (such as presentation coordinates or custom page configurations).

### 11.7 Architectural Rules
* **P1-ARCH-016 (State Upgrades):** All persistent data structures stored in the actor must be upgrade-stable.
* **P1-ARCH-017 (Bounded Allocations & Auditing):** Operational activity logs MAY be bounded to limit memory consumption. Financial, security, authorization, stock reconciliation, and immutable audit records MUST NOT be silently overwritten or pruned.

### 11.8 Reviewed Evidence
* `backend/main.mo` (lines 647–697): Verifies that maps and lists are initialized using standard Core Map and List utilities without `stable` annotations.
* `backend/migration.mo` (lines 432–512): Shows the custom structural migration map run logic.

### 11.9 Risks
* **State Upgrades Failure:** Incompatible migration logic or schema mismatch may cause upgrade failure or prevent correct interpretation of prior state.
* **Heap Exhaustion:** Linear insertions into operational activity logs will steadily increase heap traversal cycles, eventually exceeding the canister consensus execution limits.

### 11.10 Open Questions
* Confirm the exact compiler macro execution mechanics for state mapping inside `(with migration = Migration.run)`.

### 11.11 Acceptance Criteria
* Persistent tables utilize upgrade-stable variables.
* Logging lists enforce upper limits or paginated maps.

### 11.12 Verification Plan
* Validate compilation of local actor imports and structures:
  ```powershell
  dfx build backend
  ```

---

## Section 12 — Data Ownership & Source of Truth

### 12.1 Current Architecture
The system uses a hybrid model of data ownership:
* **Canister Authority:** The canister is the authoritative store for core transaction data: invoices (`invoices`), payment logs (`paymentsList`), customers (`customersList`), raw materials (`rawMaterialsList`), purchases (`purchasesList`), and job works (`jobWorksList`).
* **Browser Storage Authority:** Extended vendor profiles (such as vendor bank account details, PAN numbers, and vendor ratings) and raw material settings (location, rack, bin, min alerts) exist on the client side in browser `localStorage`.
* **Derived Balance Assertions:** The client side calculates outstanding due metrics from historical invoices and passes them as parameters during operations.

### 12.2 Target Architecture
* **Canister Source of Truth:** Migrate all master datasets out of `localStorage` into persistent canister maps. The canister must act as the absolute, single source of truth for all enterprise datasets (products, customers, vendors, and raw materials).
* **Server-Side Balance Derivations:** Calculate customer and vendor outstanding balances on the backend ledger. Client queries should merely retrieve calculated summaries, preventing tampered variables.

### 12.3 Responsibilities
* **Canister:** Authoritative state validation, data persistence, and balance calculation.
* **Client App:** View presentation cache and UI state.

### 12.4 Public Interfaces
* CRUD endpoints for vendor master profiles and raw material settings.

### 12.5 Dependency Rules
* Client page modules query React Query selectors, which call repository utilities to sync data from the canister.
* Local storage must only keep visual settings (e.g. sidebar collapse states, themes).

### 12.6 Forbidden Dependencies
* Page components must not read local storage arrays as source-of-truth vendor profiles.
* mutation endpoints must not accept client-derived outstanding balance values without server-side recalculation.

### 12.7 Architectural Rules
* **P1-ARCH-018 (Canister Authority):** The canister state is the authoritative datastore for all vendors, products, raw materials, finished goods, and customers.
* **P1-ARCH-019 (Authoritative State):** All financial totals and balances must be calculated and validated by the backend canister.

### 12.8 Reviewed Evidence
* `frontend/src/utils/masterData.ts` (lines 18–30): Confirms that vendors are stored in `localStorage` under the `mock_vendors` key.
* `backend/main.mo` (lines 647–697): Confirms the absence of a vendor master table in the canister database.

### 12.9 Risks
* **Data Desynchronization:** If multiple users access the system from different devices, local storage changes on one device will not reflect on another.
* **Data Loss:** Cleared browser caches delete vendor master profiles and vendor bank account details.

### 12.10 Open Questions
* How should historical local storage records be dual-written to canister records during the migration phase?

### 12.11 Acceptance Criteria
* Vendor master ownership moves to the canister only after the approved metadata migration.
* Outstanding balances become backend-calculated or independently validated after the approved finance hardening work package.

### 12.12 Verification Plan
* Verify database syncing endpoints.

---

## Section 13 — API & Candid Contract Architecture

### 13.1 Current Architecture
The API contract is defined in generated Candid did files. Communication between React and Motoko is mediated by generated Candid bindings (`frontend/src/backend.ts`).
* **Serialization Conventions:** Schema naming conventions follow a mix of camelCase for fields and uppercase variant hashes for types.
* **Metadata Packs:** The `taxId` property in `CustomerInfo` is used as a pipe-delimited string (e.g., `phone|gstNo|taxType|dcNo...`) to package customer metadata, bypassing Candid typing.

### 13.2 Target Architecture
* **Typed API Evolution:** Avoid pipe-delimited serialization conventions inside string fields. Define explicit types for data models in Candid.
* **Backward Compatibility:** Maintain support for parsing legacy `taxId` strings while providing versioned endpoints that accept structured records.

### 13.3 Responsibilities
* **Candid Contract:** Define backend types and query/update interfaces.
* **Candid Bindings:** Translate types to TypeScript.

### 13.4 Public Interfaces
* Standard Candid types (`Product`, `CustomerInfo`, `Invoice`).

### 13.5 Dependency Rules
* Candid files are generated from the Motoko actor and used to build frontend bindings.
* React modules must depend on TypeScript bindings generated directly from Candid.

### 13.6 Forbidden Dependencies
* Frontend repository layers must not modify Candid bindings manually.
* Frontend components must not import Candid definitions directly (must go through repository layers).

### 13.7 Architectural Rules
* **P1-ARCH-020 (Candid Compatibility):** API changes must follow Candid backward compatibility rules, allowing old client versions to interact with upgraded canisters.
* **P1-ARCH-021 (Contract Typing):** All new APIs must define data attributes inside structured records rather than pipe-delimited strings.

### 13.8 Reviewed Evidence
* `frontend/src/utils/calculations.ts` (lines 41–53): Shows the offset indexing used to parse pipe-delimited metadata from the `taxId` string.
* `backend/main.mo` (lines 19–23): Shows `taxId` defined as a simple Candid `Text` field.

### 13.9 Risks
* **Breaking Upgrades:** Unchecked Candid modifications can prevent the canister from starting or cause upgrades to fail, risking state loss.
* **Data Corruption:** Invalid delimited strings in `taxId` will break billing calculations.

### 13.10 Open Questions
* Should we introduce structural versioning prefixes to all update payload structures?

### 13.11 Acceptance Criteria
* All new or versioned API endpoints MUST use explicit typed Candid records. Legacy endpoints and historical taxId serialization remain supported through compatibility adapters until formal migration completion.
* Backward compatibility checks are run before upgrading.

### 13.12 Verification Plan
* Execute a toolchain-neutral verification workflow covering:
  - Current and proposed Candid interface signature comparison.
  - Supported compatibility checks.
  - Staging canister upgrade simulations.
  - Canister backup and restore validation steps.
  - Verification of old-client communication capability where required.

---

## Section 14 — Authentication & Authorization Architecture

### 14.1 Current Architecture
* **Identity Resolution:** Authentication is mediated by Internet Identity (II) or client-side derived Ed25519 key identities.
* **Session Persistence:** The `useActor` hook reads credential packets stored in `user_session` in browser storage to reconstruct the `Ed25519KeyIdentity`.
* **Access Control:** Enforced inside backend actor functions by checking the request caller principal: `let caller = msg.caller;` and validating roles in the `users` Map: `users.get(Principal.toText(caller))`.
* **Role Mappings:** Internal roles map to variant enums (`#Admin`, `#Manager`, `#Staff`). User-facing UI displays these as Master Admin, Admin, and Staff respectively.

### 14.2 Target Architecture
* **Unified Access-Control Utility:** Centralize caller verification into a centralized authorization helper function or authorization module to avoid duplicating authentication checks in actor functions.
* **Master Admin Security:** Enforce exactly one active Master Admin account. The owner's identity is deployment data and must not be hardcoded.

### 14.3 Responsibilities
* **Auth Guard:** Block unauthenticated access to frontend layouts.
* **Canister Guards:** Validate caller Principal IDs and check roles before executing mutations.

### 14.4 Public Interfaces
* Authentication state providers and login endpoints.

### 14.5 Dependency Rules
* Components depend on `AuthGuard` to verify sessions.
* Auth services use the browser storage provider to retrieve sessions.

### 14.6 Forbidden Dependencies
* Frontend role tags in browser memory must never override canister-side role validations.

### 14.7 Architectural Rules
* **P1-ARCH-022 (Anonymous Caller Traps):** All protected state-changing endpoints MUST reject anonymous callers. Any intentionally anonymous bootstrap or authentication endpoint MUST be explicitly allowlisted, narrowly scoped, and prohibited from privileged business mutations.
* **P1-ARCH-023 (Role Resolution):** Visible UI roles must follow the exact canonical names (Master Admin, Admin, Staff) mapped backend to `#Admin`, `#Manager`, `#Staff`.

### 14.8 Reviewed Evidence
* `frontend/src/hooks/useActor.ts` (lines 21–32): Reconstructs Ed25519KeyIdentity from local `user_session`.
* `backend/main.mo` (lines 1065–1098): Shows `checkPermissions` function parsing caller against `users.get(callerText)` and calling `Runtime.trap` on unauthorized requests.
* `backend/main.mo` (line 1135): Explicitly rejects the anonymous principal `Principal.fromText("2vxsx-fae")`.
* `backend/main.mo` (line 1417): Enforces that the Master Admin status cannot be deactivated.

### 14.9 Risks
* **Unauthorized Access:** If an update endpoint fails to check `msg.caller`, unauthenticated principals can execute mutations.
* **Anonymous Access Bypass:** Endpoints must explicitly reject anonymous calls.

### 14.10 Open Questions
* How does the canister bootstrap the initial Master Admin Principal on fresh local setups?

### 14.11 Acceptance Criteria
* Anonymous calls are trapped.
* Role-based checks are enforced on mutations.

### 14.12 Verification Plan
* Run integration tests verifying role access bounds.

---

## Section 15 — Error Handling & Exception Architecture

### 15.1 Current Architecture
* **Canister Exceptions:** Backend errors are handled via assertions and traps using `Debug.trap()` or `throw` statements. These revert the canister call and undo state changes.
* **Client Exceptions:** Intercepted inside react-query hook mutation catches, returning a string message which triggers a red `<Toaster />` notification toast.

### 15.2 Target Architecture
* **Result Wrapper Pattern:** Return a structured `Result<T, E>` variant from update endpoints instead of trapping execution. This allows the frontend to capture error codes and display helpful messages.
* **Frontend Error Boundaries:** Wrap features in React Error Boundaries to prevent application-wide crashes on rendering errors.

### 15.3 Responsibilities
* **Canister:** Return structured error codes.
* **Client:** Catch repository failures and display toast notifications.

### 15.4 Public Interfaces
* Custom result types (`Result<Invoice, InvoiceError>`).

### 15.5 Dependency Rules
* Repositories map canister failures to typescript exceptions.
* UI layers display formatting based on exception types.

### 15.6 Forbidden Dependencies
* Error handlers MUST NOT expose passwords, private keys, session material, sensitive financial details, or internal stack traces through user-facing messages, public logs, or externally accessible telemetry.
* Trapped calls must not expose database internals to the client.

### 15.7 Architectural Rules
* **P1-ARCH-024 (Error Contract Modelling):** Expected domain failures SHOULD use typed Result variants. Programmer invariants, impossible states, and selected authorization boundary failures MAY use traps when documented. Each endpoint contract MUST document its error model. Authorization failures MUST terminate the protected operation without state changes. The endpoint contract may use a structured authorization error or deliberate trap, but it must not expose sensitive internals.

### 15.8 Reviewed Evidence
* `frontend/src/App.tsx` (lines 14–30): Verifies that error notifications are displayed via `<Toaster />`.
* `backend/main.mo` (lines 1071, 1105, 1126): Verifies activity logging exceptions call `Runtime.trap`.

### 15.9 Risks
* **Canister Trapping:** Generic traps return "Canister trapped" to the client, hiding the cause of the failure and making debugging difficult.
* **Application Availability:** Unhandled rendering errors may make a feature/page unusable until recovery or reload.

### 15.10 Open Questions
* Should we define a standardized error registry map shared between frontend and backend?

### 15.11 Acceptance Criteria
* Error toast alerts show structured message codes.
* React error boundaries prevent full-page crashes.

### 15.12 Verification Plan
* Simulate canister transaction failures and verify UI toast states.

---

## Section 16 — Caching and Query Strategy

### 16.1 Purpose
Define the client-side server-state query architecture, cache-key structures, caching policies, and data invalidation patterns.

### 16.2 Current Architecture
* **React Query Core:** Managed via a single React Query `QueryClient` initialized in `frontend/src/App.tsx` and distributed via `<QueryClientProvider>`.
* **Query Keys:** Defined as inline arrays directly inside `frontend/src/hooks/useQueries.ts` (e.g. `['dashboardStats']`, `['invoices']`, `['users']`, `['rawMaterials']`, `['purchases']`).
* **Cache invalidation:** Executed inside mutations using `queryClient.invalidateQueries({ queryKey: [...] })` (e.g., lines 104–108 of `useQueries.ts` invalidate `'invoices'`, `'dashboardStats'`, and `'nextInvoiceNumber'` on successful invoice creation).
* **Local Storage Backing:** The `useUsers` query (lines 248–260) intercepts fetched users and writes a backup of the serialized array to `localStorage` under `mock_users`.
* **Caching Parameters:** No explicit `staleTime` or `gcTime` settings are specified globally, defaulting to React Query's standard parameters (staleTime = 0, gcTime = 5 minutes).

### 16.3 Target Architecture
* **Query Key Factory:** Migrate inline array definitions to a centralized Query Key Factory (`queryKeys.ts`) to manage keys and parameters, avoiding hardcoded key arrays.
* **Cache Isolation:** Ensure that authentication-sensitive and permission-sensitive caches are cleared or re-keyed upon logout, Principal changes, role/permission changes, session expiry, or account disablements. Safe public/reference caches (e.g., product lists, static configurations) are kept intact to preserve UI rendering speed.
* **Data-Driven Policies:** Cache parameters (such as `staleTime` and `gcTime` for master vendor metadata) must be defined based on workload benchmarks and performance tests (targets until measured).

### 16.4 Responsibilities
* **Query Client Provider:** Bootstrapping and managing cache lifecycles.
* **Query Factory:** Exposing unified query key templates.
* **Cache Invalidation Managers:** Triggering selective invalidations on mutations.

### 16.5 Dependency Rules
* Page components query server state using React Query selectors.
* Query hooks depend on repository adapters to retrieve database responses.

### 16.6 Forbidden Dependencies
* Cache hooks must not read local storage variables to bypass backend canister query commands.
* Mutations must not directly modify cache objects (mutations must trigger cache invalidations).

### 16.7 Architectural Rules
* **P1-ARCH-025 (Query Key Factory):** Query keys must be defined and managed through a centralized Query Key Factory.
* **P1-ARCH-026 (Cache Security & Lifecycle):** Authentication-sensitive and permission-sensitive query caches MUST be cleared or re-keyed upon logout, Principal changes, role/permission modifications, session expiry, or account disablement. Safe public/reference caches are excluded from this rule to maintain rendering efficiency.

### 16.8 Reviewed Evidence
* `frontend/src/hooks/useQueries.ts` (lines 25–109): Query hooks and invalidation triggers.
* `frontend/src/App.tsx`: QueryClient provider initialization.

### 16.9 Risks
* **Stale Visual State:** Inconsistent query key templates can prevent mutations from updating dependent visual layouts, causing stale data displays.
* **Session Leakage:** Stale cache states may remain visible if cache instances are not cleared upon user logout.

### 16.10 Open Questions
* What is the approved staleTime duration for slow-changing collections (such as raw material category configurations)?

### 16.11 Acceptance Criteria
* All query hooks import keys from the Query Key Factory.
* Session logout triggers clean `queryClient.clear()` actions.

### 16.12 Verification Plan
* Validate build integrity after routing edits:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 17 — Notification Architecture

### 17.1 Purpose
Define the architecture for system warnings, threshold alert triggers, and communication integrations.

### 17.2 Current Architecture
* **UI Toast System:** Visual feedback is rendered client-side using standard React state triggers and `<Toaster />` modal indicators.
* **Stock Alert Badges:** The application renders stock indicators based on calculations (e.g., `StockAlerts.tsx` warning tags).
* **Communication Links:** WhatsApp integration (`whatsapp.ts` and `whatsappInvoice.ts`) compiles URI links with phone numbers and invoice details, allowing users to send notifications through WhatsApp Web. No backend SMS or SMTP email service adapters are implemented.

### 17.3 Target Architecture
* **Canister Alert Monitoring:** Move stock threshold validations and payment deadline alerts from client components to the backend canister.
* **Decoupled Notification Adapters:** Encapsulate template builders and future SMS/email integration calls in stateless notification adapter utilities, keeping components presentation-only.

### 17.4 Responsibilities
* **Alert Trigger Managers:** Track inventory levels and ledger deadlines.
* **Stateless Message Adapters:** Build URI links and format messages.

### 17.5 Dependency Rules
* Page components call stateless notification adapters to trigger communication links.
* Notification templates must verify caller authorization before displaying details.

### 17.6 Forbidden Dependencies
* Notification services must not export or display sensitive data (such as passwords, transaction details, or security tokens).
* External communication adapters must not depend on local browser storage for system data.

### 17.7 Architectural Rules
* **P1-ARCH-027 (Stateless Adapters):** External communication interfaces (such as WhatsApp URI generators) must be implemented as stateless utility adapters.
* **P1-ARCH-028 (Notification Data Protection):** Notification payloads and templates MUST NOT expose passwords, private keys, session material, internal stack traces, sensitive financial details, or unauthorized personal data.

### 17.8 Notification Lifecycle & Channel Distinction
System notifications follow this structured lifecycle:
```
Domain Event -> Rule Evaluation -> Recipient/Permission Resolution -> Deduplication -> Channel Adapter -> Delivery Attempt -> Delivered/Failed/Retrying
```
The channel options are defined as:
* **In-App Notifications:** Application-visible alerts generated from current frontend queries, mutations, and validated domain conditions. Real-time server-pushed delivery remains a future capability unless a live event transport is implemented.
* **Existing WhatsApp Deep-Links:** Client-compiled URI strings targeting WhatsApp Web deep-links (`whatsapp.ts`), requiring user interaction to send.
* **Proposed Automated WhatsApp Providers:** Approved WhatsApp Business API-compatible provider adapters — proposed only.
* **Proposed Email Providers:** Transactional email gateway integrations (such as SendGrid or SMTP adapters) — proposed only.

### 17.9 Reviewed Evidence
* `frontend/src/utils/whatsapp.ts` & `frontend/src/utils/whatsappInvoice.ts`: URI compilation code for WhatsApp integration.
* `frontend/src/App.tsx` (lines 14–30): UI toaster container mounting.

### 17.10 Risks
* **Data Leaks:** Serializing sensitive information inside external URI links creates security risks.
* **Tampering:** Malicious clients can alter URL parameters to send unauthorized notifications.

### 17.11 Open Questions
* Should we integrate a backend-driven email alert queue using specialized IC outgoing HTTP calls?

### 17.12 Acceptance Criteria
* WhatsApp messages use sanitized formatting.
* Alert configurations are validated before processing updates.

### 17.13 Verification Plan
* Validate template formats and paths:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 18 — Reporting Architecture

### 18.1 Purpose
Document the reporting pipeline, detailing analytics dashboards, data exports, printable PDFs, and ledger consistency.

### 18.2 Current Architecture
* **Print Rendering:** PDF rendering uses client-side print layout styles defined in `frontend/src/utils/pdfGenerator.ts`, applying print stylesheets to DOM trees.
* **CSV Export:** Executed by serializing UI table datasets into client-side file strings.
* **Analytics Compilations:** Dashboard widgets compute customer dues and totals dynamically from lists.

### 18.3 Target Architecture
* **Authoritative Server Reporting:** Target financial reporting architecture requires authoritative totals to be calculated or independently validated by backend canister queries. Until that migration is complete, frontend-derived report totals are transitional and MUST NOT be represented as fully backend-authoritative.
* **Proposed Reporting Interfaces:** Define structured templates for PDF tables to replace inline print stylings.
* **Snapshot Consistency:** Every report operation MUST use a single consistent snapshot or reporting cutoff. Identical filters and periods must be enforced when switching between on-screen views, drill-down navigations, CSV exports, and print outputs.

### 18.4 Responsibilities
* **Canister Analytics Engine:** Compile ledger totals and balance sheets.
* **Client PDF Renderer:** Format and display print templates.
* **CSV Serializer:** Export table datasets.

### 18.5 Dependency Rules
* View layers depend on query selectors to retrieve report models.
* Reporting engines must use authoritative database fields, not client state overrides.

### 18.6 Forbidden Dependencies
* Financial reporting views must not compute final ledger balances (balances must be calculated on the backend).
* CSV export functions must not bypass checkPermissions checks.

### 18.7 Architectural Rules
* **P1-ARCH-029 (Report Consistency):** Financial reports must use authoritative data. Reports must not be labeled as backend-authoritative unless validated by the canister state.
* **P1-ARCH-030 (Export Safety & Formula Protection):** Export modules MUST preserve source-data fidelity while applying format-safe escaping, authorization filtering, field allowlisting, and spreadsheet-formula injection protection (e.g., escaping `=`). Sanitization MUST NOT silently alter authoritative financial values.

### 18.8 Reviewed Evidence
* `frontend/src/utils/pdfGenerator.ts`: Direct DOM print layouts configuration.
* `frontend/src/utils/calculations.ts` (lines 41–53): Client-side balance parsing.

### 18.9 Risks
* **Inconsistent Reports:** Client-side calculations on incomplete datasets can lead to balance sheet discrepancies.
* **Formatting Errors:** Print styles may render incorrectly across different browsers or screen sizes.

### 18.10 Open Questions
* Should we store historical report snapshots inside stable canister memory?

### 18.11 Acceptance Criteria
* PDF invoice totals match backend records.
* Export files generate without compile errors.

### 18.12 Verification Plan
* Verify compilation of export packages:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 19 — Performance Architecture

### 19.1 Purpose
Define optimization strategies, lazy loading, pagination, and canister memory limits.

### 19.2 Current Architecture
* **Code Splitting:** Page components are lazy-loaded via React `lazy` and rendered with a `withSuspense` spinner inside `frontend/src/App.tsx`.
* **Traversals:** Memoization (`useMemo`) is used to filter search terms inline inside rendering components.
* **Memory Limits:** Canister queries fetch complete maps (such as all invoices) in single calls without pagination, posing a threat to consensus cycle limits as datasets grow.

### 19.3 Target Architecture
* **Paginated Backend Queries:** Canister query endpoints must support limit and offset options to manage memory footprint and cycles (targets until measured).
* **Table Virtualization:** Render large datasets using virtualized tables to limit DOM node generation (targets until measured).
* **Measurement & Benchmarking:** All performance claims are targets only until formally measured. No percentage performance improvements are assumed without benchmark evidence.

### 19.4 Responsibilities
* **Vite Builder:** Managing code splitting and bundle budgets (targets until measured).
* **Query Manager:** Managing paginated data requests.

### 19.5 Dependency Rules
* Page routes import lazy components.
* Large list views must use paginated or virtualized table wrappers.

### 19.6 Forbidden Dependencies
* Rendering components must not block the browser main thread with unbounded synchronous calculations.
* Large-scale data loading must not bypass pagination parameters.

### 19.7 Architectural Rules
* **P1-ARCH-031 (Canister Threshold Limits):** Query pagination or bounded window mechanisms are mandatory only when documented payload size, row-count, cycle-cost, or latency thresholds are exceeded (thresholds must be established through measurements).
* **P1-ARCH-032 (Browser Main Thread Protection):** Components MUST NOT block the browser main thread with unbounded synchronous calculations or excessive unvirtualized renders. Heavy operations must be optimized or virtualized.

### 19.8 Reviewed Evidence
* `frontend/src/App.tsx`: Implementation of page-level `lazy` imports.
* `frontend/src/hooks/useQueries.ts` (lines 39–51): Query fetching all invoices without limit parameters.

### 19.9 Risks
* **Cycle Exhaustion:** Fetching large unbounded tables in a single transaction can exceed canister execution limits, causing queries to fail.
* **Memory Exhaustion:** Storing unbounded lists can exceed the heap limits of a single canister.

### 19.10 Open Questions
* What is the approved maximum bundle budget limit for lazy-loaded page bundles?

### 19.11 Acceptance Criteria
* Lazy loading is active on all page routes.
* Paginated queries return data in configured bounds.

### 19.12 Verification Plan
* Analyze build outputs and verify compilation:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 20 — Deployment and Environment Architecture

### 20.1 Purpose
Define local replica environments, staging deployments, environment variables, environment files, Candid verification, and backup upgrades.

### 20.2 Environment Responsibility Matrix
The application is deployed across four distinct environment configurations:
* **Local:** Developer sandbox. Runs local replica canisters via `dfx start --clean` or mock backend fallbacks. Hot-module reloading enabled.
* **Test:** Automated compilation validator. Executes TypeScript type-checks (`tsc --noEmit`), lints, and compiles build files.
* **Staging:** Release validation environment. Deploys to a staging replica canister. Used to verify upgrade migrations and Candid compatibility.
* **Production:** Authoritative system. Deploys code to the live ICP mainnet canisters. Requires release checklists.

### 20.3 Deployment & Build Configuration Files
The build and deployment toolchain is managed by these specific files:
* `frontend/canister.yaml`: Asset deployment configuration. Runs pre-build steps: resolves dependencies and writes `env.json` with host and canister properties, building React assets using the vite config.
* `build.sh`: Special compiler build script. Compiles backend Motoko code using the `moc` compiler, Core library packages, and temporary build paths.
* `frontend/package.json` & Root scripts: Manage pnpm run scripts for compilation.
* `frontend/vite.config.js`: Vite server configurations and output targets.
* Environment configuration files:
  - `.env` and `.env.*` files are excluded through repository ignore rules where used.
  - `frontend/env.json` is excluded through repository ignore rules and may be generated by the configured build process.
  - Their exact generation and deployment lifecycle MUST be validated per environment.

### 20.4 Target Upgrade & Rollback Strategy
* **Canister Upgrades:** Production upgrades MUST maintain Candid interface compatibility and pass staging upgrade verification before deployment. The behavior of failed upgrade attempts, prior-state preservation, and migration rollback MUST be validated using the actual Motoko compiler, migration configuration, DFX version, and ICP deployment toolchain. The architecture MUST NOT assume automatic state preservation without verified staging evidence.
* **Rollback Pipeline:** Establish clear protocols distinguishing:
  - *Failed Upgrade Attempt:* The expected platform behavior is that an upgrade attempt failing before the new version becomes active does not commit the new application version. However, prior-state preservation and migration rollback behavior MUST be verified through staging upgrade tests using the actual Motoko compiler, migration configuration, DFX version, and ICP deployment toolchain. No production recovery decision may rely solely on an undocumented assumption of automatic state preservation.
  - *Code Rollback:* Reverting the client-side JavaScript assets bundle.
  - *Schema Compatibility Recovery:* Deploy a previously compatible canister version together with its validated migration path, only after confirming persisted-state compatibility.
  - *Frontend Binding Rollback:* Rebuild or redeploy frontend bindings compatible with the selected canister interface. Frontend bindings do not roll back backend schema or state.
  - *Controlled Data Restoration:* Re-importing state via database backups if manual recovery is required (not run automatically on every failed deploy).

### 20.5 Responsibilities
* **Release Manager:** Coordinate canister upgrades.
* **Bindings Generator:** Compile Candid did files to TypeScript.

### 20.6 Dependency Rules
* Canister upgrades require successful local replica validation.
* Environment configurations must be loaded from gitignored environment files.

### 20.7 Forbidden Dependencies
* Deploy scripts must not hardcode private key keys or environment variables.
* Production builds must not import mock backend mocks.

### 20.8 Architectural Rules
* **P1-ARCH-033 (Candid & Client Evolution):** Canister upgrades MUST perform Candid compatibility comparisons, regenerate frontend bindings, execute staging compatibility tests, and verify older-client communication compatibility where backward compatibility is required.
* **P1-ARCH-034 (Rollback Strategy):** The release plan MUST distinguish failed upgrade attempts, code rollback, schema/interface compatibility recovery, frontend binding rollback, and controlled data restoration. Prior-state preservation behavior MUST be verified through staging upgrade tests using the actual deployment toolchain. Data restoration MUST NOT run automatically for every failed deployment.

### 20.9 Reviewed Evidence
* `frontend/canister.yaml`: Confirms build commands write `env.json` and sync assets from `dist`.
* `build.sh`: Confirms invocation of `moc` binary compiling `main.mo` with implicit package configs and core libraries.
* `.gitignore` (lines 9–10, 68): Confirms `.env` files and `frontend/env.json` are gitignored.

### 20.10 Risks
* **State Loss on Upgrade:** Incompatible migrations can cause upgrades to fail, risking state corruption or loss.
* **Secrets Leakage:** Hardcoded keys in config files can lead to repository leaks.

### 20.11 Open Questions
* How can we automate Candid signature verification in deployment pipelines?

### 20.12 Acceptance Criteria
* Upgrade deployments preserve existing states.
* Environment files are excluded from Git tracking.

### 20.13 Verification Plan
The deployment and build pipeline will be verified using these seven distinct validation runs:
1. **TypeScript check:** Validate that no compilation errors exist by running `.\node_modules\.bin\tsc.cmd --noEmit`.
2. **Frontend production build:** Confirm that the React compilation executes successfully without errors via Vite.
3. **Motoko/canister build:** Verify backend compilation by compiling Motoko scripts via `moc` compiler commands inside `build.sh`.
4. **Generated bindings:** Confirm typescript bindings match Candid files.
5. **Candid comparison:** Run signature comparisons between old and new candid files.
6. **Documentation review:** Verify that Phase 0 rules and locked spec sections remain intact.
7. **Future staging upgrade rehearsal:** Execute a test staging deploy on a testnet replica to verify migration macro execution.

---

## Section 21 — Enterprise Testing Strategy

### 21.1 Purpose
Define the testing methodology, test pyramid layers, code coverage objectives, and validation gates required to ensure system correctness and interface stability.

### 21.2 Current Testing State
* **No Automated Test Suites:** The repository contains no unit tests, integration tests, or end-to-end tests. No testing runner frameworks (e.g., Vitest, Jest, Playwright) are defined in `frontend/package.json` devDependencies.
* **Manual Compiler Validation:** Correctness is validated manually by running type-checking compilers (`tsc --noEmit --pretty`) and checking build commands (`dfx build backend`, `vite build`).
* **Visual Inspection:** UI components and state mutations are validated via local browser runs against mock backend states.

### 21.3 Target Testing Architecture
The following testing frameworks represent the target architecture and are not yet implemented in the codebase:
* **Target Vitest Framework Integration:** Adopt Vitest for executing frontend unit and integration tests.
* **Target Motoko Test Runners:** Integrate Motoko-native unit testing libraries (e.g., Mops or Vessel test tools) to validate backend function calculations.
* **Target Playwright Integration:** Introduce Playwright to execute automated end-to-end transaction workflow validations.

### 21.4 Testing Pyramid (Target Architecture)
```
            / \
           /   \      Target E2E (Playwright) - Transaction Flows
          / E2E \     Target Integration (Vitest) - Repository Mocks & Client Bindings
         /-------\    Target Unit (Vitest/Mops) - Calculations & Logic Helper Methods
        /  INTEG  \
       /-----------\
      /    UNIT     \
     /_______________\
```
* **Target Unit Testing:** Focuses on business rules, calculation engines (e.g., `calculations.ts`), formatters, and utility functions.
* **Target Integration Testing:** Focuses on React hooks (e.g., query client keys and mutations in `useQueries.ts`) and canister client bindings generated from Candid files.
* **Target End-to-End Testing:** Validates critical workflow sequences (e.g., invoicing flow, payment collections, Karigar wage ledgers).
* **Target Security Testing:** Validates anonymous principal rejection and role-based route guard blocks.
* **Target Performance Testing:** Tracks query execution latency, payload sizes, and Motoko canister cycle consumption.
* **Target Regression Testing:** Compares Candid signatures and upgrade schema migrations to prevent structural breakages.
* **Target User Acceptance Testing (UAT):** Conducts visual reviews of print outputs and CSV files.

### 21.5 Test Data & Mock Data Strategy
* **Structured Seeds:** Test scenarios must use fixed JSON data seeds.
* **Mock Isolation:** Mocks used for local runs must be located in dedicated test subdirectories (e.g., `src/mocks/`) and excluded from production builds.

### 21.6 Coverage Targets & Quality Gates
* **Critical Business Logic:** 80% coverage target for core financial calculations.
* **Gate Requirements:** Pull requests must pass TypeScript compilation with zero errors and compile all test suites successfully before merge approvals.

### 21.7 Responsibilities
* **Assigned Technical Owner:** Oversee target testing setup and validations.
* **Assigned Release Owner:** Ensure verification pipelines run in automated CI systems before builds.

### 21.8 Dependency Rules
* Testing components may depend on mock models and test fixtures.
* Production code modules must never import test fixtures.

### 21.9 Forbidden Dependencies
* Unit tests must not call live production canisters.
* Test suites must not store API tokens or private credentials.

### 21.10 Architectural Rules
* **P1-ARCH-035 (Automated Test Execution):** The CI/CD validation pipeline MUST execute the type checking compiler command and all unit/integration tests before merging pull requests.
* **P1-ARCH-036 (Mock Data Isolation):** Mock data strategies used in local or test configurations must never be packaged into production builds.

### 21.11 Reviewed Evidence
* `frontend/package.json` (lines 6–16): Verifies that scripts lack a `"test"` runner command, relying only on `"typescript-check"` and `"lint"`.

### 21.12 Risks
* **Undetected Calculation Regressions:** Without unit tests, changes to billing structures can introduce silent financial bugs.
* **Interface Mismatch:** Lack of integration tests increases the risk of client bindings falling out of sync with canister schemas.

### 21.13 Open Questions
* Which Motoko unit testing library should be selected as the standard for backend assertions?

### 21.14 Acceptance Criteria
* Running typescript-check exits with code 0.
* Mock datasets are excluded from final production build outputs.

### 21.15 Verification Plan
* Run compile check:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 22 — Migration & Upgrade Roadmap

### 22.1 Purpose
Outline the phase stages, schema evolution processes, and migration strategies required to transition master datasets to the canister.

### 22.2 Current Migration State
* **Delimited Data Serialization:** The application uses delimited formatting to store customer metadata in `taxId` fields.
* **Local Storage Storage:** Vendor master records, location mappings, and configuration variables are stored in browser local storage.
* **Macro Upgrades:** Backend upgrades rely on custom compilation macros (`(with migration = Migration.run) actor` in `backend/migration.mo`). No stable variables are declared in `backend/main.mo`.
* **Manual Data Syncs:** Database backups are run manually using `exportDatabase` and `importDatabase` queries.

### 22.3 Migration Philosophy & Principles
* **State Integrity First:** Upgrades must not corrupt existing records.
* **Zero Data Loss:** Any upgrade sequence must preserve state across canister re-installations.
* **Incremental Evolution:** Schema transformations must execute in sequential, backward-compatible steps.

### 22.4 Migration Stages
```
Local Storage      ──> Canister Maps    ──> Stable Variables / StableMaps ──> Multi-Canister Partitioning
(Master Profiles)      (Canister State)     (Upgrade-Stable Storage)          (Heap Exhaustion Mitigation)
```
1. **LocalStorage to Canister:** Move vendor profiles and inventory configurations into new canister maps.
2. **Canister to Stable Memory:** Replace custom migration macro wrappers with native Motoko `stable` variables or `StableMap` libraries.
3. **Future Multi-Canister:** Transition from a single canister to a partitioned canister architecture (e.g., separating audit logs and ledger transactions) before single canister memory limits are reached.

### 22.5 Migration Topics
* **Vendor Metadata Migration:** Batch read vendor details from browser storage and write to canister maps.
* **Raw Material Metadata Migration:** Move bin and rack allocations into the backend inventory table.
* **Legacy `taxId` Strategy:** Support compatibility parsing of legacy pipe-delimited fields while writing new fields to structured Candid types.
* **Customer Metadata Strategy:** Map customer parameters to typed Candid records.

### 22.6 Backward Compatibility & Versioning
* **Dual Read:** Read values from new structures first, falling back to legacy fields if not found.
* **Dual Write:** Write updates to both new canister maps and legacy storage paths during the transition period.
* **Schema Versioning:** Prefix records with structural version tags (e.g. `#V1`, `#V2`) to manage model evolution.

### 22.7 Pre-Migration and Post-Migration Validation
* **Pre-Migration Validation:**
  - *Schema Validation:* Compare current local storage properties and delimiter models with the target Candid structures.
  - *Dry-Run Upgrade:* Execute migration scripts on a staging replica utilizing identical snapshots of production states to confirm parser performance.
  - *Audit Checks:* Reconcile initial collection counts and checksums before starting the migration path.
* **Post-Migration Validation:**
  - *Count Reconciliation:* Verify that the target canister map size matches the original source dataset exactly.
  - *Data Integrity Checks:* Retrieve and inspect randomly selected records to confirm delimiter parser correctness.
  - *System Verification:* Verify that the front-end application can query and mutate migrated records successfully.
  - *Fallback Execution Check:* Ensure that fallback read patterns handle legacy formats without errors.

### 22.8 Upgrade Sequence & Rollback Validation
* **Sequence:** 1. Backup state (`exportDatabase`); 2. Run staging upgrade dry-runs; 3. Perform Candid signature check; 4. Deploy canister code.
* **Rollback:** Restoring prior version states via the rollback pipeline if upgrade validations fail.

### 22.9 Responsibilities
* **Assigned Technical Owner:** Draft stable schemas and migration configurations.
* **Assigned Data Owner:** Execute backup exports and audit post-migration tables.

### 22.10 Dependency Rules
* Migration adapters must be isolated from standard business components.
* Client updates must use versioned API client bindings.

### 22.11 Forbidden Dependencies
* Migration scripts must not perform network updates without checking permissions.
* Production schemas must not retain temporary migration variables after migration phases complete.

### 22.12 Architectural Rules
* **P1-ARCH-037 (Staging Migration Rehearsal):** Upgrades targeting production stables MUST first be simulated on a staging replica utilizing identical snapshots of production states to verify migration macros.
* **P1-ARCH-038 (Dual-Write Verification):** Any transitional dual-write schema phase must be accompanied by validation checks to ensure both records remain in absolute sync.

### 22.13 Reviewed Evidence
* `backend/main.mo` (lines 4710–4981): Verifies manual backup support through `exportDatabase` and `importDatabase` query functions.
* `backend/migration.mo`: Verifies macro upgrade execution paths.

### 22.14 Risks
* **Data Corruption:** Structural mismatches in migration scripts can corrupt database state.
* **Consensus Cycles Trapping:** Migrating large collections in single transactions can hit execution limits.

### 22.15 Open Questions
* What is the threshold collection size where migrations must be chunked across multiple transactions?

### 22.16 Acceptance Criteria
* Staging migration simulation completes without warnings.
* All master schemas define version labels.

### 22.17 Verification Plan
* Validate typescript compilation:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 23 — Enterprise Risk Register

### 23.1 Purpose
Identify, classify, and mitigate technical, data, operational, and compliance risks within the enterprise architecture.

### 23.2 Enterprise Risk Matrix

| Risk ID | Category | Risk Description | Probability | Impact | Owner | Mitigation Plan | Review Frequency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-TECH-01** | Technical | Heap memory exhaustion due to unbounded logging and list traversals. | Medium | High | Assigned Technical Owner | Replace `List` collections with bounded Maps and implement query pagination limits. | Monthly |
| **R-SEC-01** | Security | Write operation access leaks due to missing anonymous caller checks. | Low | Critical | Assigned Security Owner | Enforce `P1-ARCH-022` checks in authorization modules, rejecting anonymous principals on all writes. | Bi-Weekly |
| **R-DATA-01** | Data | Data loss of vendor records stored only in browser local storage. | High | High | Assigned Data Owner | Migrate vendor profiles to canister schemas and enforce daily database exports. | Weekly |
| **R-UPG-01** | Upgrade | Canister upgrade failure causing state loss due to compiler macro changes. | Medium | Critical | Assigned Release Owner | Verify all upgrade paths on staging replicas before production deployment (`P1-ARCH-037`). | Per Release |
| **R-PERF-01** | Performance | Main-thread blocking on client side due to synchronous PDF rendering. | Medium | Medium | Assigned Technical Owner | Optimize PDF exports and offload intensive rendering steps using Web Workers where applicable. | Monthly |
| **R-COMP-01** | Compliance | Financial calculations mismatch between frontend reports and backend records. | Low | High | Assigned Business Owner | Enforce canister-side balance calculations and apply formula injection escaping on exports. | Monthly |

### 23.3 Monitoring & Review Strategy
* **Regular Reviews:** Review risk registers regularly during planning sprints.
* **Alert Triggers:** Trigger mitigation audits if heap usage exceeds 80% limits or auth traps execute.

### 23.4 Responsibilities
* **Assigned Security Owner:** Enforce compliance gates and role control patterns.
* **Assigned Technical Owner:** Implement heap and query thresholds.

### 23.5 Dependency Rules
* Risk mitigations must conform to the Phase 0 Constitution.
* Code changes designed to mitigate risks must pass standard compiler validations.

### 23.6 Forbidden Dependencies
* Mitigation patterns must not compromise access controls.
* Security logging must not output credentials or keys.

### 23.7 Architectural Rules
* **P1-ARCH-039 (Risk Matrix Monitoring):** Any architecture risk categorized as High Impact or High Likelihood must have an active mitigation strategy and be reviewed on a regular basis.

### 23.8 Reviewed Evidence
* `backend/main.mo` (lines 1065–1098): Shows existing `checkPermissions` and anonymous caller checks designed to mitigate `R-SEC-01`.
* `frontend/src/utils/masterData.ts` (lines 18–30): Documents reliance on local storage which creates `R-DATA-01`.

### 23.9 Risks
* **Mitigation Failures:** Failures to update and monitor risk registers can lead to heap crashes or security incidents.

### 23.10 Open Questions
* What is the threshold heap memory consumption that triggers alerts?

### 23.11 Acceptance Criteria
* Active mitigation plans address all High Likelihood risks.
* Verification checks confirm anonymous write requests are trapped.

### 23.12 Verification Plan
* Run typescript validation:
  ```powershell
  .\node_modules\.bin\tsc.cmd --noEmit
  ```

---

## Section 24 — Architecture Governance

### 24.1 Purpose
Define the governance model, change control procedures, versioning policies, and repository guidelines required to maintain specification and code alignment.

### 24.2 Architecture Governance Model
* **Architecture Review Board (ARB):** The ARB must approve any modification to approved design documents.
* **Architecture Decision Records (ADRs):** Decisions affecting data structures, api models, or permissions must be documented in an ADR.

### 24.3 Change Control & Versioning Policy
* **Document Lock:** Sections marked as approved and frozen cannot be edited without ARB review.
* **Semantic Versioning (SemVer):** Spec versions must follow semantic versioning conventions.
* **Candid Binding Versioning:** Regenerated bindings must match the canister signature version.

### 24.4 Repository Governance & Approval Workflows
* **Branch Strategy:** Developers must use feature branches. Merging to the main branch requires review approvals.
* **Pull Request Reviews:** PRs must pass lint validations and compile checks with exit code 0 before review completions.

### 24.5 Exception & Amendment Processes
* **Architecture Exception Process:**
  Exceptions to architecture standards represent temporary deviations and must follow a structured request, validation, documentation, and retirement process:
  1. *Request:* The development team must submit a formal Exception Request detailing the business rationale, target code module, impacted rules, and requested exception period.
  2. *Validation:* The ARB reviews the request to evaluate technical debt impact, security compliance, and upgrade safety.
  3. *Documentation:* Approved exceptions must be documented in a central register (`architecture_exceptions.md`) noting the exception ID, approval date, expiration date, and mitigation controls.
  4. *Review:* Active exceptions are reviewed during monthly sprint audits.
  5. *Retirement:* Upon expiration or standard compliance resolution, the exception is retired, and code blocks are refactored to align with specification standards.
* **Rule Amendment:** Rule edits require updating the specification version.

### 24.6 Responsibilities
* **Assigned Technical Owner:** Manage specification locks and lead governance audits.
* **Assigned Release Owner:** Ensure Candid bindings match deployed versions.

### 24.7 Dependency Rules
* Deployed canisters must align with approved Candid schemas.
* Code PR reviews must verify compliance with architectural guidelines.

### 24.8 Forbidden Dependencies
* Code merges must not bypass validation gates.
* Unreviewed schema edits must not be deployed.

### 24.9 Architectural Rules
* **P1-ARCH-040 (ADR Requirement):** Any structural changes to the canister interface or data persistence structures must be documented in an Architecture Decision Record (ADR) prior to implementation.
* **P1-ARCH-041 (Version Control Semantics):** Canister updates and client releases must follow semantic versioning rules to prevent breaking interface syncs.

### 24.10 Reviewed Evidence
* `.gitignore` (lines 9–10, 68): Confirms repository governance rules exclude environment configurations.
* `frontend/package.json` (lines 13–15): Verifies formatting and lint validations are configured.

### 24.11 Risks
* **Specification Drift:** Bypassing governance processes allows codebases to drift from design documents, creating design mismatch issues.
* **Version Sync Failure:** Mismatched versions can break communication interfaces.

### 24.12 Open Questions
* Where should ADR documents be located in the repository?

### 24.13 Acceptance Criteria
* Pull requests require compiler type check approvals before merge.
* ADR files use approved format templates.

### 24.14 Verification Plan
* Run lint check:
  ```powershell
  pnpm lint
  ```

---

## Section 25 — Final Enterprise Architecture Summary

### 25.1 Purpose
Provide the final architecture summary, documenting locked decisions, readiness assessments, and recommendations for subsequent phases.

### 25.2 Executive Summary
The technical specification establishes a secure, modular blueprint for the enterprise ERP system. The frontend uses a React Query caching client, and the backend leverages Motoko canisters on the Internet Computer network.

### 25.3 Approved Architectural Rule Sets
* **Phase 0 Rules:** Code separation, type safety, state isolation, and zero-runtime modifications.
* **Phase 1 Rules (P1-ARCH-001 through P1-ARCH-042):** Centralized routing, validation interfaces, stable variables, query key factories, and rollback strategies.

### 25.4 Architecture Maturity Assessment
The enterprise system architecture must satisfy the maturity checklist requirements:
* **Phase 0 Maturity:** All core design constraints, file structures, and technology selections remain strictly locked and verified.
* **Phase 1 Maturity:** Complete specification covering Sections 1–25 with validated rules and evidence references.
* **Phase 2 Maturity:** Preparation roadmap for runtime coding, establishing coding guides and schema models.
* **Architecture Readiness:** Complete unique rule definitions, documented evidence checks, and ARB-approved spec version locks.
* **Runtime Readiness:** Architecture Ready, Implementation Pending. Target Phase: Phase 2.
* **Testing Readiness:** Target testing architecture has been defined. Implementation of automated testing infrastructure (Vitest, Playwright, backend testing framework, CI execution and coverage reporting) is scheduled for Phase 2.
* **Deployment Readiness:** Staging replica validation setup, environment file exclusions, and documented rollback strategies.

### 25.5 Phase 2 Entry Criteria
Transition to Phase 2 runtime coding is prohibited until these criteria are met:
1. **Approved Specification:** Sections 1 to 25 are approved and frozen.
2. **Type Safety:** Compilation checks return exit code 0.
3. **Validation Setup:** Test scripts and deployment tools are configured in the repository.

### 25.6 Architecture Completion Checklist & Approvals

| Section | Title | Status | Approval Date |
| :--- | :--- | :--- | :--- |
| **1–5** | Document Control & Fundamentals | APPROVED | 2026-07-09 |
| **6–10** | Frontend & Module Design | APPROVED | 2026-07-11 |
| **11–15** | Backend & Security | APPROVED | 2026-07-11 |
| **16–20** | Caching, Reporting & Deploy | APPROVED | 2026-07-11 |
| **21–25** | Testing, Migration & Governance | APPROVED | 2026-07-11 |

### 25.7 Responsibilities
* **Assigned Technical Owner:** Manage overall system design integrity.
* **Assigned Business Owner:** Sign off on phase milestones and specification approvals.

### 25.8 Dependency Rules
* Subsequent development work must align with this specification.
* Deployment configurations must match validated staging setups.

### 25.9 Forbidden Dependencies
* Runtime code changes must not violate spec guidelines.
* Deployment processes must not use unverified staging configurations.

### 25.10 Architectural Rules
* **P1-ARCH-042 (Phase 2 Entry Gates):** No runtime implementation that changes business behavior, persistent data structures, security architecture, or public interfaces may begin until Phase 1 is formally approved and frozen.

### 25.11 Reviewed Evidence
* Full codebase directory structures: Confirm modules are separated into frontend and backend layouts.
* `frontend/src/backend.ts`: generated bindings verifying communication setups.

### 25.12 Risks
* **Premature Coding:** Starting Phase 2 coding before specifying all requirements increases the risk of design mismatch.

### 25.13 Open Questions
* Confirm the schedule for the Phase 2 kickoff meeting.

### 25.14 Acceptance Criteria
* The specification document compiles cleanly.
* All architectural rule IDs are unique.

### 25.15 Verification Plan
The specification and build verification pipeline must cover:
1. **TypeScript Type Safety Check:** Execute typescript checks (`.\node_modules\.bin\tsc.cmd --noEmit`) to verify zero compiler errors exist.
2. **Documentation Consistency Review:** Validate that all sections are formatted correctly and verify structural integrity.
3. **Cross-Reference Validation:** Scan for broken section/rule references and verify link correctness.
4. **Rule Numbering Validation:** Confirm rule sequence matches P1-ARCH-001 through P1-ARCH-042.
5. **Duplicate Rule Scan:** Confirm no duplicate rule identifiers exist.
6. **Broken Section Reference Scan:** Ensure all referenced paths and links point to existing files.

### 25.16 Final Approval Block
* **Project:** Gujarat Art & Craft ERP
* **Document:** Enterprise System Architecture & Technical Design Specification
* **Version:** 1.0
* **Status:** APPROVED
* **Phase:** 1
* **Sections:** 1–25
* **Architecture Status:** Frozen
* **Runtime Status:** Implementation Pending (Phase 2)
* **Approval:** Approved
* **Date:** 2026-07-11
