import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, Legend,
} from 'recharts';
import { TrendingUp, Award, Target, Layers } from 'lucide-react';

const classMetrics = [
  { class: 'Low Risk', precision: 0.96, recall: 0.94, f1: 0.95, support: 1842 },
  { class: 'Med Risk', precision: 0.88, recall: 0.91, f1: 0.89, support: 743 },
  { class: 'High Risk', precision: 0.83, recall: 0.79, f1: 0.81, support: 412 },
  { class: 'Very High', precision: 0.71, recall: 0.68, f1: 0.69, support: 203 },
];

const confusionColors = [
  ['#1e3a5f', '#1e4d8c', '#1a5cad', '#1d4ed8'],
  ['#14532d', '#166534', '#15803d', '#16a34a'],
  ['#422006', '#713f12', '#92400e', '#b45309'],
  ['#450a0a', '#7f1d1d', '#991b1b', '#b91c1c'],
];

const confusionMatrix = [
  [1731, 89, 18, 4],
  [52, 676, 13, 2],
  [14, 22, 325, 51],
  [6, 8, 53, 136],
];

const trendData = Array.from({ length: 14 }, (_, i) => ({
  day: `D-${13 - i}`,
  accuracy: parseFloat((0.94 + (Math.random() - 0.5) * 0.03).toFixed(3)),
  precision: parseFloat((0.89 + (Math.random() - 0.5) * 0.04).toFixed(3)),
  recall: parseFloat((0.86 + (Math.random() - 0.5) * 0.04).toFixed(3)),
}));

const radarData = [
  { metric: 'Accuracy', value: 94.7 },
  { metric: 'Precision', value: 89.3 },
  { metric: 'Recall', value: 86.1 },
  { metric: 'F1-Score', value: 87.7 },
  { metric: 'ROC-AUC', value: 97.2 },
  { metric: 'Log Loss', value: 72.4 },
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#e5e7eb',
  },
};

function MetricBadge({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
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

export default function Evaluation() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Model Evaluation</h1>
        <p className="text-sm text-gray-500 mt-0.5">Classification report and performance breakdown</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricBadge label="Accuracy" value="94.7%" icon={Award} color="bg-blue-600/15 text-blue-400" />
        <MetricBadge label="Precision" value="89.3%" icon={Target} color="bg-emerald-600/15 text-emerald-400" />
        <MetricBadge label="Recall" value="86.1%" icon={TrendingUp} color="bg-amber-600/15 text-amber-400" />
        <MetricBadge label="F1-Score" value="87.7%" icon={Layers} color="bg-cyan-600/15 text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Per-Class Metrics</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classMetrics} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="class" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis domain={[0.5, 1]} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`]} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                <Bar dataKey="precision" name="Precision" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="recall" name="Recall" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="f1" name="F1" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Model Performance Radar</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1f2937" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={1.5} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-300 mb-4">Metric Trends (14-Day Window)</h2>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis domain={[0.8, 1]} tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`]} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
              <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="precision" name="Precision" stroke="#10b981" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="recall" name="Recall" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Confusion Matrix</h2>
          <div className="space-y-1.5">
            {confusionMatrix.map((row, ri) => (
              <div key={ri} className="flex gap-1.5">
                {row.map((val, ci) => (
                  <div
                    key={ci}
                    className="flex-1 rounded-md flex items-center justify-center py-3 text-xs font-mono font-semibold text-white"
                    style={{ backgroundColor: confusionColors[ri][ci] }}
                  >
                    {val}
                  </div>
                ))}
              </div>
            ))}
            <div className="flex gap-1.5 mt-1">
              {['Low', 'Med', 'High', 'V.High'].map((l) => (
                <div key={l} className="flex-1 text-center text-xs text-gray-600">{l}</div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Predicted (columns) vs Actual (rows)</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Classification Report</h2>
          <div className="space-y-0.5">
            <div className="grid grid-cols-5 gap-2 text-xs text-gray-500 font-medium uppercase px-2 mb-2">
              <span className="col-span-2">Class</span>
              <span className="text-right">Prec.</span>
              <span className="text-right">Recall</span>
              <span className="text-right">F1</span>
            </div>
            {classMetrics.map((row) => (
              <div key={row.class} className="grid grid-cols-5 gap-2 text-xs px-2 py-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                <span className="col-span-2 text-gray-300 font-medium">{row.class}</span>
                <span className="text-right text-gray-400 font-mono">{(row.precision * 100).toFixed(1)}%</span>
                <span className="text-right text-gray-400 font-mono">{(row.recall * 100).toFixed(1)}%</span>
                <span className="text-right text-gray-400 font-mono">{(row.f1 * 100).toFixed(1)}%</span>
              </div>
            ))}
            <div className="grid grid-cols-5 gap-2 text-xs px-2 py-2 border-t border-gray-800 mt-1">
              <span className="col-span-2 text-gray-500 font-medium">Weighted Avg</span>
              <span className="text-right text-blue-400 font-mono font-semibold">89.3%</span>
              <span className="text-right text-emerald-400 font-mono font-semibold">86.1%</span>
              <span className="text-right text-amber-400 font-mono font-semibold">87.7%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
