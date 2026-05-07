import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, XCircle, Clock, Loader2, RefreshCw, X, Hash, Tag, FileText, Calendar } from 'lucide-react';
import { useFilters } from '../context/FiltersContext';
import StatCard from '../components/StatCard';
import { fetchIncidents, fetchReportHistory } from '../api';
import type { IncidentRecord } from '../api/types';

const timeWindowMs: Record<string, number> = {
  'Last 1h':  1 * 60 * 60 * 1000,
  'Last 6h':  6 * 60 * 60 * 1000,
  'Last 24h': 24 * 60 * 60 * 1000,
  'Last 7d':  7 * 24 * 60 * 60 * 1000,
  'Last 30d': 30 * 24 * 60 * 60 * 1000,
};

// ISO timestamps from the backend can have microseconds (6 decimal places).
// Standard JS Date only handles 3 (milliseconds), so we truncate before parsing.
// Returns Infinity for null/unparseable so they always pass the >= cutoff check.
function parseTs(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  const ms = Date.parse(iso.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(ms) ? Infinity : ms;
}

const severityMap: Record<string, 'critical' | 'warning' | 'healthy'> = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'healthy',
};

const severityConfig = {
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  healthy: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function extractFeature(description: string | null): string {
  if (!description) return 'unknown';
  const m = description.match(/[Ff]eature\s+'([^']+)'/);
  return m ? m[1] : description.slice(0, 30);
}

function extractPsi(description: string | null): number | null {
  if (!description) return null;
  const m = description.match(/PSI[=\s]+([\d.]+)/i);
  return m ? parseFloat(m[1]) : null;
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-800/60 animate-pulse">
          <div className="w-7 h-7 rounded-lg bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-800 rounded w-32" />
            <div className="h-2 bg-gray-800 rounded w-48" />
          </div>
          <div className="space-y-2 text-right">
            <div className="h-3 bg-gray-800 rounded w-16" />
            <div className="h-2 bg-gray-800 rounded w-12" />
          </div>
        </div>
      ))}
    </>
  );
}

function IncidentDetail({ incident, onClose }: { incident: IncidentRecord; onClose: () => void }) {
  const sev = severityMap[incident.severity] ?? 'healthy';
  const cfg = severityConfig[sev];
  const Icon = cfg.icon;
  const psi = extractPsi(incident.description);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-800 z-50 overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${cfg.bg}`}>
              <Icon size={14} className={cfg.color} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-100">Incident Detail</p>
              <p className={`text-xs font-medium ${cfg.color}`}>{incident.severity}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 space-y-5">
          {/* Status + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/60 rounded-xl p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
                {incident.status}
              </span>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Type</p>
              <p className="text-sm font-mono text-gray-300">{incident.incident_type}</p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="bg-gray-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={11} className="text-gray-500" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">Timestamp</p>
            </div>
            <p className="text-sm text-gray-300 font-mono">
              {new Date(incident.timestamp).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">{timeAgo(incident.timestamp)}</p>
          </div>

          {/* PSI if present */}
          {psi != null && (
            <div className="bg-gray-800/60 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag size={11} className="text-gray-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">PSI Score</p>
              </div>
              <p className={`text-lg font-mono font-bold ${psi >= 0.2 ? 'text-red-400' : psi >= 0.1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {psi.toFixed(4)}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {psi >= 0.2 ? 'Significant drift' : psi >= 0.1 ? 'Moderate drift' : 'Stable'}
              </p>
            </div>
          )}

          {/* Description */}
          <div className="bg-gray-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={11} className="text-gray-500" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">Description</p>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {incident.description ?? 'No description provided.'}
            </p>
          </div>

          {/* Incident ID */}
          <div className="bg-gray-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Hash size={11} className="text-gray-500" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">Incident ID</p>
            </div>
            <p className="text-xs font-mono text-gray-500 break-all">{incident.incident_id}</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Overview() {
  const { timeWindow, modelVersion } = useFilters();
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);

  const {
    data: incidents,
    isLoading: loadingIncidents,
    error: incidentsError,
    refetch: refetchIncidents,
  } = useQuery({ queryKey: ['incidents'], queryFn: fetchIncidents });

  const {
    data: reports,
    isLoading: loadingReports,
  } = useQuery({ queryKey: ['reports'], queryFn: fetchReportHistory });

  // Filter incidents by selected time window.
  // windowMs is always defined since timeWindow is constrained to known keys,
  // but fall back to 30 days so unknown values never produce -Infinity cutoff.
  const windowMs = timeWindowMs[timeWindow] ?? timeWindowMs['Last 30d'];
  const cutoff = Date.now() - windowMs;
  const visibleIncidents = (incidents ?? []).filter(
    (i) => parseTs(i.timestamp) >= cutoff
  );

  // Show metrics for the selected model version, falling back to latest PRE_PROD
  const latestPreProd =
    reports?.find((r) => r.report_type === 'PRE_PROD' && r.model_version === modelVersion) ??
    reports?.find((r) => r.report_type === 'PRE_PROD');
  const metrics = latestPreProd?.metrics;

  const criticalCount = visibleIncidents.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = visibleIncidents.filter((i) => i.severity === 'WARNING').length;

  const fmtPct = (v?: number) => (v != null ? `${(v * 100).toFixed(1)}%` : '—');

  return (
    <div className="space-y-6">
      {selectedIncident && (
        <IncidentDetail incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">System Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live monitoring — {modelVersion ? <span className="text-blue-400 font-mono">{modelVersion}</span> : 'all versions'}
            <span className="ml-2 text-gray-600">· {timeWindow}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {loadingIncidents ? (
            <Loader2 size={14} className="animate-spin text-gray-500" />
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-red-400">
                <XCircle size={14} /> {criticalCount} critical
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <AlertTriangle size={14} /> {warningCount} warnings
              </span>
            </>
          )}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Model Accuracy"
          value={loadingReports ? '…' : fmtPct(metrics?.accuracy)}
          status={metrics?.accuracy != null && metrics.accuracy >= 0.9 ? 'healthy' : 'warning'}
          deltaLabel="on test split"
        />
        <StatCard
          label="Critical Alerts"
          value={loadingIncidents ? '…' : String(criticalCount)}
          status={criticalCount > 0 ? 'critical' : 'healthy'}
          deltaLabel="open incidents"
        />
        <StatCard
          label="F1-Score"
          value={loadingReports ? '…' : fmtPct(metrics?.f1)}
          status={metrics?.f1 != null && metrics.f1 >= 0.85 ? 'healthy' : 'warning'}
          deltaLabel="weighted avg"
        />
        <StatCard
          label="ROC-AUC"
          value={loadingReports ? '…' : fmtPct(metrics?.roc_auc)}
          status={metrics?.roc_auc != null && metrics.roc_auc >= 0.9 ? 'healthy' : 'warning'}
          deltaLabel="binary classifier"
        />
      </div>

      {/* Model metrics row */}
      {!loadingReports && metrics && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Model Performance</h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: 'Precision', value: metrics.precision },
              { label: 'Recall', value: metrics.recall },
              { label: 'Avg Precision', value: metrics.avg_precision },
              { label: 'ROC-AUC', value: metrics.roc_auc },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-lg font-bold font-mono text-gray-100 mt-1">{fmtPct(value as number)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incidents / drift alerts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Recent Incidents
            <span className="ml-2 text-gray-600 normal-case font-normal">{visibleIncidents.length} in {timeWindow.toLowerCase()}</span>
          </h2>
          <button
            onClick={() => refetchIncidents()}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            <RefreshCw size={11} /> refresh
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loadingIncidents ? (
            <LoadingRows />
          ) : incidentsError ? (
            <div className="px-5 py-8 text-center text-sm text-red-400">
              Failed to load incidents — {(incidentsError as Error).message}
            </div>
          ) : visibleIncidents.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-600">
              No incidents in {timeWindow.toLowerCase()}.
            </div>
          ) : (
            visibleIncidents.slice(0, 10).map((alert: IncidentRecord, idx) => {
              const sev = severityMap[alert.severity] ?? 'healthy';
              const cfg = severityConfig[sev];
              const Icon = cfg.icon;
              const psi = extractPsi(alert.description);
              return (
                <div
                  key={alert.incident_id}
                  onClick={() => setSelectedIncident(alert)}
                  className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer ${
                    idx !== Math.min(visibleIncidents.length, 10) - 1 ? 'border-b border-gray-800/60' : ''
                  } hover:bg-gray-800/30 transition-colors`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-lg border ${cfg.bg}`}>
                    <Icon size={13} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200 font-mono">
                        {extractFeature(alert.description)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} font-medium`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-600 font-mono">{alert.incident_type}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {alert.description ?? 'No description'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {psi != null && (
                      <p className="text-sm font-mono text-gray-300">PSI {psi.toFixed(3)}</p>
                    )}
                    <p className="text-xs text-gray-600 flex items-center gap-1 justify-end mt-0.5">
                      <Clock size={10} /> {timeAgo(alert.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p className="text-xs text-gray-700 mt-2 text-right">Click any row for full details</p>
      </div>
    </div>
  );
}
