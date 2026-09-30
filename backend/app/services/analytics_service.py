"""
Analytics Service: Aggregates metrics across datasets, blocking, matching, and model training.
"""

import os
import json
from typing import Dict, Any, List, Optional

from app.ml.model import MODELS_DIR
from app.services.matching_service import OUTPUTS_DIR

class AnalyticsService:
    def get_complete_analytics(
        self,
        dataset_validation_stats: Optional[Dict[str, Any]] = None,
        candidate_stats: Optional[Dict[str, Any]] = None,
        matching_stats: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Gathers analytics across dataset, candidate, matching, and model dimensions.
        """
        # 1. Model Summary
        model_meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
        model_summary = {}
        if os.path.isfile(model_meta_path):
            with open(model_meta_path, "r", encoding="utf-8") as f:
                model_summary = json.load(f)

        # 2. Matching Summary from disk if not in-memory
        if not matching_stats:
            summary_path = os.path.join(OUTPUTS_DIR, "matching_summary.json")
            if os.path.isfile(summary_path):
                with open(summary_path, "r", encoding="utf-8") as f:
                    matching_stats = json.load(f)
            else:
                matching_stats = {}

        return {
            "dataset_summary": dataset_validation_stats or {
                "total_records": 0,
                "sources": {}
            },
            "candidate_summary": candidate_stats or {
                "total_candidates": 0,
                "avg_candidates_per_entity": 0.0,
                "blocking_methods": {}
            },
            "matching_summary": matching_stats or {
                "total_entities": 0,
                "total_matches": 0,
                "unmatched_entities": 0,
                "confidence_distribution": {},
                "source_breakdown": {}
            },
            "model_summary": model_summary
        }
