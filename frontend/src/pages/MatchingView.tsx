import React, { useState } from 'react';
import { 
  Zap, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  Sliders, 
  Layers, 
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { runMatching } from '../services/api';

interface MatchingViewProps {
  defaultThreshold: number;
  hasUploadedFiles?: boolean;
  onNavigateToResults: () => void;
}

export const MatchingView: React.FC<MatchingViewProps> = ({
  defaultThreshold,
  hasUploadedFiles = false,
  onNavigateToResults
}) => {
  const [datasetType, setDatasetType] = useState<'test' | 'uploaded' | 'training'>(
    hasUploadedFiles ? 'uploaded' : 'test'
  );
  const [customThreshold, setCustomThreshold] = useState<number>(defaultThreshold);
  const [useCustomThreshold, setUseCustomThreshold] = useState<boolean>(false);
  const [maxRecords, setMaxRecords] = useState<number>(25000);
  const [matching, setMatching] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const handleMatch = async () => {
    setMatching(true);
    setSummary(null);
    try {
      const threshOverride = useCustomThreshold ? customThreshold : undefined;
      const res = await runMatching(datasetType, threshOverride, maxRecords);
      setSummary(res.data || res);
    } catch (err: any) {
      console.error('Matching error:', err);
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-brand-400" />
          Phase 10 — Match Records with Saved Model
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Inference phase: Inverted blocking candidates are evaluated through the saved supervised model to predict matches.
        </p>
      </div>

      {/* Model Reuse Policy Card */}
      <div className="p-4 rounded-xl glass-panel border border-brand-500/30 bg-brand-950/20 flex items-start gap-3">
        <Cpu className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Reusable Trained Model Policy Active
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            This operation loads <code>backend/models/trained_model.joblib</code> directly from disk. The model is <strong>NEVER</strong> retrained during matching.
          </p>
        </div>
      </div>

      {/* Controls & Configuration */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 shadow-xl space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Select Target Dataset
            </label>
            <select
              value={datasetType}
              onChange={(e) => setDatasetType(e.target.value as any)}
              className="w-full bg-slate-900 text-xs text-slate-200 p-2.5 rounded-xl border border-slate-700"
            >
              <option value="test">Test Dataset (from Archive)</option>
              <option value="uploaded">User Uploaded Dataset</option>
              <option value="training">Training Dataset</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Max S1 Records to Match
            </label>
            <select
              value={maxRecords}
              onChange={(e) => setMaxRecords(Number(e.target.value))}
              className="w-full bg-slate-900 text-xs text-slate-200 p-2.5 rounded-xl border border-slate-700"
            >
              <option value={10000}>10,000 Records (Fast Batch)</option>
              <option value={25000}>25,000 Records (Standard)</option>
              <option value={50000}>50,000 Records (Extended)</option>
              <option value={2000000}>Full Dataset</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Decision Threshold
              </label>
              <label className="text-[10px] text-slate-400 flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomThreshold}
                  onChange={(e) => setUseCustomThreshold(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-brand-600"
                />
                Custom
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.10"
                max="0.99"
                step="0.01"
                disabled={!useCustomThreshold}
                value={useCustomThreshold ? customThreshold : defaultThreshold}
                onChange={(e) => setCustomThreshold(Number(e.target.value))}
                className="w-full accent-brand-500 disabled:opacity-40"
              />
              <span className="font-mono font-bold text-xs text-indigo-300 w-10 text-right">
                {(useCustomThreshold ? customThreshold : defaultThreshold).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <p className="text-[11px] text-slate-400">
            Results will be written to <code>matching_results.tsv</code> in strict submission format.
          </p>
          <button
            onClick={handleMatch}
            disabled={matching}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50 transition"
          >
            {matching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {matching ? 'Matching with Saved Model...' : 'Start Matching Engine'}
          </button>
        </div>
      </div>

      {/* Results Summary Card */}
      {summary && (
        <div className="p-6 rounded-2xl glass-panel border border-emerald-500/30 bg-emerald-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Matching Completed Successfully</h3>
                <p className="text-xs text-slate-300">
                  Evaluated {summary.total_entities?.toLocaleString()} entities • Threshold used: {summary.threshold_used}
                </p>
              </div>
            </div>
            <button
              onClick={onNavigateToResults}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
            >
              View Results Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">Total Entities</span>
              <strong className="text-white text-base font-mono">{summary.total_entities?.toLocaleString()}</strong>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">Matched Entities</span>
              <strong className="text-emerald-400 text-base font-mono">{summary.total_matches?.toLocaleString()}</strong>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">Total Match Pairs</span>
              <strong className="text-indigo-400 text-base font-mono">{summary.total_match_pairs?.toLocaleString()}</strong>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block">High Confidence (&gt;85%)</span>
              <strong className="text-brand-300 text-base font-mono">{summary.high_confidence_count?.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
