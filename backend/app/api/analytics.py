"""
Analytics API Endpoint: Comprehensive metric breakdowns across datasets, blocking, matching, and model.
"""

from fastapi import APIRouter
from app.services.dataset_service import get_dataset_manager
from app.schemas.api_schemas import AnalyticsResponse

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Insights"])

@router.get("/summary", response_model=AnalyticsResponse)
def get_analytics_summary():
    manager = get_dataset_manager()
    analytics = manager.analytics_service.get_complete_analytics(
        dataset_validation_stats=manager.last_validation_report,
        candidate_stats=manager.last_candidate_report,
        matching_stats=manager.matching_service.last_matching_summary
    )
    return AnalyticsResponse(**analytics)
