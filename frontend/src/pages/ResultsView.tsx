import React, { useState, useEffect } from 'react';
import { 
  TableProperties, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  XCircle,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  Network,
  LayoutGrid
} from 'lucide-react';
import { fetchResultsList, MatchResultItem, PaginatedResults } from '../services/api';
import { ExplainModal } from '../components/ExplainModal';
import { EntityClusterGraph } from '../components/EntityClusterGraph';

interface ResultsViewProps {
  onNavigateToAnalytics: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ onNavigateToAnalytics }) => {
  const [data, setData] = useState<PaginatedResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [filterMatch, setFilterMatch] = useState<'all' | 'matches' | 'unmatched'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');

  // Explain modal state
  const [selectedMatch, setSelectedMatch] = useState<{
    s1: { id: string; name: string; address: string; country: string };
    matched: any;
  } | null>(null);

  const loadResults = async () => {
    setLoading(true);
    try {
      const res = await fetchResultsList({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        only_matches: filterMatch === 'matches' ? true : filterMatch === 'unmatched' ? false : undefined,
        source_filter: sourceFilter || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [page, filterMatch, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadResults();
  };

  const results = data?.results || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TableProperties className="h-5 w-5 text-brand-500" />
            Phase 11 & 12 — Results Dashboard & Explainable Matches
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Searchable, paginated matches with explainable similarity metrics and interactive AI knowledge graph.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'graph'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              Cluster Graph
            </button>
          </div>

          <button
            onClick={onNavigateToAnalytics}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
          >
            View Analytics
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl glass-card border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total S1 Entities</span>
            <strong className="text-lg font-bold text-slate-900 dark:text-white font-mono">{data.total_entities?.toLocaleString()}</strong>
          </div>
          <div className="p-3.5 rounded-xl glass-card border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Matched Entities</span>
            <strong className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">{data.total_matches?.toLocaleString()}</strong>
          </div>
          <div className="p-3.5 rounded-xl glass-card border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Unmatched</span>
            <strong className="text-lg font-bold text-slate-700 dark:text-slate-300 font-mono">{data.unmatched_entities?.toLocaleString()}</strong>
          </div>
          <div className="p-3.5 rounded-xl glass-card border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">High Confidence (&gt;85%)</span>
            <strong className="text-lg font-bold text-brand-600 dark:text-brand-400 font-mono">{data.high_confidence_count?.toLocaleString()}</strong>
          </div>
        </div>
      )}

      {/* Conditional: Interactive Knowledge Graph View */}
      {viewMode === 'graph' && (
        <EntityClusterGraph
          results={results}
          onSelectEntity={(entity) => {
            const topMatch = entity.matched_entities_details[0];
            if (topMatch) {
              setSelectedMatch({
                s1: {
                  id: entity.source1_entity_id,
                  name: entity.source1_business_name,
                  address: entity.source1_address,
                  country: entity.source1_country
                },
                matched: topMatch
              });
            }
          }}
        />
      )}

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-xl glass-panel border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Entity ID, Business Name, or Matched Target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-800 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-700/80 focus:ring-1 focus:ring-brand-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={filterMatch}
            onChange={(e) => { setFilterMatch(e.target.value as any); setPage(1); }}
            className="bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Records</option>
            <option value="matches">Matched Only</option>
            <option value="unmatched">Unmatched Only</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Sources</option>
            <option value="source2">Source 2 Matches</option>
            <option value="source3">Source 3 Matches</option>
          </select>

          <button
            onClick={loadResults}
            disabled={loading}
            className="p-2 rounded-xl glass-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition disabled:opacity-50"
            title="Refresh results"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Results Table */}
      {viewMode === 'table' && (
      <div className="p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Source 1 Entity</th>
                  <th className="py-2.5 px-3">Match Status</th>
                  <th className="py-2.5 px-3">Matched Target Entities</th>
                  <th className="py-2.5 px-3">Top Confidence</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {results.map((r) => {
                  const details = r.matched_entities_details || [];
                  const topMatch = details[0];

                  return (
                    <tr key={r.source1_entity_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                      {/* S1 Column */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-brand-600 dark:text-brand-300 font-bold block">{r.source1_entity_id}</span>
                        <span className="text-slate-900 dark:text-white font-semibold">{r.source1_business_name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{r.source1_address} • {r.source1_country}</span>
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-3">
                        {r.has_match ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase">
                            <CheckCircle2 className="h-3 w-3" /> Matched ({r.matched_entity_ids.length})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                            No Match
                          </span>
                        )}
                      </td>

                      {/* Matched Targets Column */}
                      <td className="py-3 px-3">
                        {details.length > 0 ? (
                          <div className="space-y-1.5">
                            {details.map((m, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="font-mono text-indigo-600 dark:text-indigo-300 font-semibold">{m.matched_id}</span>
                                <span className="text-slate-800 dark:text-slate-300 font-medium truncate max-w-xs">{m.matched_name}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded uppercase font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {m.matched_source}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Confidence Column */}
                      <td className="py-3 px-3">
                        {topMatch ? (
                          <div>
                            <span className="font-mono font-bold text-sm text-brand-600 dark:text-brand-300">
                              {(topMatch.confidence * 100).toFixed(1)}%
                            </span>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>Name: {topMatch.name_similarity_pct}%</span>
                              <span>• Addr: {topMatch.address_similarity_pct}%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Action / Explain Button */}
                      <td className="py-3 px-3 text-right">
                        {topMatch && (
                          <button
                            onClick={() => setSelectedMatch({
                              s1: {
                                id: r.source1_entity_id,
                                name: r.source1_business_name,
                                address: r.source1_address,
                                country: r.source1_country
                              },
                              matched: topMatch
                            })}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Explain
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
            {loading ? 'Loading match results...' : 'No records found matching query criteria.'}
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Page <strong className="text-slate-800 dark:text-white font-mono">{page}</strong> of <strong className="text-slate-800 dark:text-white font-mono">{totalPages}</strong> ({data?.filtered_total?.toLocaleString() || 0} total records)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg glass-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg glass-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Explainable Match Modal Drawer */}
      {selectedMatch && (
        <ExplainModal
          isOpen={true}
          onClose={() => setSelectedMatch(null)}
          s1Data={selectedMatch.s1}
          matchedData={selectedMatch.matched}
        />
      )}
    </div>
  );
};
