'use client';
import { request } from './api';

/**
 * Tenant-facing support chat client — talks to services/auth-tenant's
 * support-handler.ts (mounted at /api/v1/auth/support/*). Real-time
 * delivery of new messages (both directions) comes over the existing
 * Socket.IO connection via lib/realtime.ts's onRealtimeEvent('support:
 * message_created', ...) — nothing new to wire up there, it's already
 * generic. See lib/superadmin-api.ts's `support` namespace for the
 * Super Admin side of the same thread.
 */

const BASE = '/api/v1/auth/support';

export interface SupportMessage {
  id: string;
  tenantId: string;
  senderType: 'TENANT' | 'STAFF';
  senderUserId: string;
  senderEmail: string | null;
  body: string;
  createdAt: string;
}

export interface SupportThreadResponse {
  status: 'OPEN' | 'CLOSED';
  messages: SupportMessage[];
}

export const support = {
  /** Full thread history, oldest first. Marks the Super Admin's replies read. */
  listMessages: () => request<SupportThreadResponse>(`${BASE}/messages`),

  sendMessage: (body: string) =>
    request<SupportMessage>(`${BASE}/messages`, { method: 'POST', body: { body } }),
};
