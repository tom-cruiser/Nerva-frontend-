'use client';
import { tokenStore } from './token-store';

/**
 * Multi-tenant data-isolation + offline-first sync helpers.
 *
 * The `organization_id` is the single global isolation boundary for the
 * offline-first WatermelonDB client: every local table carries an indexed
 * `organization_id` column (see app/database/schema.ts) so that no record
 * ever leaks across tenants, even before it has synced to the server.
 *
 * Sync uses Last-Write-Wins (LWW): the server compares `updated_at`
 * timestamps to resolve conflicts, so every locally-created/edited record
 * must carry a timestamptz-compliant (ISO-8601, UTC) instant.
 */

/** The active tenancy boundary, preferring the explicit org id. */
export function currentOrganizationId(): string | null {
  return tokenStore.organizationId ?? tokenStore.tenantId;
}

/**
 * timestamptz-compliant instant (ISO-8601, UTC) for LWW comparisons.
 * Postgres `TIMESTAMPTZ` round-trips this format losslessly.
 */
export function nowTimestamptz(): string {
  return new Date().toISOString();
}

/**
 * Stamp a locally-created record with the tenancy boundary and the LWW
 * fields the sync engine expects. Use this whenever the UI mints a record
 * that will later be pushed through the sales-sync batch endpoint.
 */
export function stampLocalRecord<T extends Record<string, unknown>>(
  data: T,
): T & { organization_id: string | null; client_created_at: string; updated_at: string } {
  const ts = nowTimestamptz();
  return {
    ...data,
    organization_id: currentOrganizationId(),
    client_created_at: ts,
    updated_at: ts,
  };
}
