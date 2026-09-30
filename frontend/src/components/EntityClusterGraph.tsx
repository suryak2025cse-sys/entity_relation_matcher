import React, { useState, useMemo } from 'react';
import { 
  Network, 
  Layers, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter, 
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { MatchResultItem } from '../services/api';

interface EntityClusterGraphProps {
  results: MatchResultItem[];
  onSelectEntity?: (entity: MatchResultItem) => void;
}

export const EntityClusterGraph: React.FC<EntityClusterGraphProps> = ({
  results,
  onSelectEntity
}) => {
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [minConfidence, setMinConfidence] = useState<number>(0.60);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'source2' | 'source3'>('all');

  // Build connected graph clusters
  const clusters = useMemo(() => {
    const list: Array<{
      s1: MatchResultItem;
      matches: Array<any>;
      clusterId: number;
    }> = [];

    const matchedOnly = results.filter(r => r.has_match && r.matched_entities_details.length > 0);

    matchedOnly.slice(0, 16).forEach((item, idx) => {
      const validMatches = item.matched_entities_details.filter(m => {
        const confPass = (m.confidence || 0) >= minConfidence;
        const srcPass = sourceFilter === 'all' || m.matched_source === sourceFilter;
        return confPass && srcPass;
      });

      if (validMatches.length > 0) {
        list.push({
          s1: item,
          matches: validMatches,
          clusterId: idx + 1
        });
      }
    });

    return list;
  }, [results, minConfidence, sourceFilter]);

  const activeCluster = selectedCluster !== null 
    ? clusters.find(c => c.clusterId === selectedCluster) || clusters[0]
    : clusters[0];

  return (
    <div className="p-5 rounded-2xl glass-panel border border-brand-500/20 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Interactive Entity Knowledge Graph & Multi-Source Cluster Visualizer
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold uppercase border border-brand-500/20">
                AI Match Clusters
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Interactive visual topology mapping Source 1 query entities to connected Source 2 & Source 3 real-world records.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-semibold text-slate-500">Min Conf:</span>
            <input 
              type="range" 
              min="0.5" 
              max="0.95" 
              step="0.05"
              value={minConfidence} 
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-16 h-1 accent-brand-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono font-bold text-brand-600 dark:text-brand-400">
              {Math.round(minConfidence * 100)}%
            </span>
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-800"
          >
            <option value="all">All Targets</option>
            <option value="source2">Source 2 Only</option>
            <option value="source3">Source 3 Only</option>
          </select>
        </div>
      </div>

      {/* Cluster Selector Pills */}
      {clusters.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {clusters.map((c) => (
              <button
                key={c.clusterId}
                onClick={() => setSelectedCluster(c.clusterId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 border ${
                  activeCluster?.clusterId === c.clusterId
                    ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-500/20'
                    : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span className="font-mono text-[10px] opacity-75">#{c.clusterId}</span>
                <span className="truncate max-w-[130px]">{c.s1.source1_business_name || c.s1.source1_entity_id}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-mono">
                  {c.matches.length}
                </span>
              </button>
            ))}
          </div>

          {/* Interactive Visual Graph Canvas */}
          {activeCluster && (
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-950/80 to-slate-900/90 border border-slate-800 text-white relative overflow-hidden min-h-[320px] flex flex-col justify-between">
              {/* Central S1 Node */}
              <div className="flex flex-col items-center justify-center my-auto relative z-10">
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 border-2 border-brand-400 shadow-xl shadow-brand-500/30 text-center max-w-sm">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-brand-200 block font-bold">
                    Primary Entity • {activeCluster.s1.source1_entity_id}
                  </span>
                  <h4 className="text-base font-bold text-white mt-1">
                    {activeCluster.s1.source1_business_name || 'Unnamed Business'}
                  </h4>
                  <p className="text-xs text-brand-100/80 mt-0.5 truncate">
                    {activeCluster.s1.source1_address || 'No address provided'}
                  </p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-black/30 font-mono text-brand-300">
                    Country: {activeCluster.s1.source1_country || 'UNKNOWN'}
                  </span>
                </div>

                {/* Connecting Node Edges */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                  {activeCluster.matches.map((m, idx) => {
                    const isS3 = m.matched_source === 'source3' || m.matched_id.startsWith('S3-');
                    const conf = m.confidence || 0;
                    return (
                      <div 
                        key={idx}
                        className={`p-3.5 rounded-xl border relative transition-all duration-200 hover:scale-105 ${
                          isS3 
                            ? 'bg-purple-950/40 border-purple-500/40 hover:border-purple-400' 
                            : 'bg-indigo-950/40 border-indigo-500/40 hover:border-indigo-400'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className={`font-mono font-bold uppercase ${isS3 ? 'text-purple-300' : 'text-indigo-300'}`}>
                            {m.matched_source.toUpperCase()}
                          </span>
                          <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            {(conf * 100).toFixed(1)}% Match
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-white truncate" title={m.matched_name}>
                          {m.matched_name}
                        </h5>
                        <p className="text-[11px] text-slate-300 truncate mt-0.5" title={m.matched_address}>
                          {m.matched_address}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                          <span className="font-mono">{m.matched_id}</span>
                          <span>Name Sim: {m.name_similarity_pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 mt-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Source 1 Query
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Source 2 Target
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Source 3 Target
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  Cluster ID #{activeCluster.clusterId} • {activeCluster.matches.length} Resolved Edges
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-xs">
          No matching clusters found for the current confidence threshold filter.
        </div>
      )}
    </div>
  );
};
