import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface PipelineStep {
  id: string;
  name: string;
  completed: boolean;
  status_text: string;
}

export interface DashboardData {
  is_model_trained: boolean;
  model_name: string;
  model_version: string;
  threshold: number;
  training_dataset_status: string;
  training_dataset_name?: string;
  training_records: number;
  validation_f05?: number;
  validation_precision?: number;
  validation_recall?: number;
  pipeline_steps: PipelineStep[];
  ready_for_matching: boolean;
  active_data_source?: string;
  has_uploaded_files?: boolean;
  uploaded_files_count?: number;
}

export interface ArchiveStatus {
  detected: boolean;
  archive_path?: string;
  archive_name?: string;
  file_size_bytes: number;
  file_size_formatted: string;
  is_extracted: boolean;
  extracted_files: Array<{
    relative_path: string;
    full_path: string;
    filename: string;
    size_bytes: number;
    size_mb: number;
  }>;
  source1_file?: string;
  source2_file?: string;
  source3_file?: string;
  ground_truth_file?: string;
  test_source1_file?: string;
  test_source2_file?: string;
  test_source3_file?: string;
}

export interface ValidationReport {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  sources: Record<string, any>;
  ground_truth?: any;
}

export interface PreprocessingReport {
  success: boolean;
  message: string;
  processed_counts: Record<string, number>;
  sample_transformations: Array<{
    raw_name: string;
    normalized_name: string;
    stem_name: string;
    raw_address: string;
    normalized_address: string;
    raw_country: string;
    normalized_country: string;
  }>;
}

export interface CandidateReport {
  success: boolean;
  total_source1_entities: number;
  total_candidate_pairs: number;
  avg_candidates_per_entity: number;
  blocking_method_breakdown: Record<string, number>;
  sample_candidates: Array<{
    source1_id: string;
    source1_name: string;
    source1_address: string;
    candidate_id: string;
    candidate_name: string;
    candidate_address: string;
    candidate_source: string;
    blocking_method: string;
    total_candidates_for_s1: number;
  }>;
}

export interface TrainingResponse {
  success: boolean;
  model_version: string;
  model_type: string;
  training_date: string;
  threshold: number;
  validation_precision: number;
  validation_recall: number;
  validation_f05: number;
  validation_f1: number;
  validation_accuracy: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  total_training_samples: number;
  feature_importances: Record<string, number>;
  threshold_curve: Array<{
    threshold: number;
    f05: number;
    f1: number;
    precision: number;
    recall: number;
    tp: number;
    fp: number;
  }>;
}

export interface MatchResultItem {
  source1_entity_id: string;
  source1_business_name: string;
  source1_address: string;
  source1_country: string;
  matched_entity_ids: string[];
  matched_entities_details: Array<{
    matched_id: string;
    matched_name: string;
    matched_address: string;
    matched_country: string;
    matched_source: string;
    confidence: number;
    name_similarity_pct: number;
    address_similarity_pct: number;
    country_match: boolean;
    features: Record<string, number>;
  }>;
  best_confidence: number;
  has_match: boolean;
}

export interface PaginatedResults {
  total_entities: number;
  total_matches: number;
  unmatched_entities: number;
  high_confidence_count: number;
  medium_confidence_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  filtered_total: number;
  results: MatchResultItem[];
}

export interface MatchExplanation {
  s1_id: string;
  s1_name: string;
  s1_address: string;
  s1_country: string;
  matched_id: string;
  matched_name: string;
  matched_address: string;
  matched_country: string;
  matched_source: string;
  confidence: number;
  is_match: boolean;
  name_similarity_pct: number;
  address_similarity_pct: number;
  country_match: boolean;
  feature_breakdown: Record<string, number>;
}

export interface OutputValidationReport {
  is_valid: boolean;
  matching_file_present: boolean;
  candidate_file_present: boolean;
  errors: string[];
  warnings: string[];
  total_s1_rows: number;
  empty_matches_count: number;
  non_empty_matches_count: number;
  ready_for_download: boolean;
}

// API Functions
export const fetchDashboardStatus = async (): Promise<DashboardData> => {
  const { data } = await api.get('/api/dashboard/status');
  return data;
};

export const fetchArchiveStatus = async (): Promise<ArchiveStatus> => {
  const { data } = await api.get('/api/training/archive-status');
  return data;
};

export const extractArchive = async (): Promise<any> => {
  const { data } = await api.post('/api/training/extract-archive');
  return data;
};

export const trainModel = async (params: {
  model_type?: string;
  max_training_pairs?: number;
  force_retrain?: boolean;
}): Promise<TrainingResponse> => {
  const { data } = await api.post('/api/training/train', params);
  return data;
};

export const fetchModelMetadata = async (): Promise<any> => {
  const { data } = await api.get('/api/training/model-metadata');
  return data;
};

export const uploadDatasets = async (formData: FormData): Promise<any> => {
  const { data } = await api.post('/api/upload/datasets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const loadSampleDatasets = async (): Promise<any> => {
  const { data } = await api.post('/api/upload/load-sample');
  return data;
};

export const fetchUploadStatus = async (): Promise<any> => {
  const { data } = await api.get('/api/upload/status');
  return data;
};

export const fetchValidationReport = async (datasetType: string = 'training'): Promise<ValidationReport> => {
  const { data } = await api.get(`/api/validation/report?dataset_type=${datasetType}`);
  return data;
};

export const runPreprocessing = async (datasetType: string = 'training', maxRows: number = 50000): Promise<PreprocessingReport> => {
  const { data } = await api.post(`/api/preprocessing/run?dataset_type=${datasetType}&max_rows=${maxRows}`);
  return data;
};

export const generateCandidates = async (datasetType: string = 'training', maxS1: number = 25000): Promise<CandidateReport> => {
  const { data } = await api.post(`/api/candidates/generate?dataset_type=${datasetType}&max_s1_records=${maxS1}`);
  return data;
};

export const fetchSampleFeatures = async (): Promise<any> => {
  const { data } = await api.get('/api/features/sample-features');
  return data;
};

export const runMatching = async (datasetType: string = 'test', thresholdOverride?: number, maxRecords: number = 25000): Promise<any> => {
  let url = `/api/matching/run?dataset_type=${datasetType}&max_records=${maxRecords}`;
  if (thresholdOverride !== undefined && thresholdOverride !== null) {
    url += `&threshold_override=${thresholdOverride}`;
  }
  const { data } = await api.post(url);
  return data;
};

export const fetchResultsList = async (params: {
  page?: number;
  page_size?: number;
  search?: string;
  only_matches?: boolean;
  source_filter?: string;
}): Promise<PaginatedResults> => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.page_size) query.append('page_size', params.page_size.toString());
  if (params.search) query.append('search', params.search);
  if (params.only_matches !== undefined) query.append('only_matches', String(params.only_matches));
  if (params.source_filter) query.append('source_filter', params.source_filter);

  const { data } = await api.get(`/api/results/list?${query.toString()}`);
  return data;
};

export const explainMatchPair = async (s1Record: any, candRecord: any, source: string = 'source2'): Promise<MatchExplanation> => {
  const { data } = await api.post('/api/results/explain', {
    s1_record: s1Record,
    cand_record: candRecord,
    source: source,
  });
  return data;
};

export const fetchAnalyticsSummary = async (): Promise<any> => {
  const { data } = await api.get('/api/analytics/summary');
  return data;
};

export const fetchOutputValidation = async (): Promise<OutputValidationReport> => {
  const { data } = await api.get('/api/output/validate');
  return data;
};

export const DOWNLOAD_MATCHING_URL = `${API_BASE_URL}/api/output/download/matching-results`;
export const DOWNLOAD_CANDIDATES_URL = `${API_BASE_URL}/api/output/download/candidate-pairs`;
