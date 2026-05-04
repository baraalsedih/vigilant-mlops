import { useState } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Status = 'healthy' | 'warning' | 'critical';
type SortKey = 'feature' | 'psi' | 'kl' | 'ks' | 'wasserstein' | 'samples' | 'status';

interface FeatureRow {
  feature: string;
  type: 'numeric' | 'categorical';
  psi: number;
  kl: number;
  ks: number;
  wasserstein: number;
  samples: number;
  status: Status;
  trend: 'up' | 'down' | 'stable';
}

const rawFeatures: FeatureRow[] = [
  { feature: 'age_bucket', type: 'categorical', psi: 0.34, kl: 0.28, ks: 0.21, wasserstein: 0.15, samples: 12847, status: 'critical', trend: 'up' },
  { feature: 'income_normalized', type: 'numeric', psi: 0.18, kl: 0.14, ks: 0.12, wasserstein: 0.09, samples: 12847, status: 'warning', trend: 'up' },
  { feature: 'credit_score', type: 'numeric', psi: 0.04, kl: 0.03, ks: 0.04, wasserstein: 0.02, samples: 12831, status: 'healthy', trend: 'stable' },
  { feature: 'loan_amount', type: 'numeric', psi: 0.12, kl: 0.10, ks: 0.09, wasserstein: 0.07, samples: 12847, status: 'warning', trend: 'up' },
  { feature: 'employment_type', type: 'categorical', psi: 0.41, kl: 0.35, ks: 0.29, wasserstein: 0.22, samples: 12847, status: 'critical', trend: 'up' },
  { feature: 'debt_ratio', type: 'numeric', psi: 0.21, kl: 0.17, ks: 0.15, wasserstein: 0.11, samples: 12840, status: 'warning', trend: 'down' },
  { feature: 'num_credit_lines', type: 'numeric', psi: 0.07, kl: 0.05, ks: 0.06, wasserstein: 0.04, samples: 12847, status: 'healthy', trend: 'stable' },
  { feature: 'payment_history', type: 'numeric', psi: 0.03, kl: 0.02, ks: 0.03, wasserstein: 0.01, samples: 12844, status: 'healthy', trend: 'stable' },
  { feature: 'collateral_value', type: 'numeric', psi: 0.09, kl: 0.08, ks: 0.07, wasserstein: 0.05, samples: 12847, status: 'healthy', trend: 'down' },
  { feature: 'region_code', type: 'categorical', psi: 0.25, kl: 0.22, ks: 0.18, wasserstein: 0.14, samples: 12847, status: 'warning', trend: 'up' },
  { feature: 'loan_purpose', type: 'categorical', psi: 0.06, kl: 0.05, ks: 0.04, wasserstein: 0.03, samples: 12847, status: 'healthy', trend: 'stable' },
  { feature: 'account_age_months', type: 'numeric', psi: 0.02, kl: 0.01, ks: 0.02, wasserstein: 0.01, samples: 12839, status: 'healthy', trend: 'stable' },
  { feature: 'last_delinquency_days', type: 'numeric', psi: 0.38, kl: 0.31, ks: 0.25, wasserstein: 0.19, samples: 12847, status: 'critical', trend: 'up' },
  { feature: 'interest_rate', type: 'numeric', psi: 0.11, kl: 0.09, ks: 0.08, wasserstein: 0.06, samples: 12847, status: 'warning', trend: 'stable' },
  { feature: 'bank_balance_log', type: 'numeric', psi: 0.05, kl: 0.04, ks: 0.03, wasserstein: 0.02, samples: 12847, status: 'healthy', trend: 'stable' },
  { feature: 'zip_code_cluster', type: 'categorical', psi: 0.16, kl: 0.13, ks: 0.11, wasserstein: 0.08, samples: 12845, status: 'warning', trend: 'up' },
];

const statusConfig = {
  healthy: { label: 'Healthy', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  warning: { label: 'Warning', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  critical: { label: 'Critical', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
};

function PsiBar({ value }: { value: number }) {
  const pct = Math.min(value / 0.5, 1) * 100;
  const color = value >= 0.3 ? '#f87171' : value >= 0.1 ? '#fbbf24' : '#34d399';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-xs text-gray-300 tabular-nums">{value.toFixed(3)}</span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp size={13} className="text-red-400" />;
  if (trend === 'down') return <TrendingDown size={13} className="text-emerald-400" />;
  return <Minus size={13} className="text-gray-600" />;
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown size={12} className="text-gray-600" />;
  return dir === 'asc' ? <ArrowUp size={12} className="text-blue-400" /> : <ArrowDown size={12} className="text-blue-400" />;
}

export default function FeatureDrift() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('psi');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = rawFeatures
    .filter((f) => f.feature.toLowerCase().includes(search.toLowerCase()))
    .filter((f) => filter === 'all' || f.status === filter)
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const counts = { all: rawFeatures.length, critical: 0, warning: 0, healthy: 0 };
  rawFeatures.forEach((f) => counts[f.status]++);

  const headerCls = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors select-none';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Feature Drift</h1>
        <p className="text-sm text-gray-500 mt-0.5">Population Stability Index and distributional shift metrics</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {(['all', 'critical', 'warning', 'healthy'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-left px-4 py-3 rounded-xl border transition-all ${
              filter === s
                ? s === 'all'
                  ? 'bg-blue-600/15 border-blue-600/30 text-blue-400'
                  : `${statusConfig[s].bg} ${statusConfig[s].border} ${statusConfig[s].text}`
                : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
            }`}
          >
            <p className="text-lg font-bold">{counts[s]}</p>
            <p className="text-xs capitalize mt-0.5">{s === 'all' ? 'Total Features' : s}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search features..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <span className="text-xs text-gray-600">{filtered.length} of {rawFeatures.length} features</span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-800">
              <tr>
                <th className={headerCls} onClick={() => toggleSort('feature')}>
                  <span className="flex items-center gap-1.5">Feature <SortIcon active={sortKey === 'feature'} dir={sortDir} /></span>
                </th>
                <th className={`${headerCls} hidden md:table-cell`}>Type</th>
                <th className={headerCls} onClick={() => toggleSort('psi')}>
                  <span className="flex items-center gap-1.5">PSI Score <SortIcon active={sortKey === 'psi'} dir={sortDir} /></span>
                </th>
                <th className={`${headerCls} hidden lg:table-cell`} onClick={() => toggleSort('kl')}>
                  <span className="flex items-center gap-1.5">KL Div <SortIcon active={sortKey === 'kl'} dir={sortDir} /></span>
                </th>
                <th className={`${headerCls} hidden lg:table-cell`} onClick={() => toggleSort('ks')}>
                  <span className="flex items-center gap-1.5">KS Stat <SortIcon active={sortKey === 'ks'} dir={sortDir} /></span>
                </th>
                <th className={`${headerCls} hidden xl:table-cell`} onClick={() => toggleSort('samples')}>
                  <span className="flex items-center gap-1.5">Samples <SortIcon active={sortKey === 'samples'} dir={sortDir} /></span>
                </th>
                <th className={headerCls} onClick={() => toggleSort('status')}>
                  <span className="flex items-center gap-1.5">Status <SortIcon active={sortKey === 'status'} dir={sortDir} /></span>
                </th>
                <th className={`${headerCls} hidden md:table-cell`}>Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filtered.map((row) => {
                const sc = statusConfig[row.status];
                return (
                  <tr key={row.feature} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-200 group-hover:text-white transition-colors">{row.feature}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${
                        row.type === 'numeric'
                          ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                          : 'text-violet-400 bg-violet-500/10 border-violet-500/20'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PsiBar value={row.psi} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="font-mono text-xs text-gray-400 tabular-nums">{row.kl.toFixed(3)}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="font-mono text-xs text-gray-400 tabular-nums">{row.ks.toFixed(3)}</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="font-mono text-xs text-gray-400 tabular-nums">{row.samples.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${sc.bg} ${sc.text} ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <TrendIcon trend={row.trend} />
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
        <span><span className="text-amber-500 font-semibold">Yellow</span> = 0.10 ≤ PSI &lt; 0.30 (moderate drift)</span>
        <span><span className="text-red-500 font-semibold">Red</span> = PSI ≥ 0.30 (significant drift)</span>
      </div>
    </div>
  );
}
