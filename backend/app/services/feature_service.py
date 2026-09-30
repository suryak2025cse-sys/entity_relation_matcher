"""
Feature Service: Coordinates feature extraction for training pairs and candidate matching pairs.
"""

import os
import gc
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from app.ml.features import FeatureExtractor, FEATURE_COLUMNS

class FeatureService:
    def __init__(self):
        self.extractor = FeatureExtractor()

    def extract_features_for_pairs(
        self,
        pairs: List[Tuple[Dict[str, Any], Dict[str, Any], str]]
    ) -> np.ndarray:
        """
        Extracts feature vectors for a list of (s1_record, cand_record, candidate_source) tuples.
        Returns: 2D numpy array of shape (N, num_features).
        """
        if not pairs:
            return np.empty((0, len(FEATURE_COLUMNS)))

        vectors = []
        for s1_rec, cand_rec, source in pairs:
            vec = self.extractor.extract_vector(s1_rec, cand_rec, source)
            vectors.append(vec)

        return np.array(vectors, dtype=np.float32)

    def extract_single_pair(
        self,
        s1_rec: Dict[str, Any],
        cand_rec: Dict[str, Any],
        candidate_source: str = "source2"
    ) -> Dict[str, float]:
        """Extracts detailed feature dict for single pair explanation."""
        return self.extractor.extract_features_from_pair(s1_rec, cand_rec, candidate_source)

    def get_feature_names(self) -> List[str]:
        return FEATURE_COLUMNS
