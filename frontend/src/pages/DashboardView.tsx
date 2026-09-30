import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Cpu, 
  Database, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Zap
} from 'lucide-react';
import { DashboardData } from '../services/api';
import { TabType } from '../components/Sidebar';

interface DashboardViewProps {
  data: DashboardData | null;
  onNavigate: (tab: TabType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ data, onNavigate }) => {
  const isTrained = data?.is_model_trained ?? false;
  const modelName = data?.model_name || 'Not Trained';
  const threshold = data?.threshold ?? 0.65;
  const trainingRecords = data?.training_records ?? 0;
  const f05 = data?.validation_f05;
  const precision = data?.validation_precision;
  const recall = data?.validation_recall;
  const steps = data?.pipeline_steps || [];

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="p-6 rounded-2xl glass-panel relative overflow-hidden border border-slate-800 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-3">
            <Zap className="h-3.5 w-3.5" />
            Fixed Training Dataset + Reusable Trained Model
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Business Entity Resolution Platform
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            High-precision multi-source record linkage system designed for large datasets. Built with chunked streaming, inverted blocking, RapidFuzz string metrics, and supervised F<sub>0.5</sub> threshold optimization.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => onNavigate(isTrained ? 'matching' : 'training-setup')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-indigo-500 transition flex items-center gap-2"
            >
              {isTrained ? 'Run Matching with Saved Model' : 'Start Training Dataset Setup'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('model-mgmt')}
              className="px-4 py-2 rounded-xl glass-card text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition"
            >
              Model Management
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-brand-600/10 via-indigo-600/5 to-transparent pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Model Status Card */}
        <div className="p-4 rounded-xl glass-card border border-slate-800 flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">Model Status</span>
            <span className={`text-lg font-bold ${isTrained ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isTrained ? 'Trained & Saved' : 'Not Trained'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              {isTrained ? `Algorithm: ${modelName}` : 'Needs initial training'}
            </span>
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isTrained ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            <Cpu className="h-5 w-5" />
          </div>
        </div>

        {/* Training Dataset Card */}
        <div className="p-4 rounded-xl glass-card border border-slate-800 flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">Training Dataset</span>
            <span className="text-lg font-bold text-white">
              {data?.training_dataset_status || 'Checking...'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              {data?.training_dataset_name || 'dataset_archive.zip'}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
        </div>

        {/* F0.5 Score Card */}
        <div className="p-4 rounded-xl glass-card border border-slate-800 flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">Validation F<sub>0.5</sub> Score</span>
            <span className="text-lg font-bold text-emerald-400">
              {f05 !== undefined ? `${(f05 * 100).toFixed(1)}%` : 'N/A'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              {precision !== undefined && recall !== undefined ? `P: ${(precision * 100).toFixed(1)}% • R: ${(recall * 100).toFixed(1)}%` : 'Precision-focused'}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Optimal Threshold Card */}
        <div className="p-4 rounded-xl glass-card border border-slate-800 flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">Decision Threshold</span>
            <span className="text-lg font-bold text-indigo-400">
              {threshold.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Version: {data?.model_version || 'v1'}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Pipeline Checklist */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">Pipeline Execution Status</h2>
            <p className="text-xs text-slate-400">End-to-end verification across each pipeline stage</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {steps.filter(s => s.completed).length} of {steps.length} Steps Completed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all ${
                step.completed 
                  ? 'bg-emerald-950/20 border-emerald-500/30' 
                  : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Phase {idx + 1}
                </span>
                {step.completed ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Done
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                    <Clock className="h-3.5 w-3.5" /> Pending
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-200 truncate">{step.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{step.status_text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
