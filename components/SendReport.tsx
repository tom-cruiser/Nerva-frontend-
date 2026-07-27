// app/(app)/whatsapp/components/SendReport.tsx
'use client';
import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { request } from '@/lib/api';

interface SendReportProps {
  onSendComplete?: (result: any) => void;
}

export default function SendReport({ onSendComplete }: SendReportProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [recipients, setRecipients] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock report data - In real app, this would come from your POS
  const generateMockReportData = () => {
    return {
      totalSales: 12500.50,
      totalOrders: 87,
      averageOrderValue: 143.68,
      topSellingProducts: [
        { name: 'Product A', quantity: 45, revenue: 4500 },
        { name: 'Product B', quantity: 32, revenue: 3200 },
        { name: 'Product C', quantity: 28, revenue: 2800 },
        { name: 'Product D', quantity: 20, revenue: 2000 },
      ],
      revenueByCategory: [
        { category: 'Electronics', revenue: 5500 },
        { category: 'Clothing', revenue: 3500 },
        { category: 'Food', revenue: 2500 },
        { category: 'Accessories', revenue: 1000 },
      ],
      paymentMethods: [
        { method: 'Cash', amount: 5000, count: 35 },
        { method: 'Card', amount: 4500, count: 30 },
        { method: 'Mobile Money', amount: 3000, count: 22 },
      ],
      hourlySales: [
        { hour: '09:00', orders: 8, revenue: 1200 },
        { hour: '10:00', orders: 12, revenue: 1800 },
        { hour: '11:00', orders: 15, revenue: 2200 },
        { hour: '12:00', orders: 10, revenue: 1500 },
        { hour: '13:00', orders: 7, revenue: 1050 },
        { hour: '14:00', orders: 9, revenue: 1350 },
        { hour: '15:00', orders: 11, revenue: 1650 },
        { hour: '16:00', orders: 15, revenue: 2250 },
      ]
    };
  };

  const handleSendReport = async () => {
    const recipientList = recipients
      .split(/[\n,]/)
      .map(r => r.trim())
      .filter(r => r);

    if (recipientList.length === 0) {
      setError('Please enter at least one recipient');
      return;
    }

    setIsSending(true);
    setError(null);
    setResult(null);

    try {
      const reportData = {
        date,
        period,
        summary: generateMockReportData(),
        recipients: recipientList,
        options: {
          sendPDF: true,
          sendMessage: true,
          pdfOptions: {
            includeCharts: true,
            includeBreakdown: true
          }
        }
      };

      const response = await request('/api/v1/whatsapp/reports/send-report', {
        method: 'POST',
        body: reportData,
        auth: true
      });

      setResult(response);
      
      if (onSendComplete) {
        onSendComplete(response);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send report');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📊</span>
        <h3 className="text-lg font-bold">Send POS Report</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-zinc-300 rounded-md"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSending}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Period
            </label>
            <select
              className="w-full px-3 py-2 border border-zinc-300 rounded-md"
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              disabled={isSending}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Recipients (one per line or comma separated)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500"
            rows={4}
            placeholder="+250780000001&#10;+250780000002&#10;+250780000003"
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            disabled={isSending}
          />
          <p className="text-xs text-zinc-500 mt-1">
            Enter multiple numbers (one per line) or separated by commas
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <span>ℹ️</span>
            <span>
              Report will be sent with both a formatted message and a PDF attachment.
              {period === 'daily' && ' Daily reports include hourly breakdown.'}
              {period === 'weekly' && ' Weekly reports include day-by-day trends.'}
              {period === 'monthly' && ' Monthly reports include week-by-week trends.'}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            ❌ {error}
          </div>
        )}

        {result && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
            <div className="text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-700 font-semibold">✅ Report Sent</span>
                <span className="text-emerald-600">
                  Sent to {result.result.messageResults.filter((r: any) => r.success).length} recipients
                </span>
              </div>
              {result.result.messageResults && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {result.result.messageResults.map((r: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-emerald-100">
                      <span>{r.recipient}</span>
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
          onClick={handleSendReport}
          disabled={isSending || !recipients}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {isSending ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending Report...
            </>
          ) : (
            '📊 Send Report'
          )}
        </Button>
      </div>
    </Card>
  );
}