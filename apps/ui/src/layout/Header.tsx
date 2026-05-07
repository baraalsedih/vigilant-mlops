import { ChevronDown, Bell, Clock, Cpu, XCircle, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchReportHistory, fetchIncidents } from '../api';
import { useFilters, TIME_WINDOWS } from '../context/FiltersContext';
import type { IncidentRecord } from '../api/types';
import type { TimeWindow } from '../context/FiltersContext';

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
        <span className="max-w-[120px] truncate">{value}</span>
        <ChevronDown size={13} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 right-0 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors truncate ${
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

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const severityIcon: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  CRITICAL: { Icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  WARNING: { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  INFO: { Icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export default function Header() {
  const { timeWindow, setTimeWindow, modelVersion, setModelVersion } = useFilters();

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReportHistory,
    staleTime: 5 * 60_000,
  });

  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: fetchIncidents,
    staleTime: 60_000,
  });

  const versions = [
    ...new Set(
      (reports ?? [])
        .filter((r) => r.report_type === 'PRE_PROD')
        .map((r) => r.model_version)
        .filter((v): v is string => v != null)
    ),
  ];

  const versionsKey = versions.join(',');
  useEffect(() => {
    if (versions.length > 0 && !versions.includes(modelVersion)) {
      setModelVersion(versions[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionsKey]);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  const alerts = (incidents ?? []).filter(
    (i: IncidentRecord) => i.severity === 'CRITICAL' || i.severity === 'WARNING'
  );
  const badgeCount = alerts.length;

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-widest">Filters</span>
      </div>
      <div className="flex items-center gap-3">
        <Dropdown
          icon={Clock}
          label="Window"
          options={[...TIME_WINDOWS]}
          value={timeWindow}
          onChange={(v) => setTimeWindow(v as TimeWindow)}
        />
        <Dropdown
          icon={Cpu}
          label="Model"
          options={versions.length > 0 ? versions : ['loading…']}
          value={versions.includes(modelVersion) ? modelVersion : (versions[0] ?? 'loading…')}
          onChange={setModelVersion}
        />

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Activity size={11} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Model Healthy</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((p) => !p)}
            className="relative p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <Bell size={16} />
            {badgeCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold px-0.5 leading-none">
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute top-full mt-2 right-0 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <span className="text-sm font-medium text-gray-200">Alerts</span>
                <span className="text-xs text-gray-500">{badgeCount} active</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-800/60">
                {badgeCount === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-600">No active alerts</div>
                ) : (
                  alerts.slice(0, 20).map((alert: IncidentRecord) => {
                    const cfg = severityIcon[alert.severity] ?? severityIcon.INFO;
                    const Icon = cfg.Icon;
                    return (
                      <div
                        key={alert.incident_id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-800/30 transition-colors"
                      >
                        <div className={`mt-0.5 p-1 rounded-md ${cfg.bg} shrink-0`}>
                          <Icon size={12} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>
                              {alert.severity}
                            </span>
                            <span className="text-[10px] text-gray-600">{alert.incident_type}</span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                            {alert.description ?? 'No description'}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-1">{timeAgo(alert.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {badgeCount > 20 && (
                <div className="px-4 py-2 border-t border-gray-800 text-center text-xs text-gray-600">
                  +{badgeCount - 20} more — see Overview for full list
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
