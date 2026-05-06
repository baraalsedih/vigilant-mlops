import { ChevronDown, Bell, Clock, Cpu } from 'lucide-react';
import { useState } from 'react';

const timeWindows = ['Last 1h', 'Last 6h', 'Last 24h', 'Last 7d', 'Last 30d'];
const modelVersions = ['v3.2.1 (prod)', 'v3.1.8', 'v3.0.5', 'v2.9.0 (legacy)'];

function Dropdown({
  icon: Icon,
  label,
  options,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:border-gray-600 hover:text-white transition-colors"
      >
        <Icon size={13} className="text-gray-500" />
        <span className="text-gray-500 text-xs mr-0.5">{label}:</span>
        <span>{value}</span>
        <ChevronDown size={13} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 right-0 w-44 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                opt === value ? 'text-blue-400 bg-blue-600/10' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header({
  timeWindow,
  setTimeWindow,
  modelVersion,
  setModelVersion,
}: {
  timeWindow: string;
  setTimeWindow: (v: string) => void;
  modelVersion: string;
  setModelVersion: (v: string) => void;
}) {
  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-widest">Filters</span>
      </div>
      <div className="flex items-center gap-3">
        <Dropdown
          icon={Clock}
          label="Window"
          options={timeWindows}
          value={timeWindow}
          onChange={setTimeWindow}
        />
        <Dropdown
          icon={Cpu}
          label="Model"
          options={modelVersions}
          value={modelVersion}
          onChange={setModelVersion}
        />
        <button className="relative p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
