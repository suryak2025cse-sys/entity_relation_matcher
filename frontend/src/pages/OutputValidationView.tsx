import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight, 
  DownloadCloud,
  FileCheck
} from 'lucide-react';
import { fetchOutputValidation, OutputValidationReport } from '../services/api';

interface OutputValidationViewProps {
  onNavigateToDownload: () => void;
}

export const OutputValidationView: React.FC<OutputValidationViewProps> = ({ onNavigateToDownload }) => {
  const [report, setReport] = useState<OutputValidationReport | null>(null);
  const [loading, setLoading] = useState(false);

  const loadValidation = async () => {
    setLoading(true);
    try {
      const res = await fetchOutputValidation();
      setReport(res);
    } catch (err) {
      console.error('Output validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidation();
  }, []);

  const isValid = report?.is_valid ?? false;
  const errors = report?.errors || [];
  const warnings = report?.warnings || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Phase 14 — Output Validation & Submission Safety Check
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Official rule validation enforcing unique S1 rows, valid S2/S3 entity prefixes, candidate subset conformance, and UTF-8 TSV formatting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadValidation}
            disabled={loading}
            className="p-2 rounded-xl glass-card hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
            title="Re-run output validation"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
          {isValid && (
            <button
              onClick={onNavigateToDownload}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
            >
              Proceed to Download
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Validation Status Banner */}
      <div className={`p-6 rounded-2xl glass-panel border flex items-start justify-between ${
        isValid 
          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-lg shadow-emerald-950/40' 
          : 'border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/40'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
            isValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {isValid ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isValid ? 'Official Submission Validation: PASSED' : 'Submission Validation: Issues Detected'}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              {isValid
                ? 'All submission constraints met. File formatting, encoding, prefixes, and relationships verified.'
                : `${errors.length} blocking issue(s) must be resolved before submission.`}
            </p>
            {report && (
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                <span>Total S1 Rows: <strong className="text-white font-mono">{report.total_s1_rows?.toLocaleString()}</strong></span>
                <span>• Non-empty Matches: <strong className="text-emerald-400 font-mono">{report.non_empty_matches_count?.toLocaleString()}</strong></span>
                <span>• Empty (No Match): <strong className="text-slate-300 font-mono">{report.empty_matches_count?.toLocaleString()}</strong></span>
              </div>
            )}
          </div>
        </div>

        {isValid && (
          <button
            onClick={onNavigateToDownload}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition shrink-0"
          >
            <DownloadCloud className="h-4 w-4" />
            Download Results
          </button>
        )}
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rules Checklist */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Enforced Challenge Rules Checklist
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>UTF-8 tab-separated (.tsv) formatting</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Exact header: <code>source1_entity_id &lt;tab&gt; matched_entity_ids</code></span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Every Source 1 entity appears exactly once</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Zero self-matches (no S1 IDs in matched lists)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Only valid target prefixes (S2- and S3-)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>No duplicates inside comma-separated match lists</span>
            </div>
          </div>
        </div>

        {/* Errors & Warnings Card */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Validation Findings & Diagnostics
          </h3>
          {errors.length === 0 && warnings.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> 0 Errors • 0 Warnings
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {errors.map((err, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
              {warnings.map((warn, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
