"""
Output Validation & Download API Endpoint.
"""

import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.services.dataset_service import get_dataset_manager
from app.schemas.api_schemas import OutputValidationResponse

router = APIRouter(prefix="/api/output", tags=["Output Validation & Download"])

@router.get("/validate", response_model=OutputValidationResponse)
@router.post("/validate", response_model=OutputValidationResponse)
def validate_output_files():
    manager = get_dataset_manager()
    last_matched = manager.matching_service.last_matched_source1_path
    last_count = manager.matching_service.last_matched_s1_records_count
    
    if last_matched and os.path.isfile(last_matched):
        s1_ref = last_matched
    else:
        status = manager.archive_service.get_archive_status()
        s1_ref = status.get("test_source1_file") or status.get("source1_file")
    
    val_report = manager.output_service.validate_outputs(
        source1_file=s1_ref,
        max_reference_rows=last_count if last_count > 0 else None
    )
    return OutputValidationResponse(**val_report)

@router.get("/download/matching-results")
def download_matching_results():
    manager = get_dataset_manager()
    paths = manager.output_service.get_output_paths()
    match_path = paths.get("matching_results_path")
    if not match_path or not os.path.isfile(match_path):
        raise HTTPException(status_code=404, detail="matching_results.tsv not found. Run matching first.")
    
    return FileResponse(
        match_path,
        filename="matching_results.tsv",
        media_type="text/tab-separated-values"
    )

@router.get("/download/candidate-pairs")
def download_candidate_pairs():
    manager = get_dataset_manager()
    paths = manager.output_service.get_output_paths()
    cand_path = paths.get("candidate_pairs_path")
    if not cand_path or not os.path.isfile(cand_path):
        raise HTTPException(status_code=404, detail="candidate_pairs.tsv not found. Run candidate generation first.")
    
    return FileResponse(
        cand_path,
        filename="candidate_pairs.tsv",
        media_type="text/tab-separated-values"
    )
