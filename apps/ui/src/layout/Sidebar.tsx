import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Activity, Zap } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/evaluation', label: 'Model Evaluation', icon: BarChart3, end: false },
  { to: '/feature-drift', label: 'Feature Drift', icon: Activity, end: false },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-gray-950 border-r border-gray-800 flex flex-col z-20">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
          <Zap size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">Vigilant</p>
          <p className="text-gray-500 text-xs">MLOps Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-600/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}
                  strokeWidth={2}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-gray-500">Connected</span>
        </div>
      </div>
    </aside>
  );
}
