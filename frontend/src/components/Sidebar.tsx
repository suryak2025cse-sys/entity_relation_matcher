import React from 'react';
import {
  LayoutDashboard,
  Archive,
  Upload,
  CheckSquare,
  Binary,
  GitFork,
  Sliders,
  Sparkles,
  Zap,
  TableProperties,
  BarChart3,
  ShieldCheck,
  DownloadCloud,
  Cpu
} from 'lucide-react';

export type TabType = 
  | 'dashboard'
  | 'training-setup'
  | 'upload-data'
  | 'validation'
  | 'preprocessing'
  | 'candidates'
  | 'features'
  | 'model-mgmt'
  | 'matching'
  | 'results'
  | 'analytics'
  | 'output-validation'
  | 'download';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isModelTrained: boolean;
}

interface StepItem {
  id: TabType;
  label: string;
  stepNumber: string;
  icon: React.ComponentType<{ className?: string }>;
  isSpecial?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isModelTrained,
}) => {
  const steps: StepItem[] = [
    { id: 'dashboard', label: 'Dashboard', stepNumber: '1', icon: LayoutDashboard },
    { id: 'training-setup', label: 'Training Dataset Setup', stepNumber: '2', icon: Archive },
    { id: 'upload-data', label: 'Upload Data', stepNumber: '3', icon: Upload },
    { id: 'validation', label: 'Validate Data', stepNumber: '4', icon: CheckSquare },
    { id: 'preprocessing', label: 'Data Preprocessing', stepNumber: '5', icon: Binary },
    { id: 'candidates', label: 'Generate Candidates', stepNumber: '6', icon: GitFork },
    { id: 'features', label: 'Create Features', stepNumber: '7', icon: Sliders },
    { id: 'model-mgmt', label: 'Model Management', stepNumber: '8', icon: Cpu, isSpecial: true },
    { id: 'matching', label: 'Match Records', stepNumber: '9', icon: Zap },
    { id: 'results', label: 'Results Dashboard', stepNumber: '10', icon: TableProperties },
    { id: 'analytics', label: 'Analytics', stepNumber: '11', icon: BarChart3 },
    { id: 'output-validation', label: 'Validate Output', stepNumber: '12', icon: ShieldCheck },
    { id: 'download', label: 'Download Results', stepNumber: '13', icon: DownloadCloud },
  ];

  return (
    <aside className="w-72 glass-panel border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0 h-[calc(100vh-61px)] overflow-y-auto">
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
            Pipeline Workflow
          </span>
          <nav className="mt-2 space-y-1">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = currentTab === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectTab(s.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/20 font-semibold'
                      : s.isSpecial
                      ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : s.isSpecial
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                      }`}
                    >
                      {s.stepNumber}
                    </span>
                    <span className="truncate">{s.label}</span>
                  </div>
                  <Icon
                    className={`h-4 w-4 shrink-0 transition ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Model State Pill */}
      <div className="mt-6 pt-4 border-t border-slate-800/60 text-xs">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${isModelTrained ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 animate-pulse'}`} />
          <div className="overflow-hidden">
            <p className="text-[11px] font-semibold text-slate-200 truncate">
              {isModelTrained ? 'Reusable Model Active' : 'Model Training Required'}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {isModelTrained ? 'Never retrains on match' : 'Run training phase'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
