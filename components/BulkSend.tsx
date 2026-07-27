// app/(app)/whatsapp/components/BulkSend.tsx
'use client';
import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { whatsapp } from '@/lib/api';

interface BulkSendProps {
  onSendComplete?: (result: any) => void;
}

export default function BulkSend({ onSendComplete }: BulkSendProps) {
  const [numbers, setNumbers] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBulkSend = async () => {
    const numberList = numbers
      .split(/[\n,]/)
      .map(n => n.trim())
      .filter(n => n);

    if (numberList.length === 0) {
      setError('Please enter at least one phone number');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setIsSending(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: numberList.length });

    try {
      const result = await whatsapp.sendBulk(numberList, message, {
        delayBetween: 1000,
        chunkSize: 10,
        waitForAll: true
      });
      
      setResult(result);
      setProgress({ current: result.summary.total, total: result.summary.total });
      
      if (onSendComplete) {
        onSendComplete(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send bulk messages');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4">📤 Bulk Send</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Phone Numbers (one per line or comma separated)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            rows={6}
            placeholder="+250780000001&#10;+250780000002&#10;+250780000003"
            value={numbers}
            onChange={(e) => setNumbers(e.target.value)}
            disabled={isSending}
          />
          <p className="text-xs text-zinc-500 mt-1">
            Enter multiple numbers (one per line) or separated by commas
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Message
          </label>
          <textarea
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            rows={3}
            placeholder="Enter your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            ❌ {error}
          </div>
        )}

        {progress && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex justify-between text-sm text-blue-700 mb-1">
              <span>Progress</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {result && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
            <div className="text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-700 font-semibold">✅ Send Complete</span>
                <span className="text-emerald-600">
                  {result.summary.successful} sent, {result.summary.failed} failed
                </span>
              </div>
              {result.results && result.results.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {result.results.map((r: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-emerald-100">
                      <span>{r.number}</span>
                      <span className={r.success ? 'text-emerald-600' : 'text-red-600'}>
                        {r.success ? '✅ Sent' : `❌ ${r.error || 'Failed'}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={handleBulkSend}
          disabled={isSending || !numbers || !message}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {isSending ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending...
            </>
          ) : (
            '📤 Send to All'
          )}
        </Button>
      </div>
    </Card>
  );
}