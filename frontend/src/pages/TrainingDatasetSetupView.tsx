import React, { useState } from 'react';
import { 
  Archive, 
  CheckCircle2, 
  FileText, 
  Layers, 
  AlertCircle, 
  RefreshCw, 
  FolderCheck,
  Play,
  ArrowRight
} from 'lucide-react';
import { ArchiveStatus, extractArchive } from '../services/api';

interface TrainingDatasetSetupViewProps {
  archiveStatus: ArchiveStatus | null;
  onRefresh: () => void;
  onNavigateToValidation: () => void;
}

export const TrainingDatasetSetupView: React.FC<TrainingDatasetSetupViewProps> = ({
  archiveStatus,
  onRefresh,
  onNavigateToValidation
}) => {
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);

  const handleExtract = async () => {
    setExtracting(true);
    setExtractMsg(null);
    try {
      await extractArchive();
      setExtractMsg('Archive extracted successfully!');
      onRefresh();
    } catch (err: any) {
      setExtractMsg(`Extraction error: ${err.message || String(err)}`);
    } finally {
      setExtracting(false);
    }
  };

  const isDetected = archiveStatus?.detected ?? false;
  const isExtracted = archiveStatus?.is_extracted ?? false;
  const extractedFiles = archiveStatus?.extracted_files || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Archive className="h-5 w-5 text-brand-400" />
          Phase 2 — Training Dataset Setup
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Detect, inspect, and safely extract the large fixed training dataset archive. The original archive is never modified.
        </p>
      </div>

      {/* Archive Detection Status Card */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              isDetected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {isDetected ? <FolderCheck className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isDetected ? `Archive Detected: ${archiveStatus?.archive_name}` : 'No Training Archive Found'}
              </h3>
              <p className="text-xs text-slate-400">
                {isDetected ? `Size: ${archiveStatus?.file_size_formatted}` : 'Place dataset_archive.zip or archive.zip in backend/data/training/'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isDetected && !isExtracted && (
              <button
                onClick={handleExtract}
                disabled={extracting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50 transition"
              >
                {extracting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {extracting ? 'Extracting Archive...' : 'Extract Archive Safely'}
              </button>
            )}
            {isExtracted && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Extracted & Ready
              </span>
            )}
          </div>
        </div>

        {extractMsg && (
          <div className={`p-3 rounded-xl text-xs font-medium ${
            extractMsg.includes('error') ? 'bg-rose-950/40 text-rose-300 border border-rose-800' : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
          }`}>
            {extractMsg}
          </div>
        )}
      </div>

      {/* Discovered Dataset Structure */}
      {isExtracted && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-400" />
              Discovered Dataset Files ({extractedFiles.length} files)
            </h3>
            <button
              onClick={onNavigateToValidation}
              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
            >
              Proceed to Validation
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {extractedFiles.map((file, idx) => {
              const rel = file.relative_path.toLowerCase();
              let category = 'Extracted File';
              let badgeColor = 'bg-slate-800 text-slate-300';
              if (rel.includes('ground_truth')) {
                category = 'Ground Truth (Train)';
                badgeColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
              } else if (rel.includes('train')) {
                category = 'Training Source';
                badgeColor = 'bg-brand-500/20 text-brand-400 border border-brand-500/30';
              } else if (rel.includes('test')) {
                category = 'Test Source';
                badgeColor = 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
              }

              return (
                <div key={idx} className="p-3.5 rounded-xl glass-card border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${badgeColor}`}>
                        {category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{file.size_mb} MB</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 break-all">{file.filename}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-1">{file.relative_path}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
