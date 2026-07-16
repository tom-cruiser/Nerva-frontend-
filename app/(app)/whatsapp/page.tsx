'use client';
import React, { useState, useEffect } from 'react';
import { whatsapp } from '@/lib/api';
import Card   from '@/components/ui/Card';
import Badge  from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

export default function WhatsappPage() {
  const [status, setStatus] = useState<'DISCONNECTED' | 'AUTHENTICATING' | 'READY'>('DISCONNECTED');
  const [qr, setQr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Poll for bridge status
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await whatsapp.getStatus();
        setStatus(data.status);
        setQr(data.qr || null);
      } catch (e) {
        console.error('Bridge unreachable', e);
      }
    };
    const interval = setInterval(poll, 3000);
    poll();
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    setSending(true);
    try {
      await whatsapp.sendMessage('+250780000000', 'Test message from Nerva WhatsApp Engine');
      alert('Message sent successfully!');
    } catch (e) {
      console.error('Failed to send:', e);
      alert('Failed to send message. Check console for details.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-screen text-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-black text-[#0A0A0A] tracking-tight">WhatsApp Engine</h1>
          <p className="text-[14px] text-zinc-500 mt-0.5">
            Bridge Status: <span className={`font-bold ${status === 'READY' ? 'text-emerald-600' : 'text-amber-600'}`}>{status}</span>
          </p>
        </div>
      </div>

      {/* Connection State Manager */}
      {status !== 'READY' && (
        <Card className="p-12 text-center border-2 border-dashed border-zinc-200 bg-white">
          {status === 'AUTHENTICATING' && qr ? (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Scan QR to Activate Engine</h3>
              <img src={qr} alt="WhatsApp QR Code" className="mx-auto w-64 h-64 border p-2 bg-white" />
              <p className="text-sm text-zinc-400">Open WhatsApp on your phone &gt; Linked Devices &gt; Link a device</p>
            </div>
          ) : (
            <div className="text-zinc-500 font-medium">Initializing WhatsApp bridge...</div>
          )}
        </Card>
      )}

      {/* Only show Dashboard if READY */}
      {status === 'READY' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Engine Active</h3>
                <p className="text-sm text-zinc-500">Bridge is connected and ready to send messages.</p>
              </div>
              <Button 
                onClick={handleSend} 
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Send Test Message'}
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              {/* Message Log Table would go here */}
            </div>
            <div>
              {/* Scheduled Crons would go here */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}