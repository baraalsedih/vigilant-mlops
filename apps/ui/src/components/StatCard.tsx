import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  status?: 'healthy' | 'warning' | 'critical';
}

export default function StatCard({ label, value, delta, deltaLabel, status = 'healthy' }: StatCardProps) {
  const statusColors = {
    healthy: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-red-400',
  };

  const DeltaIcon = delta === undefined ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const deltaColor = delta === undefined ? 'text-gray-500' : delta > 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">{label}</p>
      <p className={`text-2xl font-bold ${statusColors[status]}`}>{value}</p>
      {(delta !== undefined || deltaLabel) && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${deltaColor}`}>
          <DeltaIcon size={12} />
          <span>{delta !== undefined ? `${Math.abs(delta)}%` : ''} {deltaLabel}</span>
        </div>
      )}
    </div>
  );
}
