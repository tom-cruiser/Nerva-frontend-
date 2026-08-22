'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Loader2, RefreshCw } from 'lucide-react';
import { support } from '@/lib/superadmin-api';
import type { SupportThreadRow, SupportMessageRow } from '@/lib/superadmin-api';
import { onRealtimeEvent } from '@/lib/realtime';
import { formatRelative } from '@/lib/format';
import { useAuth } from '@/app/context/AuthContext';
import { Panel, Pill, ErrorBanner } from '../_ui';

/**
 * Super Admin side of the tenant support chat — the inbox
 * (services/superadmin's support-router.ts GET /support/threads) plus a
 * per-tenant thread view/reply, both kept live over the same
 * `support:message_created` push the tenant frontend listens for (see
 * app/(app)/support/page.tsx and lib/support-api.ts).
 */
export default function PlatformSupportPage() {
  const [threads, setThreads] = useState<SupportThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await support.listThreads();
      setThreads(res.threads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support threads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => onRealtimeEvent('support:message_created', () => loadThreads()), [loadThreads]);

  return (
    <div className="p-5 sm:p-7 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-black text-[#0A0A0A] tracking-tight">Support</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">Live conversations with tenants — every reply pushes over the same socket their console listens on.</p>
        </div>
        <button
          onClick={loadThreads}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-200/70 bg-white/70 hover:bg-white hover:text-[#0052ff] transition-all disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <ErrorBanner text={error} />}

      <div className="grid md:grid-cols-[340px_1fr] gap-6 items-start">
        <ThreadList threads={threads} selected={selected} onSelect={setSelected} loading={loading} />
        {selected
          ? <ThreadPanel key={selected} tenantId={selected} thread={threads.find((t) => t.tenant_id === selected) ?? null} />
          : (
            <Panel className="h-[520px] flex flex-col items-center justify-center text-center">
              <MessageCircle size={28} className="text-zinc-300 mb-3" />
              <p className="text-[13px] text-zinc-400 font-medium">Pick a conversation on the left to read and reply.</p>
            </Panel>
          )}
      </div>
    </div>
  );
}

function ThreadList({
  threads, selected, onSelect, loading,
}: { threads: SupportThreadRow[]; selected: string | null; onSelect: (id: string) => void; loading: boolean }) {
  return (
    <Panel padding="p-0" className="overflow-hidden">
      <div className="max-h-[560px] overflow-y-auto divide-y divide-zinc-100">
        {threads.map((t) => (
          <button
            key={t.tenant_id}
            onClick={() => onSelect(t.tenant_id)}
            className={`w-full text-left px-4 py-3.5 transition-colors ${
              selected === t.tenant_id ? 'bg-[#0052ff]/6' : 'hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[13px] font-bold text-[#0A0A0A] truncate">{t.tenant_name}</span>
              {t.unread_count > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#0052ff] text-white text-[10px] font-bold shrink-0">
                  {t.unread_count}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-zinc-400 truncate mb-1">{t.last_message_preview ?? 'No messages yet'}</p>
            <div className="flex items-center justify-between">
              <Pill color={t.status === 'OPEN' ? 'green' : 'zinc'}>{t.status}</Pill>
              <span className="text-[10px] font-mono text-zinc-400">{formatRelative(t.last_message_at)}</span>
            </div>
          </button>
        ))}
        {!loading && threads.length === 0 && (
          <div className="px-4 py-10 text-center text-[13px] text-zinc-400">No tenant has messaged support yet.</div>
        )}
      </div>
    </Panel>
  );
}

function ThreadPanel({ tenantId, thread }: { tenantId: string; thread: SupportThreadRow | null }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await support.getThread(tenantId);
      setMessages(res.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load this conversation');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() =>
    onRealtimeEvent<SupportMessageRow>('support:message_created', (msg) => {
      if (msg.tenantId !== tenantId) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    }),
  [tenantId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const sent = await support.reply(tenantId, body);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  return (
    <Panel padding="p-0" className="overflow-hidden flex flex-col h-[560px]">
      <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[13px] font-bold text-[#0A0A0A]">{thread?.tenant_name ?? tenantId}</p>
          <p className="text-[11px] text-zinc-400 font-mono">{thread?.tenant_slug}</p>
        </div>
        {thread && <Pill color={thread.status === 'OPEN' ? 'green' : 'zinc'}>{thread.status}</Pill>}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-zinc-50/50">
        {loading && (
          <div className="flex items-center justify-center h-full text-zinc-400 gap-2 text-[13px]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && messages.map((m) => {
          const fromStaff = m.senderType === 'STAFF';
          return (
            <div key={m.id} className={`flex ${fromStaff ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                fromStaff ? 'bg-[#0052ff] text-white' : 'bg-white text-[#0b1e33] border border-zinc-200'
              }`}>
                {!fromStaff && <p className="text-[10px] font-bold text-[#0052ff] mb-0.5">{m.senderEmail ?? 'Tenant'}</p>}
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[10px] font-mono mt-1 ${fromStaff ? 'text-white/60' : 'text-zinc-400'}`}>
                  {formatRelative(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="px-5 py-2 bg-red-50 border-t border-red-100 text-[12px] text-red-600 font-medium shrink-0">{error}</div>}

      <div className="p-3.5 border-t border-zinc-100 bg-white flex items-end gap-2 shrink-0">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Reply as ${user?.email ?? 'support'}…`}
          rows={1}
          maxLength={4000}
          className="flex-1 resize-none px-3.5 py-2.5 text-[13px] rounded-xl border border-zinc-200 focus:outline-none focus:ring-4 focus:ring-[#0052ff]/8 focus:border-[#0052ff]/50 max-h-28"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="shrink-0 w-10 h-10 grid place-items-center rounded-xl bg-[#0052ff] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0041cc] transition"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </Panel>
  );
}
