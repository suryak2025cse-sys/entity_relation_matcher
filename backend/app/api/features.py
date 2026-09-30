"""
Features API Endpoint: Manages feature definitions, sample vectors, and feature configuration.
"""

from fastapi import APIRouter
from app.services.dataset_service import get_dataset_manager
from app.schemas.api_schemas import FeatureGenerationResponse

router = APIRouter(prefix="/api/features", tags=["Feature Engineering"])

@router.get("/config")
def get_feature_config():
    manager = get_dataset_manager()
    return manager.feature_service.extractor.get_config()

@router.get("/sample-features", response_model=FeatureGenerationResponse)
@router.get("/sample", response_model=FeatureGenerationResponse)
def get_sample_features():
    manager = get_dataset_manager()
    cand_report = manager.last_candidate_report or {}
    sample_cands = cand_report.get("sample_candidates", [])
    
    sample_rows = []
    for c in sample_cands[:8]:
        s1_rec = {
            "entity_id": c["source1_id"],
            "business_name": c["source1_name"],
            "business_name_normalized": c["source1_name"].lower(),
            "business_address": c["source1_address"],
            "business_address_normalized": c["source1_address"].lower(),
            "country_normalized": "US"
        }
        cand_rec = {
            "entity_id": c["candidate_id"],
            "business_name": c["candidate_name"],
            "business_name_normalized": c["candidate_name"].lower(),
            "business_address": c["candidate_address"],
            "business_address_normalized": c["candidate_address"].lower(),
            "country_normalized": "US"
        }
        feats = manager.feature_service.extract_single_pair(s1_rec, cand_rec, c.get("candidate_source", "source2"))
        sample_rows.append({
            "source1_id": c["source1_id"],
            "candidate_id": c["candidate_id"],
            "source": c.get("candidate_source", "source2"),
            **feats
        })

    return FeatureGenerationResponse(
        success=True,
        total_feature_vectors=len(sample_rows),
        feature_names=manager.feature_service.get_feature_names(),
        sample_feature_rows=sample_rows
    )
