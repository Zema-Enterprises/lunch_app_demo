import React from 'react';
import { useNotificationAnalytics } from '@/lib/api/hooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, BarChart3, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const channelLabelMap: Record<string, string> = {
  REALTIME: 'Realtime',
  PUSH: 'Push',
  EMAIL: 'Email',
};

export const NotificationAnalyticsPanel: React.FC = () => {
  const { data, isLoading, isError } = useNotificationAnalytics();
  const [selectedChannel, setSelectedChannel] = useState<'ALL' | string>('ALL');

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Notification Analytics</CardTitle>
          <CardDescription>Loading delivery metrics…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="w-5 h-5" />
            Notification Analytics
          </CardTitle>
          <CardDescription className="text-red-700">
            Failed to load delivery metrics. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pushMetrics = data.delivery.PUSH ?? {};
  const totalPush = (pushMetrics.SUCCESS ?? 0) + (pushMetrics.FAILED ?? 0) + (pushMetrics.RETRYING ?? 0);
  const pushSuccessRate = totalPush > 0 ? Math.round(((pushMetrics.SUCCESS ?? 0) / totalPush) * 100) : null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-600" />
          Notification Analytics
        </CardTitle>
        <CardDescription>
          Company-wide delivery metrics for the past day. Use this panel to monitor realtime and push reliability.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <p className="text-xs uppercase tracking-wide text-slate-500">Unread</p>
            <p className="text-2xl font-semibold text-slate-900">{data.totals.unread}</p>
            <p className="text-xs text-slate-500">Alerts awaiting user attention</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Notifications</p>
            <p className="text-2xl font-semibold text-slate-900">{data.totals.notifications}</p>
            <p className="text-xs text-slate-500">Delivered in the current analytics window</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <p className="text-xs uppercase tracking-wide text-slate-500">Push Success Rate</p>
            <p className="text-2xl font-semibold text-slate-900">
              {pushSuccessRate !== null ? `${pushSuccessRate}%` : '—'}
            </p>
            <p className="text-xs text-slate-500">
              {(pushMetrics.SUCCESS ?? 0)} successes / {(pushMetrics.FAILED ?? 0)} failures
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Delivery Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-3 py-1 rounded-full ${
                  selectedChannel === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:text-white'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setSelectedChannel('ALL')}
              >
                All Channels
              </Button>
              {Object.keys(data.delivery).map((channel) => (
                <Button
                  key={channel}
                  variant="outline"
                  size="sm"
                  className={`text-xs px-3 py-1 rounded-full ${
                    selectedChannel === channel
                      ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:text-white'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedChannel(channel)}
                >
                  {channelLabelMap[channel] ?? channel}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(
              selectedChannel === 'ALL'
                ? (Object.entries(data.delivery) as Array<[string, Record<string, number>]> )
                : ([
                    [
                      selectedChannel,
                      data.delivery[selectedChannel] ?? ({} as Record<string, number>),
                    ],
                  ] as Array<[string, Record<string, number>]> )
            ).map(([channel, normalizedStats]) => {
              const total = Object.values(normalizedStats).reduce((acc, curr) => acc + curr, 0);
              return (
                <div
                  key={channel}
                  data-testid={`channel-card-${channel.toLowerCase()}`}
                  className="rounded-md border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-900">{channelLabelMap[channel] ?? channel}</p>
                    <span className="text-xs text-slate-500">{total} total</span>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    {Object.entries(normalizedStats).map(([status, count]) => (
                      <div key={status} className="flex justify-between">
                        <span className="uppercase tracking-wide text-xs">
                          {status.toLowerCase()}
                        </span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {pushSuccessRate !== null && pushSuccessRate < 95 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            Push delivery success has dropped below the 95% threshold. Check subscription health and server logs.
          </div>
        )}

        {pushSuccessRate !== null && pushSuccessRate >= 95 && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            Push delivery is operating within SLA. Continue monitoring Honeycomb dashboards for latency spikes.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationAnalyticsPanel;
