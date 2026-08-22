'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, HelpCircle, Send, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { support } from '@/lib/support-api';
import type { SupportMessage } from '@/lib/support-api';
import { onRealtimeEvent } from '@/lib/realtime';
import { formatRelative } from '@/lib/format';
import { ApiError } from '@/lib/api';

/**
 * Help & Support — a real-time chat with the Super Admin support team (see
 * services/auth-tenant's support-handler.ts), plus a static FAQ grounded in
 * what this console actually does. Deliberately reachable by every role,
 * including STAFF — see components/Sidebar.tsx, where this nav item carries
 * no `permission` gate, same as Dashboard.
 */

const FAQS: { q: string; a: string }[] = [
  {
    q: "What happens to a sale if the internet drops mid-checkout?",
    a: "Nothing is lost. The sale is saved to this device's local queue the moment you charge it, and the cashier still sees a normal receipt. Once the connection returns, every queued sale syncs automatically — no one has to retry anything manually.",
  },
  {
    q: "Why can't a cashier see the Ledgers or Reports pages?",
    a: "By design. The STAFF role can ring up sales, search inventory, and manage their own shift, but can't see the customer credit ledger or profit/sales reports — that's reserved for Managers and Owners. An Owner can grant a specific cashier extra access from Settings → Team without changing their role.",
  },
  {
    q: "How do I print a receipt without a cable?",
    a: "Pair a 58mm or 80mm BLE thermal printer once from the checkout screen — Nerva talks to it directly over Bluetooth (ESC/POS). If a browser or device doesn't support that, checkout falls back to a normal browser print dialog instead.",
  },
  {
    q: "How do WhatsApp reports work?",
    a: "From the WhatsApp page you can turn on Daily, Weekly, or Monthly digests and pick which sections go out — Sales Summary, Cashier Breakdown, Low-Stock Warnings, Profit Metrics. A scheduler checks every 15 minutes and sends the report straight to the phone numbers you've listed, no login required to read it.",
  },
  {
    q: "What's the difference between closing a shift and the Ledgers page?",
    a: "Ledgers tracks what customers owe you (store credit). Closing a Shift is the actual end-of-day cash count — you enter what's physically in the drawer, and Nerva compares it against opening balance + cash sales to show any discrepancy.",
  },
  {
    q: "A product shows LOW or OUT of stock — what do I do?",
    a: "Open Inventory, find the product, and use Restock to log what came in (quantity, supplier, unit cost). The status clears automatically once stock is back above its reorder level.",
  },
  {
    q: "I don't see an answer here — what happens when I message support?",
    a: "Your message goes straight to the Super Admin team's live inbox. Whoever's on support can reply from their side and it'll show up here instantly — no need to refresh the page.",
  },
];

export default function SupportPage() {
  const [tab, setTab] = useState<'chat' | 'faq'>('chat');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0b1e33] tracking-tight">Help &amp; Support</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Message our team directly, or check the FAQ below.</p>
      </div>

      <div className="inline-flex gap-1.5 p-1.5 rounded-full bg-slate-100 mb-6">
        <button
          onClick={() => setTab('chat')}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full transition ${
            tab === 'chat' ? 'bg-white text-[#0052ff] shadow-sm' : 'text-slate-500'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" /> Message Support
        </button>
        <button
          onClick={() => setTab('faq')}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full transition ${
            tab === 'faq' ? 'bg-white text-[#0052ff] shadow-sm' : 'text-slate-500'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> FAQs
        </button>
      </div>

      {tab === 'chat' ? <SupportChat /> : <FaqAccordion />}
    </div>
  );
}

function SupportChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await support.listMessages();
      setMessages(res.messages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your support conversation');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live — a Super Admin's reply (or a message sent from a second signed-in
  // device on this same tenant) appears instantly, no polling needed.
  useEffect(() =>
    onRealtimeEvent<SupportMessage>('support:message_created', (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    }),
  []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const sent = await support.sendMessage(body);
      // The realtime echo will also deliver this same message — dedupe by id
      // in the subscription above rather than skipping the optimistic add,
      // so the sender sees it immediately even if the socket lags.
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setDraft('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send your message — try again');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden">
      <div className="bg-[#0b1e33] px-5 py-3.5 flex items-center gap-2.5">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </div>
        <span className="text-xs font-bold text-white">Nerva Support</span>
        <span className="text-[10px] font-mono text-white/50 ml-auto flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Private to your workspace
        </span>
      </div>

      <div ref={scrollRef} className="h-[420px] overflow-y-auto px-5 py-5 space-y-3 bg-slate-50/60">
        {loading && (
          <div className="flex items-center justify-center h-full text-slate-400 gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading conversation…
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <MessageCircle className="w-8 h-8 mb-3 text-slate-300" />
            <p className="text-sm font-medium">No messages yet.</p>
            <p className="text-xs mt-1">Ask us anything — a real person on the support team will reply here.</p>
          </div>
        )}

        {messages.map((m) => {
          const mine = m.senderType === 'TENANT';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                mine ? 'bg-[#0052ff] text-white' : 'bg-white text-[#0b1e33] border border-slate-200'
              }`}>
                {!mine && <p className="text-[10px] font-bold text-[#0052ff] mb-0.5">Nerva Support</p>}
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[10px] font-mono mt-1 ${mine ? 'text-white/60' : 'text-slate-400'}`}>
                  {formatRelative(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="px-5 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600 font-medium">{error}</div>
      )}

      <div className="p-3.5 border-t border-slate-200 bg-white flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Message support as ${user?.email ?? 'yourself'}…`}
          rows={1}
          maxLength={4000}
          className="flex-1 resize-none px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0052ff]/30 focus:border-[#0052ff] max-h-28"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="shrink-0 w-10 h-10 grid place-items-center rounded-xl bg-[#0052ff] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2.5">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="glass-card rounded-2xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="text-sm font-bold text-[#0b1e33]">{item.q}</span>
              <span className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-4 -mt-1">
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
