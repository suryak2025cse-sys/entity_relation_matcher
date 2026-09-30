"""
Training API Endpoint: Archive setup, dataset extraction, model training, and retraining.
"""

import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services.dataset_service import get_dataset_manager
from app.schemas.api_schemas import (
    ArchiveInspectionResponse,
    TrainingRequest,
    TrainingResponse
)

router = APIRouter(prefix="/api/training", tags=["Training & Model Setup"])

@router.get("/archive-status", response_model=ArchiveInspectionResponse)
def get_archive_status():
    manager = get_dataset_manager()
    status = manager.archive_service.get_archive_status()
    return ArchiveInspectionResponse(**status)

@router.post("/extract-archive")
def extract_archive():
    manager = get_dataset_manager()
    try:
        res = manager.archive_service.extract_archive()
        return {"success": True, "message": "Archive extracted successfully.", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/train", response_model=TrainingResponse)
def train_model(request: TrainingRequest):
    manager = get_dataset_manager()
    
    # Check if files extracted
    status = manager.archive_service.get_archive_status()
    if not status.get("is_extracted"):
        # Auto-extract if needed
        manager.archive_service.extract_archive()
        status = manager.archive_service.get_archive_status()

    # Preprocessed files or raw files
    prep_files = manager.preprocessing_service.get_processed_files()
    
    s1_path = prep_files.get("train_source1_processed.tsv")
    s2_path = prep_files.get("train_source2_processed.tsv")
    s3_path = prep_files.get("train_source3_processed.tsv")
    
    # If not preprocessed yet, trigger preprocessing on training files
    if not (s1_path and (s2_path or s3_path)):
        if status.get("source1_file"):
            manager.preprocessing_service.process_file(status["source1_file"], "train_source1_processed.tsv")
        if status.get("source2_file"):
            manager.preprocessing_service.process_file(status["source2_file"], "train_source2_processed.tsv")
        if status.get("source3_file"):
            manager.preprocessing_service.process_file(status["source3_file"], "train_source3_processed.tsv")
            
        prep_files = manager.preprocessing_service.get_processed_files()
        s1_path = prep_files.get("train_source1_processed.tsv")
        s2_path = prep_files.get("train_source2_processed.tsv")
        s3_path = prep_files.get("train_source3_processed.tsv")

    gt_path = status.get("ground_truth_file")
    if not gt_path or not os.path.isfile(gt_path):
        raise HTTPException(status_code=400, detail="Ground truth file not found in extracted dataset.")

    try:
        metadata = manager.training_service.train_model(
            s1_processed_path=s1_path,
            s2_processed_path=s2_path or "",
            s3_processed_path=s3_path or "",
            ground_truth_path=gt_path,
            model_type=request.model_type or "hist_gradient_boosting",
            max_positive_pairs=request.max_training_pairs or 25000,
            dataset_name=status.get("archive_name", "dataset_archive.zip")
        )
        return TrainingResponse(success=True, **metadata)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@router.get("/model-metadata")
def get_model_metadata():
    manager = get_dataset_manager()
    meta = manager.training_service.get_current_model_metadata()
    if not meta:
        raise HTTPException(status_code=404, detail="No trained model found.")
    return meta
