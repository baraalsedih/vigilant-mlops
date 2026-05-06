import { AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Sparkline from '../components/Sparkline';
import StatCard from '../components/StatCard';

function generateSparkData(base: number, variance: number, n = 24) {
  return Array.from({ length: n }, (_, i) => ({
    time: `${i}:00`,
    value: parseFloat((base + (Math.random() - 0.5) * variance).toFixed(2)),
  }));
}

const systemMetrics = [
  { label: 'Model Accuracy', currentValue: '94.7', unit: '%', status: 'healthy' as const, data: generateSparkData(94.7, 2) },
  { label: 'Prediction Latency', currentValue: '38', unit: 'ms', status: 'healthy' as const, data: generateSparkData(38, 12) },
  { label: 'Request Throughput', currentValue: '1,243', unit: '/min', status: 'warning' as const, data: generateSparkData(1243, 400) },
  { label: 'Error Rate', currentValue: '0.42', unit: '%', status: 'healthy' as const, data: generateSparkData(0.42, 0.3) },
  { label: 'PSI Score (Global)', currentValue: '0.18', unit: '', status: 'warning' as const, data: generateSparkData(0.18, 0.08) },
  { label: 'Data Freshness', currentValue: '2.1', unit: 'min', status: 'healthy' as const, data: generateSparkData(2.1, 0.8) },
];

const driftAlerts = [
  { id: 1, feature: 'age_bucket', severity: 'critical', psi: 0.34, time: '2m ago', message: 'PSI exceeded critical threshold (0.30)' },
  { id: 2, feature: 'income_normalized', severity: 'warning', psi: 0.18, time: '14m ago', message: 'PSI in warning zone (0.10–0.30)' },
  { id: 3, feature: 'loan_amount', severity: 'warning', psi: 0.12, time: '31m ago', message: 'Minor distributional shift detected' },
  { id: 4, feature: 'credit_score', severity: 'healthy', psi: 0.04, time: '1h ago', message: 'Feature distribution stable' },
  { id: 5, feature: 'employment_type', severity: 'critical', psi: 0.41, time: '2h ago', message: 'Significant categorical shift' },
  { id: 6, feature: 'debt_ratio', severity: 'warning', psi: 0.21, time: '3h ago', message: 'Moderate drift observed' },
];

const severityConfig = {
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  healthy: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
};

export default function Overview() {
  const criticalCount = driftAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = driftAlerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">System Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time monitoring across all active models</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-red-400">
            <XCircle size={14} /> {criticalCount} critical
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <AlertTriangle size={14} /> {warningCount} warnings
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Models" value="4" status="healthy" deltaLabel="all healthy" />
        <StatCard label="Critical Alerts" value={String(criticalCount)} status="critical" delta={-12} deltaLabel="vs yesterday" />
        <StatCard label="Avg Drift Score" value="0.12" status="warning" delta={8} deltaLabel="vs baseline" />
        <StatCard label="Data Pipeline" value="99.1%" status="healthy" deltaLabel="uptime (7d)" />
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">System Health Metrics</h2>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {systemMetrics.map((m) => (
            <Sparkline key={m.label} {...m} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Recent Drift Alerts</h2>
          <span className="text-xs text-gray-600">Sorted by recency</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {driftAlerts.map((alert, idx) => {
            const cfg = severityConfig[alert.severity as keyof typeof severityConfig];
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className={`flex items-center gap-4 px-5 py-3.5 ${idx !== driftAlerts.length - 1 ? 'border-b border-gray-800/60' : ''} hover:bg-gray-800/30 transition-colors`}
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg border ${cfg.bg}`}>
                  <Icon size={13} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200 font-mono">{alert.feature}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} font-medium`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{alert.message}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono text-gray-300">PSI {alert.psi.toFixed(2)}</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1 justify-end mt-0.5">
                    <Clock size={10} /> {alert.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
