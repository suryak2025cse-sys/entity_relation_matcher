"""
Matching API Endpoint: Normal inference engine using the SAVED trained model.
STRICT RULE: DOES NOT RETRAIN THE MODEL. Reuses backend/models/trained_model.joblib.
"""

import os
from fastapi import APIRouter, HTTPException, Query
from app.services.dataset_service import get_dataset_manager
from app.schemas.api_schemas import MatchingRequest

router = APIRouter(prefix="/api/matching", tags=["Matching Engine"])

@router.post("/run")
def run_matching(
    dataset_type: str = Query("test", enum=["test", "training", "uploaded"]),
    threshold_override: float = Query(None, description="Optional custom threshold override"),
    max_records: int = Query(25000, description="Max Source 1 records to match")
):
    manager = get_dataset_manager()
    status = manager.archive_service.get_archive_status()

    # Determine files to use
    prep_files = manager.preprocessing_service.get_processed_files()

    prefix = "test" if dataset_type == "test" else ("uploaded" if dataset_type == "uploaded" else "train")
    s1_path = prep_files.get(f"{prefix}_source1_processed.tsv")
    s2_path = prep_files.get(f"{prefix}_source2_processed.tsv")
    s3_path = prep_files.get(f"{prefix}_source3_processed.tsv")

    # If test datasets not preprocessed yet, do so automatically
    if not s1_path or not os.path.isfile(s1_path):
        if dataset_type == "test":
            if status.get("test_source1_file"):
                manager.preprocessing_service.process_file(status["test_source1_file"], "test_source1_processed.tsv", max_rows=max_records)
            if status.get("test_source2_file"):
                manager.preprocessing_service.process_file(status["test_source2_file"], "test_source2_processed.tsv", max_rows=max_records)
            if status.get("test_source3_file"):
                manager.preprocessing_service.process_file(status["test_source3_file"], "test_source3_processed.tsv", max_rows=max_records)
        elif dataset_type == "uploaded":
            if manager.uploaded_files.get("source1"):
                manager.preprocessing_service.process_file(manager.uploaded_files["source1"], "uploaded_source1_processed.tsv", max_rows=max_records)
            if manager.uploaded_files.get("source2"):
                manager.preprocessing_service.process_file(manager.uploaded_files["source2"], "uploaded_source2_processed.tsv", max_rows=max_records)
            if manager.uploaded_files.get("source3"):
                manager.preprocessing_service.process_file(manager.uploaded_files["source3"], "uploaded_source3_processed.tsv", max_rows=max_records)
        
        prep_files = manager.preprocessing_service.get_processed_files()
        s1_path = prep_files.get(f"{prefix}_source1_processed.tsv")
        s2_path = prep_files.get(f"{prefix}_source2_processed.tsv")
        s3_path = prep_files.get(f"{prefix}_source3_processed.tsv")

    if not s1_path or not os.path.isfile(s1_path):
        raise HTTPException(status_code=400, detail=f"Source 1 preprocessed dataset not found for dataset type: {dataset_type}.")

    try:
        match_summary = manager.matching_service.match_records(
            source1_processed_path=s1_path,
            source2_processed_path=s2_path or "",
            source3_processed_path=s3_path or "",
            threshold_override=threshold_override,
            max_s1_records=max_records
        )
        return {
            "success": True,
            "message": "Matching completed successfully using saved model.",
            "data": match_summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching execution error: {str(e)}")
