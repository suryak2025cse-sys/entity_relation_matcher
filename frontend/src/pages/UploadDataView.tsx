import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { uploadDatasets, loadSampleDatasets } from '../services/api';

interface UploadDataViewProps {
  onUploadSuccess: () => void;
  onNavigateToValidation: () => void;
}

export const UploadDataView: React.FC<UploadDataViewProps> = ({
  onUploadSuccess,
  onNavigateToValidation
}) => {
  const [s1File, setS1File] = useState<File | null>(null);
  const [s2File, setS2File] = useState<File | null>(null);
  const [s3File, setS3File] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleQuickLoadSample = async () => {
    setLoadingSample(true);
    setMessage(null);
    try {
      const res = await loadSampleDatasets();
      setMessage(res.message || 'Successfully loaded 5k sample datasets!');
      onUploadSuccess();
    } catch (err: any) {
      setMessage(`Sample load error: ${err.message || String(err)}`);
    } finally {
      setLoadingSample(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s1File && !s2File && !s3File) {
      setMessage('Please select at least one source file to upload.');
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    if (s1File) formData.append('source1', s1File);
    if (s2File) formData.append('source2', s2File);
    if (s3File) formData.append('source3', s3File);

    try {
      const res = await uploadDatasets(formData);
      setMessage(res.message || 'Datasets uploaded successfully!');
      onUploadSuccess();
    } catch (err: any) {
      setMessage(`Upload error: ${err.message || String(err)}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Upload className="h-5 w-5 text-brand-400" />
          Phase 3 — Upload Future / User Datasets
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Upload new Source 1, Source 2, and Source 3 files. Uploaded datasets are matched using the pre-trained model.
        </p>
      </div>

      {/* Quick Benchmark Load & Reusable Model Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl glass-card border border-brand-500/30 bg-brand-950/20 flex items-start gap-3">
          <Zap className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Reusable Trained Model Policy
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Uploaded datasets will <strong>NOT</strong> retrain the model. They are matched using the saved model (<code>trained_model.joblib</code>).
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl glass-card border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Quick 5K Sample Datasets
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Instantly load 5,000-row test datasets for Source 1, 2, and 3 without uploading files manually.
            </p>
          </div>
          <button
            type="button"
            onClick={handleQuickLoadSample}
            disabled={loadingSample}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {loadingSample ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loadingSample ? 'Loading...' : 'Load 5K Sample'}
          </button>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="p-6 rounded-2xl glass-panel border border-slate-800 shadow-xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Source 1 */}
          <div className="p-4 rounded-xl glass-card border border-slate-700/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 block mb-1">
                Source 1 (Query Set)
              </span>
              <p className="text-xs text-slate-300 font-medium">Entities to be matched</p>
              <p className="text-[11px] text-slate-400 mt-0.5">e.g. <code>test_source1.tsv</code></p>
            </div>
            <div className="mt-4">
              <input
                type="file"
                accept=".tsv,.csv,.txt"
                onChange={(e) => setS1File(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-500/20 file:text-brand-300 hover:file:bg-brand-500/30 cursor-pointer"
              />
              {s1File && <p className="text-[10px] text-emerald-400 mt-1 truncate">Selected: {s1File.name}</p>}
            </div>
          </div>

          {/* Source 2 */}
          <div className="p-4 rounded-xl glass-card border border-slate-700/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                Source 2 (Target Set A)
              </span>
              <p className="text-xs text-slate-300 font-medium">Match candidates</p>
              <p className="text-[11px] text-slate-400 mt-0.5">e.g. <code>test_source2.tsv</code></p>
            </div>
            <div className="mt-4">
              <input
                type="file"
                accept=".tsv,.csv,.txt"
                onChange={(e) => setS2File(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 cursor-pointer"
              />
              {s2File && <p className="text-[10px] text-emerald-400 mt-1 truncate">Selected: {s2File.name}</p>}
            </div>
          </div>

          {/* Source 3 */}
          <div className="p-4 rounded-xl glass-card border border-slate-700/60 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                Source 3 (Target Set B)
              </span>
              <p className="text-xs text-slate-300 font-medium">Match candidates</p>
              <p className="text-[11px] text-slate-400 mt-0.5">e.g. <code>test_source3.tsv</code></p>
            </div>
            <div className="mt-4">
              <input
                type="file"
                accept=".tsv,.csv,.txt"
                onChange={(e) => setS3File(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 cursor-pointer"
              />
              {s3File && <p className="text-[10px] text-emerald-400 mt-1 truncate">Selected: {s3File.name}</p>}
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-xs font-medium ${
            message.includes('error') ? 'bg-rose-950/40 text-rose-300 border border-rose-800' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
          }`}>
            {message}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <p className="text-[11px] text-slate-400">
            TSV format with UTF-8 encoding expected.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={uploading || (!s1File && !s2File && !s3File)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50 transition"
            >
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Uploading Datasets...' : 'Upload Datasets'}
            </button>
            <button
              type="button"
              onClick={onNavigateToValidation}
              className="px-4 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1.5"
            >
              Go to Validation
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
