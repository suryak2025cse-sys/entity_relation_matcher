import React, { useState } from 'react';
import { 
  GitFork, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  Sliders, 
  Hash,
  Database
} from 'lucide-react';
import { CandidateReport, generateCandidates } from '../services/api';

interface CandidatesViewProps {
  hasUploadedFiles?: boolean;
  onNavigateToFeatures: () => void;
}

export const CandidatesView: React.FC<CandidatesViewProps> = ({ 
  hasUploadedFiles = false,
  onNavigateToFeatures 
}) => {
  const [datasetType, setDatasetType] = useState<'training' | 'test' | 'uploaded'>(
    hasUploadedFiles ? 'uploaded' : 'training'
  );
  const [maxS1, setMaxS1] = useState<number>(20000);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<CandidateReport | null>(null);

  const handleGenerate = async () => {
    setRunning(true);
    try {
      const data = await generateCandidates(datasetType, maxS1);
      setReport(data);
    } catch (err: any) {
      console.error('Candidate generation error:', err);
    } finally {
      setRunning(false);
    }
  };

  const samples = report?.sample_candidates || [];
  const rules = report?.blocking_method_breakdown || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GitFork className="h-5 w-5 text-brand-400" />
            Phase 6 — Generate Candidate Pairs (Blocking)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Multi-pass inverted index blocking: Country + First Token, 3-gram Name Prefix, and Address number tokens. Avoids Cartesian product.
          </p>
        </div>

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
            onClick={handleGenerate}
            disabled={running}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 transition"
          >
            {running ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {running ? 'Generating Candidates...' : 'Generate Candidates'}
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl glass-card border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Total S1 Entities Processed</span>
            <span className="text-xl font-bold text-white font-mono">{report.total_source1_entities.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-xl glass-card border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Total Candidate Pairs Generated</span>
            <span className="text-xl font-bold text-brand-400 font-mono">{report.total_candidate_pairs.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-xl glass-card border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Avg Candidates / Entity</span>
            <span className="text-xl font-bold text-indigo-400 font-mono">{report.avg_candidates_per_entity}</span>
          </div>
        </div>
      )}

      {/* Blocking Method Breakdown */}
      {Object.keys(rules).length > 0 && (
        <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Blocking Rule Contribution Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(rules).map(([ruleName, count]) => (
              <div key={ruleName} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block truncate" title={ruleName}>
                  {ruleName.replace(/_/g, ' ')}
                </span>
                <strong className="text-sm text-brand-300 font-mono">{count.toLocaleString()} pairs</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Samples Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Generated Candidate Pairs Sample</h3>
            <p className="text-xs text-slate-400">Inspecting pairs ready for feature extraction</p>
          </div>
          {report && (
            <button
              onClick={onNavigateToFeatures}
              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
            >
              Proceed to Features
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {samples.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Source 1 Entity</th>
                  <th className="py-2.5 px-3">Candidate Entity</th>
                  <th className="py-2.5 px-3">Target Source</th>
                  <th className="py-2.5 px-3">Blocking Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {samples.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-brand-300 font-semibold block">{c.source1_id}</span>
                      <span className="text-slate-200">{c.source1_name}</span>
                      <span className="text-[10px] text-slate-400 block">{c.source1_address}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-indigo-300 font-semibold block">{c.candidate_id}</span>
                      <span className="text-slate-200">{c.candidate_name}</span>
                      <span className="text-[10px] text-slate-400 block">{c.candidate_address}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-slate-800 text-slate-300">
                        {c.candidate_source}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-400 font-mono">
                      {c.blocking_method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-400">
            Click <strong>Generate Candidates</strong> above to run multi-pass blocking.
          </div>
        )}
      </div>
    </div>
  );
};
