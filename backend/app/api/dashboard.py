"""
Dashboard API Endpoint: Returns real-time system state, model status, and pipeline progress.
"""

import os
from fastapi import APIRouter
from app.services.dataset_service import get_dataset_manager
from app.schemas.api_schemas import DashboardResponse, PipelineStatusItem

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/status", response_model=DashboardResponse)
def get_dashboard_status():
    manager = get_dataset_manager()
    archive_status = manager.archive_service.get_archive_status()
    model_metadata = manager.training_service.get_current_model_metadata()

    is_trained = model_metadata is not None
    model_name = model_metadata.get("model_type", "None") if is_trained else "Not Trained"
    model_version = model_metadata.get("model_version", "v1") if is_trained else "None"
    threshold = float(model_metadata.get("threshold", 0.65)) if is_trained else 0.65
    training_records = int(model_metadata.get("total_training_samples", 0)) if is_trained else 0
    f05 = float(model_metadata.get("validation_f05", 0.0)) if is_trained else None
    precision = float(model_metadata.get("validation_precision", 0.0)) if is_trained else None
    recall = float(model_metadata.get("validation_recall", 0.0)) if is_trained else None

    # Pipeline checklist state
    has_archive = archive_status.get("detected", False)
    is_extracted = archive_status.get("is_extracted", False)
    has_processed = len(manager.preprocessing_service.get_processed_files()) > 0
    
    outputs = manager.output_service.get_output_paths()
    has_candidate_file = outputs["candidate_pairs_path"] is not None
    has_matching_file = outputs["matching_results_path"] is not None

    steps = [
        PipelineStatusItem(
            id="archive",
            name="Training Dataset Archive",
            completed=has_archive and is_extracted,
            status_text="Extracted and Ready" if is_extracted else ("Detected" if has_archive else "Missing Archive")
        ),
        PipelineStatusItem(
            id="validation",
            name="Data Validation",
            completed=manager.last_validation_report is not None and manager.last_validation_report.get("is_valid", False),
            status_text="Validated" if manager.last_validation_report and manager.last_validation_report.get("is_valid") else "Pending Validation"
        ),
        PipelineStatusItem(
            id="preprocessing",
            name="Data Preprocessing",
            completed=has_processed,
            status_text="Preprocessed" if has_processed else "Pending Preprocessing"
        ),
        PipelineStatusItem(
            id="candidates",
            name="Candidate Generation",
            completed=has_candidate_file,
            status_text="Candidates Generated" if has_candidate_file else "Pending Blocking"
        ),
        PipelineStatusItem(
            id="model",
            name="Model Training & Validation",
            completed=is_trained,
            status_text=f"Trained ({model_name})" if is_trained else "Model Not Trained"
        ),
        PipelineStatusItem(
            id="matching",
            name="Matching Records",
            completed=has_matching_file,
            status_text="Matching Completed" if has_matching_file else "Ready for Matching" if is_trained else "Awaiting Model"
        ),
        PipelineStatusItem(
            id="output",
            name="Output Validation",
            completed=has_matching_file and manager.output_service.validate_outputs()["is_valid"],
            status_text="Validated & Ready to Download" if has_matching_file and manager.output_service.validate_outputs()["is_valid"] else "Pending"
        )
    ]

    return DashboardResponse(
        is_model_trained=is_trained,
        model_name=model_name,
        model_version=model_version,
        threshold=threshold,
        training_dataset_status="Available" if has_archive else "Not Found",
        training_dataset_name=archive_status.get("archive_name"),
        training_records=training_records,
        validation_f05=f05,
        validation_precision=precision,
        validation_recall=recall,
        pipeline_steps=steps,
        ready_for_matching=is_trained and (has_processed or is_extracted),
        active_data_source=manager.active_data_source,
        has_uploaded_files=bool(manager.uploaded_files),
        uploaded_files_count=len(manager.uploaded_files)
    )
