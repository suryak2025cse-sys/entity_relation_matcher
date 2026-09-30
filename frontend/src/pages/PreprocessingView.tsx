import React, { useState, useEffect } from 'react';
import { 
  Binary, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  SlidersHorizontal,
  Table
} from 'lucide-react';
import { PreprocessingReport, runPreprocessing, fetchValidationReport } from '../services/api';

interface PreprocessingViewProps {
  onNavigateToCandidates: () => void;
  hasUploadedFiles?: boolean;
}

export const PreprocessingView: React.FC<PreprocessingViewProps> = ({ 
  onNavigateToCandidates,
  hasUploadedFiles = false
}) => {
  const [datasetType, setDatasetType] = useState<'training' | 'test' | 'uploaded'>(
    hasUploadedFiles ? 'uploaded' : 'training'
  );
  const [maxRows, setMaxRows] = useState<number>(30000);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<PreprocessingReport | null>(null);

  const handleRun = async () => {
    setRunning(true);
    try {
      const data = await runPreprocessing(datasetType, maxRows);
      setReport(data);
    } catch (err: any) {
      console.error('Preprocessing error:', err);
    } finally {
      setRunning(false);
    }
  };

  const samples = report?.sample_transformations || [];
  const counts = report?.processed_counts || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Binary className="h-5 w-5 text-brand-400" />
            Phase 5 — Data Preprocessing
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Unified cleaning pipeline: Unicode normalization, legal suffix handling, street abbreviation expansion, and country canonicalization.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          <select
            value={datasetType}
            onChange={(e) => setDatasetType(e.target.value as any)}
            className="bg-slate-800 text-xs font-semibold text-slate-200 px-3 py-1.5 rounded-lg border-0 focus:ring-1 focus:ring-brand-500"
          >
            <option value="training">Training Dataset</option>
            <option value="test">Test Dataset</option>
            <option value="uploaded">Uploaded Dataset</option>
          </select>

          <button
            onClick={handleRun}
            disabled={running}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 transition"
          >
            {running ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {running ? 'Processing in Chunks...' : 'Run Preprocessing'}
          </button>
        </div>
      </div>

      {/* Counts Summary Card */}
      {report && (
        <div className="p-4 rounded-xl glass-panel border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Preprocessing Completed
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {Object.entries(counts).map(([k, v]) => `${k}: ${v.toLocaleString()} rows`).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToCandidates}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
          >
            Proceed to Candidates
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Before & After Live Transformation Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Table className="h-4 w-4 text-brand-400" />
              Live Transformation Comparison (Before vs After)
            </h3>
            <p className="text-xs text-slate-400">Verifying normalization across business name, address, and country tokens</p>
          </div>
        </div>

        {samples.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Field</th>
                  <th className="py-2.5 px-3">Raw Original Value</th>
                  <th className="py-2.5 px-3 text-brand-400">Normalized Pipeline Value</th>
                  <th className="py-2.5 px-3 text-indigo-400">Extracted Stem / Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {samples.map((s, idx) => (
                  <React.Fragment key={idx}>
                    <tr className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-400 font-sans font-semibold">Name</td>
                      <td className="py-2 px-3 text-slate-300 font-sans">{s.raw_name}</td>
                      <td className="py-2 px-3 text-brand-300">{s.normalized_name}</td>
                      <td className="py-2 px-3 text-indigo-300">{s.stem_name}</td>
                    </tr>
                    <tr className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-400 font-sans font-semibold">Address</td>
                      <td className="py-2 px-3 text-slate-300 font-sans">{s.raw_address}</td>
                      <td className="py-2 px-3 text-brand-300" colSpan={2}>{s.normalized_address}</td>
                    </tr>
                    <tr className="hover:bg-slate-900/40 border-b border-slate-800">
                      <td className="py-2 px-3 text-slate-400 font-sans font-semibold">Country</td>
                      <td className="py-2 px-3 text-slate-300 font-sans">{s.raw_country}</td>
                      <td className="py-2 px-3 text-brand-300 font-bold" colSpan={2}>{s.normalized_country}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-400">
            Click <strong>Run Preprocessing</strong> above to execute chunked normalization and view sample transformations.
          </div>
        )}
      </div>
    </div>
  );
};
