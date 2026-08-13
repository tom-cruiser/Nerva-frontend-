// app/(app)/whatsapp/components/SendReport.tsx
'use client';
import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { request } from '@/lib/api';
import { analytics } from '@/lib/endpoints';

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
  const [dataWarning, setDataWarning] = useState<string | null>(null);

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
    setDataWarning(null);

    // Real sales figures for the selected date/period — replaces the old
    // fabricated placeholder data (see lib/endpoints.ts's `analytics` client,
    // backed by services/sales-sync's analytics-router.ts). On failure, send
    // a zeroed summary rather than inventing numbers/product names — a
    // partial-but-honest report beats a plausible-looking fake one.
    let summary;
    try {
      const report = await analytics.getSalesReport(date, period);
      summary = {
        totalSales: report.totalSales,
        totalOrders: report.totalOrders,
        averageOrderValue: report.averageOrderValue,
        topSellingProducts: report.topSellingProducts.map(p => ({
          name: p.name, quantity: p.quantity, revenue: p.revenue,
        })),
        revenueByCategory: report.revenueByCategory,
        paymentMethods: report.paymentMethods,
        hourlySales: report.hourlySales,
      };
    } catch (err: any) {
      setDataWarning(
        `Could not load real sales figures (${err.message || 'unknown error'}) — sending a zeroed report instead of guessed numbers.`,
      );
      summary = {
        totalSales: 0, totalOrders: 0, averageOrderValue: 0,
        topSellingProducts: [], revenueByCategory: [], paymentMethods: [], hourlySales: [],
      };
    }

    try {
      const reportData = {
        date,
        period,
        summary,
        recipients: recipientList,
        options: {
          sendPDF: true,
          sendMessage: true,
          pdfOptions: {
            includeCharts: summary.hourlySales.length > 0,
            includeBreakdown: summary.topSellingProducts.length > 0 || summary.revenueByCategory.length > 0,
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

        {dataWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
            ⚠️ {dataWarning}
          </div>
        )}

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