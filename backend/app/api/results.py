"""
Results API Endpoint: Searchable, paginated match results and explainable match inspection.
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Body
from app.services.dataset_service import get_dataset_manager
from app.schemas.api_schemas import PaginatedResultsResponse, MatchExplanation

router = APIRouter(prefix="/api/results", tags=["Results & Explainability"])

@router.get("/list", response_model=PaginatedResultsResponse)
@router.get("/paginated", response_model=PaginatedResultsResponse)
def get_results_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    only_matches: Optional[bool] = Query(None),
    source_filter: Optional[str] = Query(None)
):
    manager = get_dataset_manager()
    res = manager.matching_service.get_paginated_results(
        page=page,
        page_size=page_size,
        search_query=search,
        only_matches=only_matches,
        source_filter=source_filter
    )
    return PaginatedResultsResponse(**res)

@router.post("/explain", response_model=MatchExplanation)
def explain_match_pair(
    s1_record: dict = Body(...),
    cand_record: dict = Body(...),
    source: str = Body("source2")
):
    manager = get_dataset_manager()
    explanation = manager.matching_service.explain_match(s1_record, cand_record, candidate_source=source)
    return MatchExplanation(**explanation)
