"""
Feature Extraction Module for Entity Pairs.
Used identically in training and matching pipelines.
"""

from typing import Dict, Any, List
import numpy as np
from app.ml.similarity import (
    compute_name_similarities,
    compute_address_similarities,
    compute_country_similarity
)

FEATURE_COLUMNS = [
    "name_exact_match",
    "name_exact_stem_match",
    "name_fuzz_ratio",
    "name_token_sort_ratio",
    "name_token_set_ratio",
    "name_partial_ratio",
    "name_stem_ratio",
    "name_stem_token_sort",
    "name_jaccard_tokens",
    "name_jaccard_char_3gram",
    "name_common_tokens",
    "name_len_diff_ratio",
    "addr_exact_match",
    "addr_fuzz_ratio",
    "addr_token_sort_ratio",
    "addr_token_set_ratio",
    "addr_partial_ratio",
    "addr_jaccard_tokens",
    "addr_num_match_score",
    "addr_num_common_count",
    "addr_len_diff_ratio",
    "country_exact_match",
    "country_both_unknown",
    "is_source3",
    "combined_name_addr_score"
]

class FeatureExtractor:
    """
    Extracts numerical feature vectors from pairs of preprocessed entity records.
    """
    def __init__(self):
        self.feature_names = FEATURE_COLUMNS

    def extract_features_from_pair(
        self,
        s1_record: Dict[str, Any],
        cand_record: Dict[str, Any],
        candidate_source: str = "source2"
    ) -> Dict[str, float]:
        """
        Extracts feature dictionary from a pair of normalized records.
        """
        # Name similarities
        name_feats = compute_name_similarities(
            s1_record.get("business_name_normalized", ""),
            cand_record.get("business_name_normalized", ""),
            s1_record.get("business_name_stem", ""),
            cand_record.get("business_name_stem", "")
        )
        
        # Address similarities
        addr_feats = compute_address_similarities(
            s1_record.get("business_address_normalized", ""),
            cand_record.get("business_address_normalized", ""),
            s1_record.get("address_numbers", []),
            cand_record.get("address_numbers", [])
        )
        
        # Country similarity
        country_feats = compute_country_similarity(
            s1_record.get("country_normalized", ""),
            cand_record.get("country_normalized", "")
        )
        
        # Source Indicator
        is_s3 = 1.0 if "3" in str(candidate_source) or str(cand_record.get("entity_id", "")).startswith("S3-") else 0.0
        
        # Combined heuristic score
        combined_score = (
            0.65 * name_feats["name_token_set_ratio"] + 
            0.35 * addr_feats["addr_token_set_ratio"]
        )
        
        features = {
            **name_feats,
            **addr_feats,
            **country_feats,
            "is_source3": is_s3,
            "combined_name_addr_score": combined_score
        }
        return features

    def extract_vector(
        self,
        s1_record: Dict[str, Any],
        cand_record: Dict[str, Any],
        candidate_source: str = "source2"
    ) -> List[float]:
        """Returns feature values ordered according to self.feature_names."""
        feat_dict = self.extract_features_from_pair(s1_record, cand_record, candidate_source)
        return [feat_dict[col] for col in self.feature_names]

    def get_config(self) -> Dict[str, Any]:
        return {
            "feature_version": "1.0.0",
            "feature_count": len(self.feature_names),
            "feature_names": self.feature_names
        }
