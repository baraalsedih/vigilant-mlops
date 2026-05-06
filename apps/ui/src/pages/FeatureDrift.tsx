import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { fetchDrift } from '../api';
import type { FeatureDriftResult, DriftStatus } from '../api/types';

type SortKey = 'feature' | 'statistic' | 'pvalue' | 'status';

const statusConfig: Record<DriftStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  ok: { label: 'Stable', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  warning: { label: 'Warning', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  critical: { label: 'Critical', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
};

const statusOrder: Record<DriftStatus, number> = { ok: 0, warning: 1, critical: 2 };

function methodType(method: string) {
  if (method.includes('chi2')) return 'categorical';
  return 'numeric';
}

function PsiBar({ value }: { value: number }) {
  const pct = Math.min(value / 0.5, 1) * 100;
  const color = value >= 0.2 ? '#f87171' : value >= 0.1 ? '#fbbf24' : '#34d399';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-xs text-gray-300 tabular-nums">{value.toFixed(4)}</span>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown size={12} className="text-gray-600" />;
  return dir === 'asc' ? <ArrowUp size={12} className="text-blue-400" /> : <ArrowDown size={12} className="text-blue-400" />;
}

export default function FeatureDrift() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DriftStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('statistic');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: drift, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['drift'],
    queryFn: fetchDrift,
    staleTime: 5 * 60_000,
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const features = drift?.features ?? [];

  const filtered = features
    .filter((f) => f.feature.toLowerCase().includes(search.toLowerCase()))
    .filter((f) => filter === 'all' || f.status === filter)
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'feature') cmp = a.feature.localeCompare(b.feature);
      else if (sortKey === 'statistic') cmp = a.statistic - b.statistic;
      else if (sortKey === 'pvalue') cmp = (a.pvalue ?? 1) - (b.pvalue ?? 1);
      else if (sortKey === 'status') cmp = statusOrder[a.status] - statusOrder[b.status];
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const counts = { all: features.length, ok: 0, warning: 0, critical: 0 };
  features.forEach((f) => counts[f.status]++);

  const headerCls =
    'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors select-none';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Feature Drift</h1>
          <p className="text-sm text-gray-500 mt-0.5">Running drift analysis against reference distribution…</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={32} className="animate-spin text-blue-400" />
          <p className="text-sm text-gray-400">Computing PSI statistics — this may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-100">Feature Drift</h1>
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-gray-300 font-medium">Drift analysis failed</p>
          <p className="text-sm text-gray-500 max-w-sm">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:border-gray-500 transition-colors"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Feature Drift</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            PSI &amp; statistical tests vs. reference distribution
            {drift && (
              <span className="ml-2 text-xs text-gray-600">
                · {drift.n_accumulated.toLocaleString()} records · drift rate{' '}
                {(drift.drift_rate * 100).toFixed(1)}%
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} /> refresh
        </button>
      </div>

      {/* Summary filter cards */}
      <div className="grid grid-cols-4 gap-4">
        {(['all', 'critical', 'warning', 'ok'] as const).map((s) => {
          const sc = s !== 'all' ? statusConfig[s] : null;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-left px-4 py-3 rounded-xl border transition-all ${
                filter === s
                  ? s === 'all'
                    ? 'bg-blue-600/15 border-blue-600/30 text-blue-400'
                    : `${sc!.bg} ${sc!.border} ${sc!.text}`
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
              }`}
            >
              <p className="text-lg font-bold">{counts[s]}</p>
              <p className="text-xs capitalize mt-0.5">
                {s === 'all' ? 'Total Features' : s === 'ok' ? 'Stable' : s}
              </p>
            </button>
          );
        })}
      </div>

      {/* Overall status banner */}
      {drift && (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${statusConfig[drift.overall_status].bg} ${statusConfig[drift.overall_status].border}`}>
          <span className={`w-2 h-2 rounded-full ${statusConfig[drift.overall_status].dot}`} />
          <span className={`text-sm font-medium ${statusConfig[drift.overall_status].text}`}>
            Overall: {drift.overall_status.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            {drift.n_drifted} of {drift.n_features_checked} features drifted
          </span>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search features…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <span className="text-xs text-gray-600">{filtered.length} of {features.length} features</span>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className={headerCls} onClick={() => toggleSort('feature')}>
                  <span className="flex items-center gap-1.5">Feature <SortIcon active={sortKey === 'feature'} dir={sortDir} /></span>
                </th>
                <th className={`${headerCls} hidden md:table-cell`}>Type</th>
                <th className={headerCls} onClick={() => toggleSort('statistic')}>
                  <span className="flex items-center gap-1.5">PSI Score <SortIcon active={sortKey === 'statistic'} dir={sortDir} /></span>
                </th>
                <th className={`${headerCls} hidden lg:table-cell`} onClick={() => toggleSort('pvalue')}>
                  <span className="flex items-center gap-1.5">p-value <SortIcon active={sortKey === 'pvalue'} dir={sortDir} /></span>
                </th>
                <th className={`${headerCls} hidden md:table-cell`}>Method</th>
                <th className={headerCls} onClick={() => toggleSort('status')}>
                  <span className="flex items-center gap-1.5">Status <SortIcon active={sortKey === 'status'} dir={sortDir} /></span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filtered.map((row: FeatureDriftResult) => {
                const sc = statusConfig[row.status];
                const type = methodType(row.method);
                return (
                  <tr key={row.feature} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-200 group-hover:text-white transition-colors">
                        {row.feature}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${
                        type === 'numeric'
                          ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                          : 'text-violet-400 bg-violet-500/10 border-violet-500/20'
                      }`}>
                        {type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PsiBar value={row.statistic} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {row.pvalue != null ? (
                        <span className={`font-mono text-xs tabular-nums ${row.pvalue < 0.05 ? 'text-red-400' : 'text-gray-400'}`}>
                          {row.pvalue < 0.0001 ? '< 0.0001' : row.pvalue.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs text-gray-600">{row.method}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${sc.bg} ${sc.text} ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">No features match your filter.</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 text-xs text-gray-600">
        <span><span className="text-emerald-500 font-semibold">Green</span> = PSI &lt; 0.10 (stable)</span>
        <span><span className="text-amber-500 font-semibold">Yellow</span> = 0.10 ≤ PSI &lt; 0.20 (moderate drift)</span>
        <span><span className="text-red-500 font-semibold">Red</span> = PSI ≥ 0.20 (significant drift)</span>
        <span className="text-gray-700">p-value &lt; 0.05 = statistically significant</span>
      </div>
    </div>
  );
}
