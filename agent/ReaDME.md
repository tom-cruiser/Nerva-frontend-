# Frontend Implementation Path for AI Agents

Use this file as the client-side implementation contract for Nerva the Knowing. The backend is assumed to already expose auth and CRUD/sync endpoints, so the frontend must stay aligned with the tier and tenant model rather than re-inventing it.

## 1. Structural Context
- **Application name:** Nerva the Knowing.
- **Architecture:** Accounts own one or more organizations; the active organization drives scoped views.
- **Frontend stack:** Next.js App Router with a separate public shell and authenticated shell.
- **Data engine:** WatermelonDB powers offline-first reads and writes for products, sales, and sale items.
- **Visual direction:** High-contrast, premium, operational UI with an off-white canvas, obsidian anchors, and teal pulse accents.

## 2. Routing and Build Order
Build the frontend in this order and keep the route trees separate:
1. Public shell.
2. Auth.
3. Cashier.
4. Admin.
5. Superadmin.

Keep logged-out pages isolated from authenticated bundles so marketing/auth routes do not ship WatermelonDB or POS logic.

## 3. Authentication and Tenant State
- Auth state must carry `account_id`, `organization_id[]`, and `role`.
- The active store must live in a single `activeOrganizationId` value in context.
- Business and Business-Premium users can switch stores from a global context switcher.
- Never trust the frontend gate alone; mirror backend tier-gates locally for UX only.

## 4. Route Guarding
- Use a single `RequireRole` wrapper for tenant-side role checks.
- Keep `/platform/*` on a separate namespace with its own superadmin auth check.
- Do not mix platform operator views into tenant layouts.

## 5. Public / Logged-Out Surface
Public pages are conversion-only and must not touch store data.

Required pages:
- Landing page.
- Pricing page.
- Sign-up flow.
- Login.
- Terms.
- Privacy.

Rules:
- Pricing must render the four-tier comparison from a static config object, not hardcoded JSX.
- Sign-up must collect owner email, selected tier, first store name, owner phone number, and base currency.
- Sign-up is the only place that creates both the account and the first organization in one transaction.

## 6. Cashier Side
Cashiers operate sales and sale item flows only.

Core screens:
- Register / checkout.
- Product lookup.
- End-of-shift reconciliation for Premium+.
- Credit/debit ledger entry for Premium+.

Rules:
- Register and product lookup must read from WatermelonDB.
- Support offline checkout and queue sales for sync.
- Hide buying price, margin data, supplier data, other organizations, and billing screens from this role.

## 7. Admin Side
Admin scope varies by tier and should progressively disclose features instead of showing dead locked panels.

Common screens:
- Dashboard.
- Inventory management.
- In-app alerts panel.
- Staff/user management.

Premium+ screens:
- Margin dashboard.
- Purchase order queue.
- Cash reconciliation review.

Business+ screens:
- Global store switcher.
- Cross-store inventory view.
- Consolidated WhatsApp report settings.

Rules:
- Enforce seat caps in the UI with a disabled invite action and explanatory feedback.
- Keep alert tiers scoped by subscription level.

## 8. Superadmin Side
Superadmin is platform-only and operates across accounts, not organizations.

Required screens:
- Accounts list.
- Account detail.
- Tier configuration editor.
- Platform health.
- Impersonation / support mode.

Rules:
- Keep superadmin routes completely separate from tenant layouts.
- Log every impersonation against both account and superadmin identity.
- Use a single source of truth config object for feature matrix, seat limits, store limits, WhatsApp frequency, and alert tiers.

## 9. WhatsApp Delivery Note
Treat browser automation-based WhatsApp delivery as a risky implementation choice. If the UI exposes WhatsApp report settings, the backend strategy must acknowledge the Terms-of-Service risk and define a fallback path such as the official Cloud API.

## 10. Design Direction
- Use large touch targets and high contrast for register screens.
- Distinguish cashier, admin, and superadmin modes with persistent color-coded headers or equivalent visual state.
- Use monospaced or tabular figures for prices, totals, and stock counts.
- Make empty states action-oriented and specific.

## 11. Operational Directives
1. Never infer tenant or tier capabilities that are not present in the auth context.
2. Never rely on the frontend as the only gate for restricted data.
3. Keep UI tokens and palette usage consistent with the established Nerva design system.
4. Prefer local reactive state and offline-first flows for operational screens.