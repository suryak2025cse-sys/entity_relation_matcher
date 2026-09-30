import React from 'react';
import { X, Sparkles, CheckCircle2, XCircle, ArrowRight, ShieldAlert, BarChart2 } from 'lucide-react';

interface ExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  s1Data: {
    id: string;
    name: string;
    address: string;
    country: string;
  };
  matchedData: {
    id: string;
    name: string;
    address: string;
    country: string;
    source: string;
    confidence: number;
    name_similarity_pct: number;
    address_similarity_pct: number;
    country_match: boolean;
    features?: Record<string, number>;
  };
}

export const ExplainModal: React.FC<ExplainModalProps> = ({
  isOpen,
  onClose,
  s1Data,
  matchedData
}) => {
  if (!isOpen) return null;

  const confPct = (matchedData.confidence * 100).toFixed(1);
  const isHighConf = matchedData.confidence >= 0.85;

  const features = matchedData.features || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Explainable Match Analysis
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isHighConf ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                }`}>
                  {confPct}% Confidence
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Deep feature inspection for entity pair resolution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Side by side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source 1 */}
            <div className="p-4 rounded-xl glass-card border border-brand-500/30 bg-brand-50/50 dark:bg-brand-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Source 1 Entity
                </span>
                <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded bg-brand-500/20">
                  {s1Data.id}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Business Name</span>
                  <strong className="text-slate-900 dark:text-white text-sm font-semibold">{s1Data.name || '(Empty)'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Address</span>
                  <span className="text-slate-700 dark:text-slate-200">{s1Data.address || '(Empty)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Country</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{s1Data.country || '(Unknown)'}</span>
                </div>
              </div>
            </div>

            {/* Matched Target */}
            <div className="p-4 rounded-xl glass-card border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Matched Candidate ({matchedData.source.toUpperCase()})
                </span>
                <span className="font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/20">
                  {matchedData.id}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Business Name</span>
                  <strong className="text-slate-900 dark:text-white text-sm font-semibold">{matchedData.name || '(Empty)'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Address</span>
                  <span className="text-slate-700 dark:text-slate-200">{matchedData.address || '(Empty)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Country</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{matchedData.country || '(Unknown)'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Similarity Scores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Name Similarity</span>
              <span className="text-xl font-bold text-brand-600 dark:text-brand-400">{matchedData.name_similarity_pct}%</span>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-brand-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, matchedData.name_similarity_pct)}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Address Similarity</span>
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{matchedData.address_similarity_pct}%</span>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, matchedData.address_similarity_pct)}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center flex flex-col justify-center items-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Country Match</span>
              {matchedData.country_match ? (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-base">
                  <CheckCircle2 className="h-5 w-5" /> YES
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-base">
                  <XCircle className="h-5 w-5" /> NO
                </div>
              )}
            </div>
          </div>

          {/* Detailed Feature Values */}
          {Object.keys(features).length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5 text-brand-500" />
                Calculated Feature Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {Object.entries(features).map(([featKey, featVal]) => (
                  <div key={featKey} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 truncate text-[11px] mr-2" title={featKey}>
                      {featKey.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {typeof featVal === 'number' ? featVal.toFixed(3) : String(featVal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
