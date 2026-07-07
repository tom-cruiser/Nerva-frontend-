# Skill: Subscription Tier-Gating & UI Restraints

Use this checklist whenever constructing views, navigation elements, sidebars, or configuration pages.

## 1. Local Tier Validation
Before rendering advanced features, read the active organization's configuration block[cite: 2]:
- `starter`: Render only 1 Location view, Core POS register, and standard inventories[cite: 2]. Lock out multi-currency switches and credit ledgers[cite: 2].
- `premium`: Unlock End-of-Shift Reconciliation, Batch/Expiry dashboards, and the "Notebook" Credit/Debt Store Ledger[cite: 2].
- `business` / `business_premium`: Unlock the Branch Context Switcher menu dropdown and cross-store inventory data matrices[cite: 2].

## 2. Component Interception
- **Visual Callouts:** Instead of completely hiding locked premium tabs, render them with a subtle padlock icon and an upgrade call-to-action to maximize plan conversion.
- **Form Disabling:** If a route is locked by tier, grey out inputs and enforce a strict read-only structural layer.