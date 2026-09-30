import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Sliders, 
  ShieldAlert, 
  CheckCircle2, 
  Info,
  Scale
} from 'lucide-react';

interface CostFrontierSimulatorProps {
  totalEntities?: number;
  totalMatches?: number;
  currentThreshold?: number;
}

export const CostFrontierSimulator: React.FC<CostFrontierSimulatorProps> = ({
  totalEntities = 5000,
  totalMatches = 4324,
  currentThreshold = 0.65
}) => {
  const [costFP, setCostFP] = useState<number>(150); // Cost per False Positive merge error ($)
  const [costFN, setCostFN] = useState<number>(45);  // Cost per False Negative missed match ($)
  const [simThreshold, setSimThreshold] = useState<number>(currentThreshold);

  // Simulation calculations
  const simMetrics = useMemo(() => {
    // Estimated confusion curve based on threshold
    const t = simThreshold;
    const estimatedTP = Math.round(totalMatches * Math.max(0.2, 1.0 - Math.pow(t, 2.2) * 0.4));
    const estimatedFP = Math.round(Math.max(0, (1.0 - t) * 280));
    const estimatedFN = Math.round(totalMatches - estimatedTP);
    const estimatedTN = Math.round(totalEntities - estimatedTP - estimatedFP - estimatedFN);

    const precision = estimatedTP / Math.max(1, estimatedTP + estimatedFP);
    const recall = estimatedTP / Math.max(1, estimatedTP + estimatedFN);
    const f05 = (1.25 * precision * recall) / Math.max(0.001, 0.25 * precision + recall);

    const totalCost = (estimatedFP * costFP) + (estimatedFN * costFN);
    const baselineCost = totalMatches * costFN; // Cost if 0 matches were resolved
    const costSavings = Math.max(0, baselineCost - totalCost);
    const roiPercent = ((costSavings / Math.max(1, totalCost)) * 100);

    return {
      tp: estimatedTP,
      fp: estimatedFP,
      fn: estimatedFN,
      tn: estimatedTN,
      precision,
      recall,
      f05,
      totalCost,
      costSavings,
      roiPercent
    };
  }, [simThreshold, costFP, costFN, totalEntities, totalMatches]);

  return (
    <div className="p-5 rounded-2xl glass-panel border border-emerald-500/20 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Decision Threshold ROI & Risk Frontier Simulator
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase border border-emerald-500/20">
                Economic Optimizer
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Simulate enterprise financial impact: trade off False Positive merge penalties against False Negative missed entity costs.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Estimated Cost Savings</span>
          <span className="text-lg font-black text-emerald-500 font-mono">
            ${simMetrics.costSavings.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Decision Threshold ($\tau$):</span>
            <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{simThreshold.toFixed(2)}</span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="0.95" 
            step="0.01"
            value={simThreshold} 
            onChange={(e) => setSimThreshold(parseFloat(e.target.value))}
            className="w-full h-1.5 accent-brand-500 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
            <span>Aggressive (High Recall)</span>
            <span>Conservative (High Precision)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-rose-600 dark:text-rose-400 font-medium">Cost of False Positive ($FP):</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">${costFP} / pair</span>
          </div>
          <input 
            type="range" 
            min="10" 
            max="500" 
            step="10"
            value={costFP} 
            onChange={(e) => setCostFP(parseInt(e.target.value))}
            className="w-full h-1.5 accent-rose-500 cursor-pointer"
          />
          <span className="text-[9px] text-slate-400 block mt-1">Compliance & regulatory penalty for bad merges</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-amber-600 dark:text-amber-400 font-medium">Cost of False Negative ($FN):</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">${costFN} / pair</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="200" 
            step="5"
            value={costFN} 
            onChange={(e) => setCostFN(parseInt(e.target.value))}
            className="w-full h-1.5 accent-amber-500 cursor-pointer"
          />
          <span className="text-[9px] text-slate-400 block mt-1">Missed customer cross-sell & duplicated effort</span>
        </div>
      </div>

      {/* Simulated KPI Output Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Simulated Precision</span>
          <span className="text-lg font-mono font-bold text-slate-800 dark:text-white">
            {(simMetrics.precision * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{simMetrics.fp} FP Collisions</span>
        </div>

        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Simulated Recall</span>
          <span className="text-lg font-mono font-bold text-slate-800 dark:text-white">
            {(simMetrics.recall * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{simMetrics.tp} True Matches</span>
        </div>

        <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
          <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400 block">Optimal $F_{0.5}$ Score</span>
          <span className="text-lg font-mono font-bold text-brand-600 dark:text-brand-300">
            {(simMetrics.f05 * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Precision Weighted</span>
        </div>

        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Simulated ROI</span>
          <span className="text-lg font-mono font-bold text-purple-600 dark:text-purple-300">
            +{simMetrics.roiPercent.toFixed(0)}%
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Net Business Value</span>
        </div>
      </div>
    </div>
  );
};
