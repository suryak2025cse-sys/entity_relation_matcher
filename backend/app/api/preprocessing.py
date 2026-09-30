"""
Preprocessing API Endpoint: Triggers chunked normalization pipeline.
"""

import os
from fastapi import APIRouter, HTTPException, Query
from app.services.dataset_service import get_dataset_manager
from app.schemas.api_schemas import PreprocessingResponse

router = APIRouter(prefix="/api/preprocessing", tags=["Data Preprocessing"])

@router.post("/run", response_model=PreprocessingResponse)
def run_preprocessing(
    dataset_type: str = Query("training", enum=["training", "test", "uploaded"]),
    max_rows: int = Query(50000, description="Max rows per file to process for rapid processing/caching")
):
    manager = get_dataset_manager()
    status = manager.archive_service.get_archive_status()
    
    if dataset_type == "uploaded" and manager.uploaded_files:
        s1_in = manager.uploaded_files.get("source1")
        s2_in = manager.uploaded_files.get("source2")
        s3_in = manager.uploaded_files.get("source3")
        prefix = "uploaded"
    elif dataset_type == "test":
        s1_in = status.get("test_source1_file")
        s2_in = status.get("test_source2_file")
        s3_in = status.get("test_source3_file")
        prefix = "test"
    else:
        s1_in = status.get("source1_file")
        s2_in = status.get("source2_file")
        s3_in = status.get("source3_file")
        prefix = "train"

    counts = {}
    samples = []

    try:
        if s1_in and os.path.isfile(s1_in):
            r1 = manager.preprocessing_service.process_file(s1_in, f"{prefix}_source1_processed.tsv", max_rows=max_rows)
            counts["source1"] = r1["total_processed"]
            samples.extend(r1.get("sample_transformations", []))

        if s2_in and os.path.isfile(s2_in):
            r2 = manager.preprocessing_service.process_file(s2_in, f"{prefix}_source2_processed.tsv", max_rows=max_rows)
            counts["source2"] = r2["total_processed"]

        if s3_in and os.path.isfile(s3_in):
            r3 = manager.preprocessing_service.process_file(s3_in, f"{prefix}_source3_processed.tsv", max_rows=max_rows)
            counts["source3"] = r3["total_processed"]

        manager.last_preprocessing_report = {
            "processed_counts": counts,
            "sample_transformations": samples
        }

        return PreprocessingResponse(
            success=True,
            message="Preprocessing completed successfully.",
            processed_counts=counts,
            sample_transformations=samples[:10]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preprocessing error: {str(e)}")

@router.get("/sample-transformations")
def get_sample_transformations():
    manager = get_dataset_manager()
    if manager.last_preprocessing_report:
        return manager.last_preprocessing_report
    return {"processed_counts": {}, "sample_transformations": []}
