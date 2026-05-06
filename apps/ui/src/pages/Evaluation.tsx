import { useQuery } from '@tanstack/react-query';
import { useFilters } from '../context/FiltersContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, Legend,
} from 'recharts';
import { TrendingUp, Award, Target, Layers, AlertCircle, Loader2 } from 'lucide-react';
import { fetchReportHistory } from '../api';
import type { ReportRecord } from '../api/types';

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#e5e7eb',
  },
};

function parseClassReport(report: string) {
  const rows: { label: string; precision: number; recall: number; f1: number; support: number }[] = [];
  for (const line of report.split('\n')) {
    const m = line.match(/^\s*(\S+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s*$/);
    if (!m) continue;
    const skip = ['accuracy', 'macro', 'weighted'];
    if (skip.some((s) => m[1].startsWith(s))) continue;
    rows.push({
      label: m[1] === '0' ? 'Benign (0)' : m[1] === '1' ? 'Malicious (1)' : m[1],
      precision: parseFloat(m[2]),
      recall: parseFloat(m[3]),
      f1: parseFloat(m[4]),
      support: parseInt(m[5]),
    });
  }
  return rows;
}

const cmColors = [
  ['#14532d', '#7f1d1d'],
  ['#7f1d1d', '#1e3a5f'],
];
const cmLabels = ['Benign', 'Malicious'];

function MetricBadge({
  label, value, icon: Icon, color,
}: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-gray-100 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl h-72" />
        <div className="bg-gray-900 border border-gray-800 rounded-xl h-72" />
      </div>
    </div>
  );
}

export default function Evaluation() {
  const { modelVersion } = useFilters();

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReportHistory,
  });

  const preProdReports = (reports ?? []).filter(
    (r: ReportRecord) =>
      r.report_type === 'PRE_PROD' && (!modelVersion || r.model_version === modelVersion)
  );
  const latest = preProdReports[0];
  const metrics = latest?.metrics;
  const artifacts = latest?.artifacts;

  const fmtPct = (v?: number | null) => (v != null ? `${(v * 100).toFixed(1)}%` : '—');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Model Evaluation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Loading evaluation report…</p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-gray-300 font-medium">Failed to load evaluation data</p>
        <p className="text-sm text-gray-500">{(error as Error).message}</p>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <Loader2 size={32} className="text-gray-600" />
        <p className="text-gray-400">No evaluation report found.</p>
        <p className="text-sm text-gray-600">
          Trigger one via <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">POST /api/v1/reporter/evaluate-model</code>
        </p>
      </div>
    );
  }

  const classRows = artifacts?.classification_report
    ? parseClassReport(artifacts.classification_report)
    : [];

  const radarData = [
    { metric: 'Accuracy', value: (metrics?.accuracy ?? 0) * 100 },
    { metric: 'Precision', value: (metrics?.precision ?? 0) * 100 },
    { metric: 'Recall', value: (metrics?.recall ?? 0) * 100 },
    { metric: 'F1-Score', value: (metrics?.f1 ?? 0) * 100 },
    { metric: 'ROC-AUC', value: (metrics?.roc_auc ?? 0) * 100 },
    { metric: 'Avg Precision', value: (metrics?.avg_precision ?? 0) * 100 },
  ];

  const trendData = preProdReports
    .slice()
    .reverse()
    .map((r: ReportRecord, i: number) => ({
      run: `Run ${i + 1}`,
      accuracy: r.metrics?.accuracy ?? null,
      precision: r.metrics?.precision ?? null,
      recall: r.metrics?.recall ?? null,
    }));

  const cm = artifacts?.confusion_matrix;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Model Evaluation</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Classification report — best_model
            {latest.model_version && (
              <span className="ml-2 text-xs text-blue-400 font-mono">{latest.model_version}</span>
            )}
          </p>
        </div>
        <span className="text-xs text-gray-600">
          {new Date(latest.timestamp).toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricBadge label="Accuracy" value={fmtPct(metrics?.accuracy)} icon={Award} color="bg-blue-600/15 text-blue-400" />
        <MetricBadge label="Precision" value={fmtPct(metrics?.precision)} icon={Target} color="bg-emerald-600/15 text-emerald-400" />
        <MetricBadge label="Recall" value={fmtPct(metrics?.recall)} icon={TrendingUp} color="bg-amber-600/15 text-amber-400" />
        <MetricBadge label="F1-Score" value={fmtPct(metrics?.f1)} icon={Layers} color="bg-cyan-600/15 text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Per-class bar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Per-Class Metrics</h2>
          {classRows.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classRows} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${((v as number) * 100).toFixed(1)}%`]} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                  <Bar dataKey="precision" name="Precision" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="recall" name="Recall" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="f1" name="F1" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-600 py-8 text-center">No per-class data available.</p>
          )}
        </div>

        {/* Radar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Model Performance Radar</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1f2937" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={1.5} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${(v as number).toFixed(1)}%`]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend over evaluation runs */}
      {trendData.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">
            Metric Trend ({trendData.length} evaluation runs)
          </h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="run" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis domain={[0.8, 1]} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${((v as number) * 100).toFixed(1)}%`]} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="precision" name="Precision" stroke="#10b981" strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="recall" name="Recall" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Confusion matrix */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Confusion Matrix</h2>
          {cm ? (
            <>
              <div className="space-y-1.5">
                {cm.map((row, ri) => (
                  <div key={ri} className="flex gap-1.5">
                    {row.map((val, ci) => (
                      <div
                        key={ci}
                        className="flex-1 rounded-md flex flex-col items-center justify-center py-4 text-white"
                        style={{ backgroundColor: cmColors[ri]?.[ci] ?? '#1f2937' }}
                      >
                        <span className="text-sm font-mono font-bold">{val.toLocaleString()}</span>
                        <span className="text-xs opacity-60 mt-0.5">
                          {ri === ci ? (ri === 0 ? 'TN' : 'TP') : ri === 0 ? 'FP' : 'FN'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-2">
                {cmLabels.slice(0, cm[0]?.length ?? 0).map((l) => (
                  <div key={l} className="flex-1 text-center text-xs text-gray-600">Pred: {l}</div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">Rows = Actual, Columns = Predicted</p>
            </>
          ) : (
            <p className="text-sm text-gray-600 py-8 text-center">No confusion matrix available.</p>
          )}
        </div>

        {/* Classification report table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Classification Report</h2>
          {classRows.length > 0 ? (
            <div className="space-y-0.5">
              <div className="grid grid-cols-5 gap-2 text-xs text-gray-500 font-medium uppercase px-2 mb-2">
                <span className="col-span-2">Class</span>
                <span className="text-right">Prec.</span>
                <span className="text-right">Recall</span>
                <span className="text-right">F1</span>
              </div>
              {classRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-5 gap-2 text-xs px-2 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <span className="col-span-2 text-gray-300 font-medium">{row.label}</span>
                  <span className="text-right text-gray-400 font-mono">{fmtPct(row.precision)}</span>
                  <span className="text-right text-gray-400 font-mono">{fmtPct(row.recall)}</span>
                  <span className="text-right text-gray-400 font-mono">{fmtPct(row.f1)}</span>
                </div>
              ))}
              <div className="grid grid-cols-5 gap-2 text-xs px-2 py-2 border-t border-gray-800 mt-1">
                <span className="col-span-2 text-gray-500 font-medium">Overall</span>
                <span className="text-right text-blue-400 font-mono font-semibold">{fmtPct(metrics?.precision)}</span>
                <span className="text-right text-emerald-400 font-mono font-semibold">{fmtPct(metrics?.recall)}</span>
                <span className="text-right text-amber-400 font-mono font-semibold">{fmtPct(metrics?.f1)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 py-8 text-center">No classification report available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
