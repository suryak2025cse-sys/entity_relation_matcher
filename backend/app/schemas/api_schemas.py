"""
Pydantic Schemas for Entity Resolution Platform API.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class PipelineStatusItem(BaseModel):
    id: str
    name: str
    completed: bool
    status_text: str

class DashboardResponse(BaseModel):
    is_model_trained: bool
    model_name: str
    model_version: str
    threshold: float
    training_dataset_status: str
    training_dataset_name: Optional[str] = None
    training_records: int
    validation_f05: Optional[float] = None
    validation_precision: Optional[float] = None
    validation_recall: Optional[float] = None
    pipeline_steps: List[PipelineStatusItem]
    ready_for_matching: bool
    active_data_source: str = "extracted"
    has_uploaded_files: bool = False
    uploaded_files_count: int = 0

class ArchiveInspectionResponse(BaseModel):
    detected: bool
    archive_path: Optional[str] = None
    archive_name: Optional[str] = None
    file_size_bytes: int = 0
    file_size_formatted: str = ""
    is_extracted: bool = False
    extracted_files: List[Dict[str, Any]] = []
    source1_file: Optional[str] = None
    source2_file: Optional[str] = None
    source3_file: Optional[str] = None
    ground_truth_file: Optional[str] = None
    test_source1_file: Optional[str] = None
    test_source2_file: Optional[str] = None
    test_source3_file: Optional[str] = None

class ValidationReport(BaseModel):
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    sources: Dict[str, Any] = {}
    ground_truth: Optional[Dict[str, Any]] = None

class PreprocessingResponse(BaseModel):
    success: bool
    message: str
    processed_counts: Dict[str, int] = {}
    sample_transformations: List[Dict[str, Any]] = []

class CandidateGenerationResponse(BaseModel):
    success: bool
    total_source1_entities: int = 0
    total_candidate_pairs: int = 0
    avg_candidates_per_entity: float = 0.0
    blocking_method_breakdown: Dict[str, int] = {}
    sample_candidates: List[Dict[str, Any]] = []

class FeatureGenerationResponse(BaseModel):
    success: bool
    total_feature_vectors: int = 0
    feature_names: List[str] = []
    sample_feature_rows: List[Dict[str, Any]] = []

class TrainingRequest(BaseModel):
    model_type: Optional[str] = "hist_gradient_boosting" # "hist_gradient_boosting", "random_forest", "logistic_regression"
    max_training_pairs: Optional[int] = 50000
    force_retrain: Optional[bool] = False

class TrainingResponse(BaseModel):
    success: bool
    model_version: str
    model_type: str
    training_date: str
    threshold: float
    validation_precision: float
    validation_recall: float
    validation_f05: float
    validation_f1: float
    validation_accuracy: float
    tp: int
    fp: int
    tn: int
    fn: int
    total_training_samples: int
    feature_importances: Dict[str, float] = {}
    threshold_curve: List[Dict[str, Any]] = []

class MatchingRequest(BaseModel):
    threshold_override: Optional[float] = None
    use_uploaded_dataset: Optional[bool] = False
    max_records: Optional[int] = None

class MatchExplanation(BaseModel):
    s1_id: str
    s1_name: str
    s1_address: str
    s1_country: str
    matched_id: str
    matched_name: str
    matched_address: str
    matched_country: str
    matched_source: str
    confidence: float
    is_match: bool
    name_similarity_pct: float
    address_similarity_pct: float
    country_match: bool
    feature_breakdown: Dict[str, float] = {}

class MatchResultItem(BaseModel):
    source1_entity_id: str
    source1_business_name: str
    source1_address: str
    source1_country: str
    matched_entity_ids: List[str] = []
    matched_entities_details: List[Dict[str, Any]] = []
    best_confidence: float = 0.0
    has_match: bool = False

class PaginatedResultsResponse(BaseModel):
    total_entities: int
    total_matches: int
    unmatched_entities: int
    high_confidence_count: int
    medium_confidence_count: int
    page: int
    page_size: int
    total_pages: int
    results: List[MatchResultItem]

class AnalyticsResponse(BaseModel):
    dataset_summary: Dict[str, Any]
    candidate_summary: Dict[str, Any]
    matching_summary: Dict[str, Any]
    model_summary: Dict[str, Any]

class OutputValidationResponse(BaseModel):
    is_valid: bool
    matching_file_present: bool
    candidate_file_present: bool
    errors: List[str] = []
    warnings: List[str] = []
    total_s1_rows: int = 0
    empty_matches_count: int = 0
    non_empty_matches_count: int = 0
    ready_for_download: bool = False
