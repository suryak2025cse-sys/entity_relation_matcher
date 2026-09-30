import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Globe, 
  ArrowRight,
  Database
} from 'lucide-react';
import { ValidationReport, fetchValidationReport } from '../services/api';

interface ValidationViewProps {
  onNavigateToPreprocessing: () => void;
  hasUploadedFiles?: boolean;
}

export const ValidationView: React.FC<ValidationViewProps> = ({ 
  onNavigateToPreprocessing,
  hasUploadedFiles = false
}) => {
  const [datasetType, setDatasetType] = useState<'training' | 'test' | 'uploaded'>(
    hasUploadedFiles ? 'uploaded' : 'training'
  );
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);

  const loadValidation = async (type: string) => {
    setLoading(true);
    try {
      const data = await fetchValidationReport(type);
      setReport(data);
    } catch (err) {
      console.error('Validation fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidation(datasetType);
  }, [datasetType]);

  const sources = report?.sources || {};
  const groundTruth = report?.ground_truth;
  const isValid = report?.is_valid ?? false;

  return (
    <div className="space-y-6">
      {/* Header & Dataset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-brand-400" />
            Phase 4 — Data Validation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Chunked schema verification, entity ID format checks, missing values, and relationship integrity.
          </p>
        </div>

        {/* Dataset Type Selector */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          {(['training', 'test', 'uploaded'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setDatasetType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                datasetType === type
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {type} Dataset
            </button>
          ))}
          <button
            onClick={() => loadValidation(datasetType)}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
            title="Re-run validation"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Validation Status Banner */}
      <div className={`p-4 rounded-xl glass-panel border flex items-center justify-between ${
        isValid ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-amber-500/30 bg-amber-950/20'
      }`}>
        <div className="flex items-center gap-3">
          {isValid ? (
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {isValid ? 'Schema & Integrity Validation Passed' : 'Validation Completed with Warnings/Issues'}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {isValid 
                ? 'All required fields, entity ID prefixes, and format requirements verified.' 
                : `${report?.errors.length || 0} error(s) and ${report?.warnings.length || 0} warning(s) detected.`}
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToPreprocessing}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
        >
          Proceed to Preprocessing
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sources Validation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(sources).map(([srcKey, srcData]: [string, any]) => {
          const valid = srcData?.is_valid;
          const totalRows = srcData?.total_rows || 0;
          const nulls = srcData?.null_counts || {};
          const topCountries = srcData?.top_countries || {};

          return (
            <div key={srcKey} className="p-4 rounded-xl glass-card border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {srcKey}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  valid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {valid ? 'Valid' : 'Invalid'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Rows:</span>
                  <strong className="text-white font-mono">{totalRows.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Missing Names:</span>
                  <span className="font-mono text-slate-300">{nulls.business_name || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Missing Addresses:</span>
                  <span className="font-mono text-slate-300">{nulls.business_address || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Missing Countries:</span>
                  <span className="font-mono text-slate-300">{nulls.country || 0}</span>
                </div>
              </div>

              {Object.keys(topCountries).length > 0 && (
                <div className="pt-2 border-t border-slate-800 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Top Countries
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(topCountries).slice(0, 4).map(([cName, cCount]: [string, any]) => (
                      <span key={cName} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {cName}: {cCount.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ground Truth Validation Card (if available) */}
      {groundTruth && (
        <div className="p-4 rounded-xl glass-panel border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Ground Truth Dataset Validation
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {groundTruth.is_valid ? 'Verified' : 'Issues Detected'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Total S1 Entities</span>
              <strong className="text-white text-sm font-mono">{groundTruth.total_rows.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Total Match Pairs</span>
              <strong className="text-emerald-400 text-sm font-mono">{groundTruth.total_ground_truth_pairs.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Entities with Matches</span>
              <strong className="text-white text-sm font-mono">{groundTruth.non_empty_matches_count.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Avg Matches / Entity</span>
              <strong className="text-indigo-400 text-sm font-mono">{groundTruth.avg_matches_per_entity}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
