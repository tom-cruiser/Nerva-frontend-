// app/(app)/whatsapp/page.tsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { whatsapp } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RequireRole from '@/components/RequireRole';
import BulkSend from '@/components/BulkSend';
import SendReport from '@/components/SendReport';

// Types
type ConnectionStatus = 'DISCONNECTED' | 'AUTHENTICATING' | 'READY' | 'FAILED' | 'TIMEOUT' | 'UNAVAILABLE' | 'ERROR';

interface StatusResponse {
  status: ConnectionStatus;
  qr?: string;
  message?: string;
  health?: 'healthy' | 'unhealthy' | 'unknown';
  messageCount?: number;
  lastActivity?: string;
  timestamp?: string;
}

export default function WhatsappPage() {
  const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [qr, setQr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isPolling, setIsPolling] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showBulkSend, setShowBulkSend] = useState(false);
  const [showReportSend, setShowReportSend] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [reportResult, setReportResult] = useState<any>(null);

  // Connect to WhatsApp
  const connectWhatsApp = useCallback(async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log('[WhatsApp] Connecting...');
      const result = await whatsapp.connect();
      console.log('[WhatsApp] Connect result:', result);
      
      if (result.status === 'READY') {
        setStatus('READY');
        setQr(null);
      } else if (result.status === 'AUTHENTICATING' && result.qr) {
        setStatus('AUTHENTICATING');
        setQr(result.qr);
      } else {
        setStatus(result.status);
      }
    } catch (err: any) {
      console.error('[WhatsApp] Connect error:', err);
      setError(err.message || 'Failed to connect to WhatsApp');
      setStatus('ERROR');
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  // Poll for status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isMounted = true;
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      if (!isMounted) return;
      
      try {
        setError(null);
        const data = await whatsapp.getStatus();
        
        if (isMounted) {
          setStatus(data.status);
          setQr(data.qr || null);
          setMessageCount(data.messageCount || 0);
          setLastChecked(new Date());
          setRetryCount(0);
          
          if (data.status === 'READY') {
            console.log('[WhatsApp] Bridge is ready');
          }
        }
      } catch (err: any) {
        console.error('[WhatsApp] Polling error:', err);
        attempts++;
        
        if (isMounted) {
          let errorMessage = 'Unable to connect to WhatsApp service';
          
          if (err.message?.includes('ECONNREFUSED') || err.message?.includes('unreachable')) {
            errorMessage = '⚠️ WhatsApp service is not running. Please start the service.';
          } else if (err.status === 401 || err.status === 403) {
            errorMessage = '🔒 Authentication failed. Please log in again.';
          } else if (err.status === 404) {
            errorMessage = '❌ WhatsApp endpoint not found. Please check the service configuration.';
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          setError(errorMessage);
          setStatus('ERROR');
          setRetryCount(prev => prev + 1);
          
          if (retryCount > 10) {
            setIsPolling(false);
            setError(prev => prev + ' (Polling stopped after multiple failures. Click "Retry" to reconnect.)');
          }
        }
      }
    };

    // Initial connect on mount
    if (isPolling && status === 'DISCONNECTED') {
      connectWhatsApp();
    }

    // Start polling
    if (isPolling && status !== 'DISCONNECTED') {
      poll();
      const pollInterval = status === 'AUTHENTICATING' ? 2000 : 5000;
      interval = setInterval(poll, pollInterval);
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [isPolling, retryCount, status, connectWhatsApp]);

  const handleRetry = () => {
    setRetryCount(0);
    setIsPolling(true);
    setError(null);
    setStatus('DISCONNECTED');
    connectWhatsApp();
  };

  const handleSend = async () => {
    if (status !== 'READY') {
      alert('WhatsApp is not ready. Please scan the QR code first.');
      return;
    }

    setSending(true);
    setError(null);
    
    try {
      const result = await whatsapp.sendMessage('+250792113044', 'Test message from Nerva WhatsApp Engine');
      alert('✅ Message sent successfully!');
      console.log('[WhatsApp] Message sent:', result);
      setMessageCount(prev => prev + 1);
    } catch (err: any) {
      console.error('[WhatsApp] Failed to send:', err);
      
      let errorMsg = 'Failed to send message. ';
      if (err.isServiceUnavailable || err.message?.includes('ECONNREFUSED')) {
        errorMsg += 'WhatsApp service is unreachable.';
      } else if (err.isNotFound) {
        errorMsg += 'Endpoint not found. Please check the service configuration.';
      } else if (err.isUnauthorized) {
        errorMsg += 'Authentication failed. Please log in again.';
      } else if (err.message) {
        errorMsg += err.message;
      }
      
      setError(errorMsg);
      alert('❌ ' + errorMsg);
    } finally {
      setSending(false);
    }
  };

  // Render status badge
  const renderStatusBadge = () => {
    const statusConfig: Record<ConnectionStatus, { label: string; className: string }> = {
      'READY': { label: '🟢 Connected', className: 'bg-emerald-100 text-emerald-700' },
      'AUTHENTICATING': { label: '🟡 Authenticating', className: 'bg-amber-100 text-amber-700' },
      'DISCONNECTED': { label: '🔴 Disconnected', className: 'bg-red-100 text-red-700' },
      'FAILED': { label: '❌ Failed', className: 'bg-red-100 text-red-700' },
      'TIMEOUT': { label: '⏰ Timeout', className: 'bg-yellow-100 text-yellow-700' },
      'UNAVAILABLE': { label: '⚪ Unavailable', className: 'bg-gray-100 text-gray-700' },
      'ERROR': { label: '❌ Error', className: 'bg-red-100 text-red-700' },
    };
    
    const config = statusConfig[status] || statusConfig['DISCONNECTED'];
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <RequireRole requiredPermission="whatsapp:send">
    <div className="p-7 space-y-6 max-w-[1400px] bg-zinc-50/50 min-h-screen text-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-black text-[#0A0A0A] tracking-tight">WhatsApp Engine</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[14px] text-zinc-500">Bridge Status:</p>
            {renderStatusBadge()}
            {messageCount > 0 && (
              <span className="text-xs text-zinc-500">
                📨 {messageCount} messages sent
              </span>
            )}
            {lastChecked && (
              <span className="text-xs text-zinc-400">
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
            )}
            {retryCount > 0 && status === 'ERROR' && (
              <span className="text-xs text-red-500">
                (Retry {retryCount})
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {status === 'READY' && (
            <>
              <Button 
                onClick={() => {
                  setShowBulkSend(false);
                  setShowReportSend(!showReportSend);
                }}
                variant={showReportSend ? 'primary' : 'outline'}
                className="text-sm"
              >
                {showReportSend ? '📩 Messages' : '📊 Reports'}
              </Button>
              <Button 
                onClick={() => {
                  setShowReportSend(false);
                  setShowBulkSend(!showBulkSend);
                }}
                variant={showBulkSend ? 'primary' : 'outline'}
                className="text-sm"
              >
                {showBulkSend ? '📩 Single Message' : '📤 Bulk Send'}
              </Button>
            </>
          )}
          <Button 
            onClick={handleRetry}
            variant="outline"
            size="sm"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              '🔄 Refresh'
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-xl">⚠️</div>
            <div>
              <h3 className="font-bold text-red-700">Connection Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              {status === 'ERROR' && (
                <div className="mt-3 space-x-3">
                  <Button 
                    onClick={handleRetry}
                    size="sm"
                    className="text-sm bg-red-600 hover:bg-red-700"
                  >
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()}
                    size="sm"
                    variant="outline"
                    className="text-sm"
                  >
                    Refresh Page
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Service Unavailable Warning */}
      {status === 'UNAVAILABLE' && !error && (
        <Card className="p-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <span className="text-amber-500 text-xl">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-700">Service Unavailable</h3>
              <p className="text-amber-600 text-sm">
                The WhatsApp service is currently unavailable. Please check the service status.
              </p>
              <Button 
                onClick={handleRetry}
                size="sm"
                className="mt-2"
                variant="outline"
              >
                Check Connection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Connection State Manager */}
      {status === 'AUTHENTICATING' && qr && (
        <Card className="p-12 text-center border-2 border-dashed border-zinc-200 bg-white">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="animate-pulse">
                <span className="text-amber-500 text-2xl">📱</span>
              </div>
            </div>
            <h3 className="font-bold text-lg text-zinc-800">Scan QR to Activate Engine</h3>
            <img 
              src={qr} 
              alt="WhatsApp QR Code" 
              className="mx-auto w-64 h-64 border-2 border-zinc-200 p-2 bg-white rounded-lg shadow-lg" 
            />
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Open WhatsApp on your phone → Settings → Linked Devices → Link a device
            </p>
            <div className="text-xs text-zinc-400 mt-2">
              <span className="inline-block w-2 h-2 bg-amber-400 rounded-full animate-pulse mr-2"></span>
              Waiting for authentication...
            </div>
          </div>
        </Card>
      )}

      {status === 'DISCONNECTED' && !error && (
        <Card className="p-12 text-center border-2 border-dashed border-zinc-200 bg-white">
          <div className="space-y-4">
            <span className="text-4xl">📡</span>
            <h3 className="font-bold text-lg text-zinc-800">WhatsApp Bridge Disconnected</h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              The WhatsApp bridge is not connected. Click connect to start the session.
            </p>
            <Button 
              onClick={connectWhatsApp}
              className="mt-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                '📱 Connect WhatsApp'
              )}
            </Button>
          </div>
        </Card>
      )}

      {status === 'FAILED' && !error && (
        <Card className="p-12 text-center border-2 border-dashed border-red-200 bg-red-50">
          <div className="space-y-4">
            <span className="text-4xl">❌</span>
            <h3 className="font-bold text-lg text-red-800">Authentication Failed</h3>
            <p className="text-sm text-red-600 max-w-md mx-auto">
              Failed to authenticate with WhatsApp. Please try connecting again.
            </p>
            <Button 
              onClick={connectWhatsApp}
              className="mt-2 bg-red-600 hover:bg-red-700"
              disabled={isConnecting}
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Only show Dashboard if READY */}
      {status === 'READY' && (
        <div className="space-y-6">
          <Card className="p-6 border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <div>
                    <h3 className="font-bold text-lg text-emerald-700">Engine Active</h3>
                    <p className="text-sm text-emerald-600">
                      Bridge is connected and ready to send messages.
                    </p>
                    {messageCount > 0 && (
                      <p className="text-xs text-emerald-500 mt-1">
                        Total messages sent: {messageCount}
                      </p>
                    )}
                    {reportResult && (
                      <p className="text-xs text-emerald-500 mt-1">
                        📊 Last report sent: {new Date(reportResult.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={handleSend} 
                  disabled={sending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {sending ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                      Sending...
                    </>
                  ) : (
                    '📤 Send Test Message'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Report Sending Section */}
          {showReportSend && (
            <SendReport onSendComplete={(result) => {
              console.log('Report sent:', result);
              setReportResult(result);
              // Show success notification
              if (result.success) {
                const sentCount = result.result.messageResults.filter((r: any) => r.success).length;
                alert(`✅ Report sent successfully to ${sentCount} recipients!`);
              }
            }} />
          )}

          {/* Toggle between single and bulk send */}
          {!showReportSend && (showBulkSend ? (
            <BulkSend onSendComplete={(result) => {
              console.log('Bulk send completed:', result);
              setMessageCount(prev => prev + result.summary.successful);
            }} />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <Card className="p-6">
                  <h4 className="font-semibold mb-3">📋 Message Log</h4>
                  <div className="text-sm text-zinc-500 text-center py-8">
                    No messages sent yet. Use the "Send Test Message" button above.
                  </div>
                </Card>
              </div>
              <div>
                <Card className="p-6">
                  <h4 className="font-semibold mb-3">⏰ Scheduled Messages</h4>
                  <div className="text-sm text-zinc-500 text-center py-8">
                    No scheduled messages configured.
                  </div>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="p-4 bg-zinc-900 text-zinc-300 text-xs font-mono">
          <details>
            <summary className="cursor-pointer font-bold text-zinc-400">
              🔧 Debug Information
            </summary>
            <div className="mt-2 space-y-1">
              <div>Status: <span className="text-white">{status}</span></div>
              <div>QR Code: <span className="text-white">{qr ? 'Present' : 'Not available'}</span></div>
              <div>Error: <span className="text-red-400">{error || 'None'}</span></div>
              <div>Retry Count: <span className="text-white">{retryCount}</span></div>
              <div>Polling: <span className="text-white">{isPolling ? 'Active' : 'Stopped'}</span></div>
              <div>Message Count: <span className="text-white">{messageCount}</span></div>
              <div>Report Sent: <span className="text-white">{reportResult ? 'Yes' : 'No'}</span></div>
              <div>Last Checked: <span className="text-white">{lastChecked?.toLocaleString() || 'Never'}</span></div>
            </div>
          </details>
        </Card>
      )}
    </div>
    </RequireRole>
  );
}