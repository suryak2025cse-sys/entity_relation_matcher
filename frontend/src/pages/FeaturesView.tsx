import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  RefreshCw, 
  Layers, 
  ArrowRight, 
  Sparkles,
  BarChart2
} from 'lucide-react';
import { fetchSampleFeatures } from '../services/api';

interface FeaturesViewProps {
  onNavigateToModelMgmt: () => void;
}

export const FeaturesView: React.FC<FeaturesViewProps> = ({ onNavigateToModelMgmt }) => {
  const [loading, setLoading] = useState(false);
  const [featureData, setFeatureData] = useState<any>(null);

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const data = await fetchSampleFeatures();
      setFeatureData(data);
    } catch (err) {
      console.error('Feature sample error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const featureNames = featureData?.feature_names || [];
  const sampleRows = featureData?.sample_feature_rows || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-brand-400" />
            Phase 7 — Feature Engineering Suite
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            25 multidimensional similarity metrics extracted identically across training pairs and future matching candidates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadFeatures}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg glass-card hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Samples
          </button>
          <button
            onClick={onNavigateToModelMgmt}
            className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
          >
            Proceed to Model
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Feature Families Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl glass-card border border-brand-500/30 bg-brand-950/20 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-400 block">
            1. Business Name Metrics (12)
          </span>
          <ul className="text-xs text-slate-300 space-y-1 font-mono list-disc list-inside">
            <li>Exact Match & Stem Exact Match</li>
            <li>RapidFuzz Ratio & Token Sort Ratio</li>
            <li>RapidFuzz Token Set Ratio</li>
            <li>RapidFuzz Partial & Stem Ratio</li>
            <li>Token-level Jaccard Similarity</li>
            <li>Character 3-gram Jaccard Similarity</li>
            <li>Common Token Count & Length Ratio</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl glass-card border border-indigo-500/30 bg-indigo-950/20 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
            2. Address & Numeric Metrics (9)
          </span>
          <ul className="text-xs text-slate-300 space-y-1 font-mono list-disc list-inside">
            <li>Exact Match & Token Set Ratio</li>
            <li>RapidFuzz Ratio & Partial Ratio</li>
            <li>Address Token Jaccard Similarity</li>
            <li>Street Number Overlap Score</li>
            <li>Common Numbers Count</li>
            <li>Address Length Difference Ratio</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl glass-card border border-purple-500/30 bg-purple-950/20 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block">
            3. Geo & Cross Metrics (4)
          </span>
          <ul className="text-xs text-slate-300 space-y-1 font-mono list-disc list-inside">
            <li>Exact Country Match (Binary)</li>
            <li>Both Countries Unknown (Indicator)</li>
            <li>Source 3 Indicator (Binary)</li>
            <li>Weighted Heuristic Composite Score</li>
          </ul>
        </div>
      </div>

      {/* Sample Feature Vectors Matrix */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-brand-400" />
            Computed Feature Matrix Sample
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {featureNames.length} Total Features
          </span>
        </div>

        {sampleRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 whitespace-nowrap">Pair</th>
                  <th className="py-2.5 px-3 text-brand-400 whitespace-nowrap">Name Fuzz</th>
                  <th className="py-2.5 px-3 text-brand-400 whitespace-nowrap">Name Token Set</th>
                  <th className="py-2.5 px-3 text-brand-400 whitespace-nowrap">Name Jaccard</th>
                  <th className="py-2.5 px-3 text-indigo-400 whitespace-nowrap">Addr Fuzz</th>
                  <th className="py-2.5 px-3 text-indigo-400 whitespace-nowrap">Addr Token Set</th>
                  <th className="py-2.5 px-3 text-indigo-400 whitespace-nowrap">Num Match</th>
                  <th className="py-2.5 px-3 text-emerald-400 whitespace-nowrap">Country Match</th>
                  <th className="py-2.5 px-3 text-purple-400 whitespace-nowrap">Combined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {sampleRows.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 text-slate-300 font-sans">
                      <span className="font-semibold text-brand-300">{r.source1_id}</span>
                      <span className="text-slate-500 mx-1">↔</span>
                      <span className="font-semibold text-indigo-300">{r.candidate_id}</span>
                    </td>
                    <td className="py-2 px-3 text-brand-300">{(r.name_fuzz_ratio || 0).toFixed(3)}</td>
                    <td className="py-2 px-3 text-brand-300">{(r.name_token_set_ratio || 0).toFixed(3)}</td>
                    <td className="py-2 px-3 text-brand-300">{(r.name_jaccard_tokens || 0).toFixed(3)}</td>
                    <td className="py-2 px-3 text-indigo-300">{(r.addr_fuzz_ratio || 0).toFixed(3)}</td>
                    <td className="py-2 px-3 text-indigo-300">{(r.addr_token_set_ratio || 0).toFixed(3)}</td>
                    <td className="py-2 px-3 text-indigo-300">{(r.addr_num_match_score || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-emerald-300">{r.country_exact_match ? '1.0' : '0.0'}</td>
                    <td className="py-2 px-3 text-purple-300 font-bold">{(r.combined_name_addr_score || 0).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-400">
            Generate candidates in Phase 6 to preview live computed feature vectors.
          </div>
        )}
      </div>
    </div>
  );
};
