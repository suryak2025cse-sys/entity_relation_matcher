"""
Candidates API Endpoint: Handles inverted index blocking and candidate pair emission.
"""

import os
from fastapi import APIRouter, HTTPException, Query
from app.services.dataset_service import get_dataset_manager
from app.schemas.api_schemas import CandidateGenerationResponse

router = APIRouter(prefix="/api/candidates", tags=["Candidate Generation"])

@router.post("/generate", response_model=CandidateGenerationResponse)
def generate_candidates(
    dataset_type: str = Query("training", enum=["training", "test", "uploaded"]),
    max_s1_records: int = Query(25000, description="Max Source 1 records to generate candidates for")
):
    manager = get_dataset_manager()
    prep_files = manager.preprocessing_service.get_processed_files()

    prefix = "train" if dataset_type == "training" else ("test" if dataset_type == "test" else "uploaded")
    s1_path = prep_files.get(f"{prefix}_source1_processed.tsv")
    s2_path = prep_files.get(f"{prefix}_source2_processed.tsv")
    s3_path = prep_files.get(f"{prefix}_source3_processed.tsv")

    if not s1_path or not os.path.isfile(s1_path):
        raise HTTPException(status_code=400, detail=f"Preprocessed Source 1 file ({prefix}_source1_processed.tsv) not found. Run preprocessing first.")

    try:
        # 1. Build Index on Source 2 and 3
        manager.candidate_service.build_index(
            source2_path=s2_path or "",
            source3_path=s3_path or "",
            max_records_per_source=max_s1_records * 2
        )

        # 2. Stream candidate generation
        cand_summary = manager.candidate_service.generate_candidates_stream(
            source1_path=s1_path,
            max_s1_records=max_s1_records
        )

        manager.last_candidate_report = cand_summary
        return CandidateGenerationResponse(**cand_summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Candidate generation error: {str(e)}")

@router.get("/summary")
def get_candidate_summary():
    manager = get_dataset_manager()
    if manager.last_candidate_report:
        return manager.last_candidate_report
    return {"total_source1_entities": 0, "total_candidate_pairs": 0, "sample_candidates": []}
