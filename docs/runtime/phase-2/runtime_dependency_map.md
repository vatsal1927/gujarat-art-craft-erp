# Gujarat Art & Craft ERP
## Phase 2.0 — Runtime Dependency Map

This document maps the architectural layers and import boundaries of the Gujarat Art & Craft ERP application, defining permitted and forbidden dependency directions.

---

## 1. System Architectural Layering Map

```mermaid
graph TD
    subgraph UI Presentation Layer (View)
        Pages[Page Entry Components /pages/*]
        SubComponents[Feature Sub-Components /components/*]
        UIPrimitives[UI Primitives /components/ui/*]
    end

    subgraph Service & Caching Layer
        RQ[React Query State useQueries.ts]
        Services[Stateless Utility Services calculations.ts / masterData.ts]
    end

    subgraph Client State & Auth Layer
        AuthContext[AuthGuard Context Provider]
        AuthService[Auth Services authService.ts]
        Identity[Ed25519 Identity / Internet Identity]
    end

    subgraph Canister Client Adapter Layer
        useActor[Canister Client Hook useActor.ts]
        Bindings[Generated Candid Bindings backend.ts]
        MockBE[Mock Backend mockBackend.ts]
    end

    subgraph AUTHORITATIVE ICP BACKEND
        Canister[Motoko Canister main.mo]
        StableState[(Canister Stable State)]
    end

    %% Permitted Data Flow Directions
    Pages -->|Query State| RQ
    Pages -->|Preview Formatting| Services
    SubComponents -->|Read Session| AuthContext
    RQ -->|Fetch Agent| useActor
    useActor -->|Derive Key| AuthService
    AuthService -->|Read Session Storage| Identity
    useActor -->|Query Endpoints| Bindings
    useActor -.->|Dev Fallback| MockBE
    Bindings -->|Network Requests| Canister
    Canister -->|Read/Write| StableState
```

---

## 2. Feature Module Boundaries

Feature files are currently located in `frontend/src/pages/` and `frontend/src/components/`. During the transition from the baseline architecture to the target architecture, features will be grouped into encapsulated directory modules:

1. **Sales & Billing:** (`CreateInvoice.tsx`, `ViewInvoice.tsx`, `InvoiceHistory.tsx`, `SalesOrders.tsx`, `OutstandingReport.tsx`).
2. **Purchase & Planning:** (`Purchases.tsx`, `PurchasePlanning.tsx`, `PurchaseInvoiceHistory.tsx`).
3. **Inventory & Movements:** (`Inventory.tsx`, `FinishedGoodsLogs.tsx`, `StockAlerts.tsx`, `StockLedger.tsx`).
4. **Production & KARIGAR Wages:** (`Production.tsx`, `JobWork.tsx`, `Employees.tsx`, `Collections.tsx`, `ProductionReports.tsx`, `ConsumptionLogs.tsx`).
5. **Double-Entry Finance:** (`Ledger.tsx`, `CashBankBook.tsx`, `CashBook.tsx`, `BankBook.tsx`, `GstReports.tsx`, `ProfitLoss.tsx`).
6. **Settings & Security:** (`Settings.tsx`, `AuthGuard.tsx`, `Profile.tsx`).

---

## 3. Directory Import Control Rules

To prevent circular dependency risks and maintain a clean separation of concerns:

### Permitted Import Rules
* **Rule P2-DEP-001:** Components under `/pages` are permitted to import visual UI primitives (`/components/ui/*`) and hooks from `useQueries.ts` or `useActor.ts`.
* **Rule P2-DEP-002:** Custom hooks are permitted to import stateless helper functions under `/utils`.
* **Rule P2-DEP-003:** Generated bindings (`backend.ts`) must only be accessed through `useActor.ts` or custom query wrappers.
* **Rule P2-DEP-004:** Feature pages are permitted to import shared layouts (`Navigation.tsx`, `Sidebar.tsx`).

### Forbidden Import Rules
* **Rule P2-DEP-005 (Page Cross-Imports):** Page files under `/pages` MUST NOT import details directly from other pages (e.g. `CreateInvoice.tsx` must never import a sub-component directly from `Purchases.tsx`).
* **Rule P2-DEP-006 (UI Primitive Cleanliness):** Visual primitives under `/components/ui` MUST remain presentation-only and contain no imports to React Query state hooks or canisters.
* **Rule P2-DEP-007 (Services Pureness):** Calculations and formatting utilities under `/utils` MUST NOT import React component state hooks, useNavigate routing APIs, or active actors.
* **Rule P2-DEP-008 (Direct Bindings Bypass):** React components must never instantiate or query generated canister binding classes directly, bypassing the `useActor` hook.
