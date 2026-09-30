import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  BarChart3,
  Sliders,
  Play,
  ArrowRight
} from 'lucide-react';
import { fetchModelMetadata, trainModel, TrainingResponse } from '../services/api';

interface ModelManagementViewProps {
  onModelUpdated: () => void;
  onNavigateToMatching: () => void;
}

export const ModelManagementView: React.FC<ModelManagementViewProps> = ({
  onModelUpdated,
  onNavigateToMatching
}) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [modelType, setModelType] = useState<string>('hist_gradient_boosting');
  const [maxPairs, setMaxPairs] = useState<number>(25000);
  const [trainResult, setTrainResult] = useState<TrainingResponse | null>(null);

  const loadMeta = async () => {
    setLoading(true);
    try {
      const data = await fetchModelMetadata();
      setMetadata(data);
    } catch (err) {
      console.error('Failed to load model metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  const handleRetrain = async () => {
    setTraining(true);
    setTrainResult(null);
    try {
      const res = await trainModel({
        model_type: modelType,
        max_training_pairs: maxPairs,
        force_retrain: true,
      });
      setTrainResult(res);
      await loadMeta();
      onModelUpdated();
    } catch (err: any) {
      console.error('Retraining error:', err);
    } finally {
      setTraining(false);
    }
  };

  const f05 = metadata?.validation_f05;
  const precision = metadata?.validation_precision;
  const recall = metadata?.validation_recall;
  const f1 = metadata?.validation_f1;
  const threshold = metadata?.threshold ?? 0.65;
  const featureImportances = metadata?.feature_importances || {};
  const thresholdCurve = metadata?.threshold_curve || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="h-5 w-5 text-amber-400" />
            Model Management & Training Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Supervised model persistence, precision/recall metrics, threshold tuning, and administrative retraining.
          </p>
        </div>

        <button
          onClick={onNavigateToMatching}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 flex items-center gap-2 transition self-start sm:self-auto"
        >
          Proceed to Matching
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Model State KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Model Version & Type</span>
          <span className="text-lg font-bold text-white font-mono">{metadata?.model_version || 'v1'}</span>
          <span className="text-[11px] text-brand-400 block mt-1 font-semibold">{metadata?.model_type || 'HistGradientBoosting'}</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Validation F<sub>0.5</sub> Score</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            {f05 !== undefined ? `${(f05 * 100).toFixed(1)}%` : 'N/A'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Precision-weighted metric</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Precision / Recall</span>
          <span className="text-lg font-bold text-slate-200 font-mono">
            {precision !== undefined ? `${(precision * 100).toFixed(1)}%` : 'N/A'} / {recall !== undefined ? `${(recall * 100).toFixed(1)}%` : 'N/A'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">F1: {f1 !== undefined ? `${(f1 * 100).toFixed(1)}%` : 'N/A'}</span>
        </div>

        <div className="p-4 rounded-xl glass-card border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Saved Decision Threshold</span>
          <span className="text-2xl font-black text-indigo-400 font-mono">
            {threshold.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Optimized for validation F<sub>0.5</sub></span>
        </div>
      </div>

      {/* Confusion Matrix & Training Info */}
      {metadata && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Validation Confusion Matrix
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">True Positives (TP)</span>
                <span className="text-xl font-mono font-bold text-white">{metadata.tp?.toLocaleString() || 0}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Correct Matches</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30">
                <span className="text-[10px] uppercase font-bold text-rose-400 block">False Positives (FP)</span>
                <span className="text-xl font-mono font-bold text-white">{metadata.fp?.toLocaleString() || 0}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Spurious Matches</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">False Negatives (FN)</span>
                <span className="text-xl font-mono font-bold text-white">{metadata.fn?.toLocaleString() || 0}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Missed Matches</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">True Negatives (TN)</span>
                <span className="text-xl font-mono font-bold text-white">{metadata.tn?.toLocaleString() || 0}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Correct Rejections</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-400" />
              Model Provenance & Metadata
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Training Dataset:</span>
                <span className="font-mono text-slate-200">{metadata.training_dataset || 'dataset_archive.zip'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Training Date:</span>
                <span className="font-mono text-slate-200">{metadata.training_date ? new Date(metadata.training_date).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Training Samples:</span>
                <span className="font-mono text-slate-200">{metadata.total_training_samples?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Model Artifact:</span>
                <span className="font-mono text-brand-300">backend/models/trained_model.joblib</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Importances */}
      {Object.keys(featureImportances).length > 0 && (
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-400" />
            Top Feature Importances (Weights in Decision Boundary)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {Object.entries(featureImportances)
              .sort((a: any, b: any) => b[1] - a[1])
              .slice(0, 12)
              .map(([k, v]: [string, any]) => (
                <div key={k} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block truncate" title={k}>
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-bold text-brand-300 font-mono">
                    {(v * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Retrain Model Action Section (Explicit Admin Operation) */}
      <div className="p-6 rounded-2xl glass-panel border border-amber-500/30 bg-amber-950/10 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-amber-500 dark:text-amber-300 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            Train / Retrain Supervised Model Suite (8 Algorithms)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select from 8 state-of-the-art classifier architectures with automated $F_{0.5}$-optimal decision boundary tuning.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select ML Algorithm Architecture
            </label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm"
            >
              <option value="super_ensemble_voting">🏆 Super-Ensemble Soft Voting (HistGB + ExtraTrees + RF + LR)</option>
              <option value="hist_gradient_boosting">🚀 Hist Gradient Boosting (Fast, Non-Linear Bins, Top F0.5)</option>
              <option value="extra_trees">🌲 Extra Trees Classifier (Extremely Randomized Ensembles)</option>
              <option value="random_forest">🌳 Random Forest Classifier (Bagged Decision Trees)</option>
              <option value="gradient_boosting">⚡ Gradient Boosted Decision Trees (Sequential Residuals)</option>
              <option value="mlp_neural_net">🧠 Deep Multi-Layer Perceptron (Neural Entity Embeddings)</option>
              <option value="adaboost">🎯 AdaBoost (Adaptive Weight Boosting)</option>
              <option value="logistic_regression">📈 L2 Regularized Logistic Regression (Linear Probabilistic)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Training Pairs Sample Limit
            </label>
            <select
              value={maxPairs}
              onChange={(e) => setMaxPairs(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm"
            >
              <option value={10000}>10,000 Pairs (Ultra Fast - 15s)</option>
              <option value={25000}>25,000 Pairs (Standard Benchmark - 35s)</option>
              <option value={50000}>50,000 Pairs (Maximum Production Precision - 60s)</option>
            </select>
          </div>
        </div>

        {/* Algorithm Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Model Architecture</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Inference Speed</th>
                <th className="p-2.5">Primary Strength</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr className={modelType === 'super_ensemble_voting' ? 'bg-brand-500/10 dark:bg-brand-500/20 font-semibold' : ''}>
                <td className="p-2.5 flex items-center gap-1.5">🏆 Super-Ensemble Voting</td>
                <td className="p-2.5">Meta-Ensemble</td>
                <td className="p-2.5 text-emerald-600 dark:text-emerald-400">High (Vectorized)</td>
                <td className="p-2.5">Maximum $F_{0.5}$ Stability across sources</td>
                <td className="p-2.5">{modelType === 'super_ensemble_voting' ? <span className="text-emerald-500 font-bold">Selected</span> : 'Ready'}</td>
              </tr>
              <tr className={modelType === 'hist_gradient_boosting' ? 'bg-brand-500/10 dark:bg-brand-500/20 font-semibold' : ''}>
                <td className="p-2.5 flex items-center gap-1.5">🚀 HistGradientBoosting</td>
                <td className="p-2.5">Histogram Boosting</td>
                <td className="p-2.5 text-emerald-600 dark:text-emerald-400">Ultra Fast (25k/sec)</td>
                <td className="p-2.5">Handles non-linear string feature interactions</td>
                <td className="p-2.5">{modelType === 'hist_gradient_boosting' ? <span className="text-emerald-500 font-bold">Selected</span> : 'Ready'}</td>
              </tr>
              <tr className={modelType === 'extra_trees' ? 'bg-brand-500/10 dark:bg-brand-500/20 font-semibold' : ''}>
                <td className="p-2.5 flex items-center gap-1.5">🌲 ExtraTrees</td>
                <td className="p-2.5">Randomized Forests</td>
                <td className="p-2.5 text-emerald-600 dark:text-emerald-400">Very Fast</td>
                <td className="p-2.5">Reduces variance & overfitting on sparse text</td>
                <td className="p-2.5">{modelType === 'extra_trees' ? <span className="text-emerald-500 font-bold">Selected</span> : 'Ready'}</td>
              </tr>
              <tr className={modelType === 'mlp_neural_net' ? 'bg-brand-500/10 dark:bg-brand-500/20 font-semibold' : ''}>
                <td className="p-2.5 flex items-center gap-1.5">🧠 MLP Neural Net</td>
                <td className="p-2.5">Deep Neural</td>
                <td className="p-2.5 text-indigo-600 dark:text-indigo-400">Medium</td>
                <td className="p-2.5">Continuous entity representation embeddings</td>
                <td className="p-2.5">{modelType === 'mlp_neural_net' ? <span className="text-emerald-500 font-bold">Selected</span> : 'Ready'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {trainResult && (
          <div className="p-3 rounded-xl bg-emerald-950/40 text-emerald-300 border border-emerald-800 text-xs font-medium">
            Retraining succeeded! New F<sub>0.5</sub>: {(trainResult.validation_f05 * 100).toFixed(1)}% | Precision: {(trainResult.validation_precision * 100).toFixed(1)}% | Optimal Threshold: {trainResult.threshold}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleRetrain}
            disabled={training}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50 transition"
          >
            {training ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {training ? 'Training & Tuning Optimal Threshold...' : 'Train Selected ML Architecture'}
          </button>
        </div>
      </div>
    </div>
  );
};
