import React from 'react';
import { 
  Layers, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  Database,
  Sun,
  Moon
} from 'lucide-react';
import { DashboardData } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  dashboardData: DashboardData | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenModelManagement: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  dashboardData,
  loading,
  onRefresh,
  onOpenModelManagement
}) => {
  const { theme, toggleTheme } = useTheme();
  const isTrained = dashboardData?.is_model_trained ?? false;
  const modelName = dashboardData?.model_name || 'None';
  const threshold = dashboardData?.threshold ?? 0.65;
  const f05 = dashboardData?.validation_f05;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-6 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-500 flex items-center justify-center shadow-md shadow-brand-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                EntiX
              </span>
              <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                Enterprise Entity Resolution
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fixed Training Dataset • Reusable Trained Model</p>
          </div>
        </div>
      </div>

      {/* Model & Dataset Status Bar */}
      <div className="flex items-center gap-3">
        {/* Active Dataset Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card border border-slate-700/60">
          <Database className={`h-4 w-4 ${dashboardData?.has_uploaded_files ? 'text-brand-400' : 'text-slate-400'}`} />
          <div className="text-left">
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider leading-none">
              Target Dataset
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {dashboardData?.has_uploaded_files 
                ? `Uploaded Files (${dashboardData.uploaded_files_count || 3})` 
                : 'Server Training/Test Set'}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenModelManagement}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg glass-card hover:bg-slate-800/60 border border-slate-700/60 transition group text-left"
        >
          <div className="h-7 w-7 rounded-md bg-slate-800 flex items-center justify-center group-hover:bg-brand-500/20 transition">
            <Cpu className={`h-4 w-4 ${isTrained ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {isTrained ? `Model: ${modelName}` : 'Model: Not Trained'}
              </span>
              {isTrained && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                  v1
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {isTrained ? (
                <>
                  <span>Thresh: <strong className="text-slate-700 dark:text-slate-200">{threshold}</strong></span>
                  {f05 !== undefined && (
                    <span>• F<sub>0.5</sub>: <strong className="text-emerald-600 dark:text-emerald-400">{(f05 * 100).toFixed(1)}%</strong></span>
                  )}
                </>
              ) : (
                <span className="text-amber-400">Setup required</span>
              )}
            </div>
          </div>
        </button>

        {/* Theme Switcher Toggle Button */}
        <button
          onClick={toggleTheme}
          className="h-9 px-2.5 rounded-lg glass-card flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-brand-500 transition"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4 text-amber-400" />
              <span className="text-[11px] font-semibold hidden md:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-indigo-600" />
              <span className="text-[11px] font-semibold hidden md:inline">Dark</span>
            </>
          )}
        </button>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="h-9 w-9 rounded-lg glass-card flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition disabled:opacity-50"
          title="Refresh State"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
