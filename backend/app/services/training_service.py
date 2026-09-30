"""
Training Service: Orchestrates dataset extraction, pair construction, feature matrix generation,
supervised model training, threshold tuning (optimizing F0.5), and model persistence.
"""

import os
import gc
import json
import random
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple, Set
from app.ml.model import EntityResolutionModel, MODELS_DIR
from app.ml.features import FeatureExtractor
from app.ml.blocking import BlockingIndex

class TrainingService:
    def __init__(self):
        self.model = EntityResolutionModel()
        self.feature_extractor = FeatureExtractor()

    def load_entity_lookup(
        self,
        file_path: str,
        target_ids: Optional[Set[str]] = None,
        max_records: Optional[int] = None
    ) -> Dict[str, Dict[str, Any]]:
        """Loads normalized entities into a dictionary mapping entity_id -> record using vectorized C-level filtering."""
        lookup = {}
        if not os.path.isfile(file_path):
            return lookup

        target_set = set(target_ids) if target_ids is not None else None

        for chunk in pd.read_csv(file_path, sep="\t", chunksize=100000, encoding="utf-8", dtype=str):
            if target_set is not None:
                matched = chunk[chunk["entity_id"].isin(target_set)]
                for row in matched.to_dict("records"):
                    lookup[str(row["entity_id"]).strip()] = row
                if len(lookup) >= len(target_set):
                    return lookup
            else:
                for row in chunk.to_dict("records"):
                    eid = str(row.get("entity_id", "")).strip()
                    if eid:
                        lookup[eid] = row
                        if max_records and len(lookup) >= max_records:
                            return lookup
        return lookup

    def prepare_training_pairs(
        self,
        ground_truth_path: str,
        s1_lookup: Dict[str, Dict[str, Any]],
        s2_lookup: Dict[str, Dict[str, Any]],
        s3_lookup: Dict[str, Dict[str, Any]],
        max_positive_pairs: int = 25000,
        negative_to_positive_ratio: float = 2.0
    ) -> Tuple[np.ndarray, np.ndarray, Dict[str, int]]:
        """
        Constructs labeled feature vectors for positive and negative training pairs.
        """
        X_list = []
        y_list = []
        pos_count = 0
        neg_count = 0

        # Build a temporary blocking index of S2/S3 to harvest hard negative candidates
        blocking_index = BlockingIndex(max_candidates_per_key=30)
        for eid, rec in s2_lookup.items():
            blocking_index.add_candidate({**rec, "candidate_source": "source2"})
        for eid, rec in s3_lookup.items():
            blocking_index.add_candidate({**rec, "candidate_source": "source3"})

        all_target_ids = list(s2_lookup.keys()) + list(s3_lookup.keys())

        # Read Ground Truth
        if not os.path.isfile(ground_truth_path):
            raise FileNotFoundError(f"Ground truth file not found: {ground_truth_path}")

        gt_df = pd.read_csv(ground_truth_path, sep="\t", encoding="utf-8", dtype=str)
        gt_records = gt_df.to_dict("records")
        
        for row in gt_records:
            if pos_count >= max_positive_pairs:
                break

            s1_id = str(row.get("source1_entity_id", "")).strip()
            matched_str = str(row.get("matched_entity_ids", "") or "").strip()
            
            s1_rec = s1_lookup.get(s1_id)
            if not s1_rec:
                continue

            # Parse positive target IDs
            pos_ids = set()
            if matched_str:
                pos_ids = {mid.strip() for mid in matched_str.split(",") if mid.strip()}

            # 1. Positive Pairs (Label = 1)
            for mid in pos_ids:
                if mid.startswith("S2-"):
                    cand_rec = s2_lookup.get(mid)
                    source = "source2"
                elif mid.startswith("S3-"):
                    cand_rec = s3_lookup.get(mid)
                    source = "source3"
                else:
                    cand_rec = s2_lookup.get(mid) or s3_lookup.get(mid)
                    source = "source3" if "S3-" in mid else "source2"

                if cand_rec:
                    vec = self.feature_extractor.extract_vector(s1_rec, cand_rec, candidate_source=source)
                    X_list.append(vec)
                    y_list.append(1)
                    pos_count += 1

            # 2. Hard Negative Pairs from Blocking Candidates (Label = 0)
            cands = blocking_index.get_candidates_for_query(s1_rec, max_total_candidates=10)
            hard_negs = [c for c in cands if c[0] not in pos_ids]
            
            # Sample up to negative_to_positive_ratio hard negatives
            num_negs_to_add = int(max(1, len(pos_ids) * negative_to_positive_ratio))
            for cid, csource, _ in hard_negs[:num_negs_to_add]:
                cand_rec = s2_lookup.get(cid) if csource == "source2" else s3_lookup.get(cid)
                if cand_rec:
                    vec = self.feature_extractor.extract_vector(s1_rec, cand_rec, candidate_source=csource)
                    X_list.append(vec)
                    y_list.append(0)
                    neg_count += 1

            # 3. If no blocking candidates found for negative, pick random negative
            if not hard_negs and all_target_ids:
                rand_id = random.choice(all_target_ids)
                if rand_id not in pos_ids:
                    cand_rec = s2_lookup.get(rand_id) or s3_lookup.get(rand_id)
                    source = "source3" if "S3-" in rand_id else "source2"
                    if cand_rec:
                        vec = self.feature_extractor.extract_vector(s1_rec, cand_rec, candidate_source=source)
                        X_list.append(vec)
                        y_list.append(0)
                        neg_count += 1

        del blocking_index
        gc.collect()

        X = np.array(X_list, dtype=np.float32)
        y = np.array(y_list, dtype=np.int32)
        
        return X, y, {"positives": pos_count, "negatives": neg_count, "total_pairs": len(y)}

    def train_model(
        self,
        s1_processed_path: str,
        s2_processed_path: str,
        s3_processed_path: str,
        ground_truth_path: str,
        model_type: str = "hist_gradient_boosting",
        max_positive_pairs: int = 25000,
        dataset_name: str = "dataset_archive.zip"
    ) -> Dict[str, Any]:
        """
        End-to-end training pipeline.
        """
        # Strict safety assertion: ensure NO test files are used in training
        for p, label in [
            (s1_processed_path, "Source 1"),
            (s2_processed_path, "Source 2"),
            (s3_processed_path, "Source 3"),
            (ground_truth_path, "Ground Truth")
        ]:
            if p and "test" in os.path.basename(p).lower():
                raise ValueError(f"Strict Safety Violation: Test data detected in {label} ({p}). Training must exclusively use training dataset!")

        # 1. Inspect Ground Truth first to extract required entity IDs
        if not os.path.isfile(ground_truth_path):
            raise FileNotFoundError(f"Ground truth file not found: {ground_truth_path}")

        gt_df = pd.read_csv(ground_truth_path, sep="\t", encoding="utf-8", dtype=str)
        target_s1: Set[str] = set()
        target_s2: Set[str] = set()
        target_s3: Set[str] = set()

        for row in gt_df.to_dict("records"):
            if len(target_s1) >= max_positive_pairs:
                break
            s1_id = str(row.get("source1_entity_id", "")).strip()
            matched_str = str(row.get("matched_entity_ids", "") or "").strip()
            if s1_id and matched_str:
                target_s1.add(s1_id)
                for mid in matched_str.split(","):
                    mid = mid.strip()
                    if "S3-" in mid:
                        target_s3.add(mid)
                    else:
                        target_s2.add(mid)

        # 2. Fast targeted loading of entity lookups
        s1_lookup = self.load_entity_lookup(s1_processed_path, target_ids=target_s1)
        s2_lookup = self.load_entity_lookup(s2_processed_path, target_ids=target_s2 if target_s2 else None, max_records=max_positive_pairs * 2)
        s3_lookup = self.load_entity_lookup(s3_processed_path, target_ids=target_s3 if target_s3 else None, max_records=max_positive_pairs * 2)

        if not s1_lookup or (not s2_lookup and not s3_lookup):
            raise ValueError("Failed to load sufficient training records from processed files.")

        # 3. Build training feature dataset
        X, y, pair_counts = self.prepare_training_pairs(
            ground_truth_path=ground_truth_path,
            s1_lookup=s1_lookup,
            s2_lookup=s2_lookup,
            s3_lookup=s3_lookup,
            max_positive_pairs=max_positive_pairs
        )

        del s1_lookup, s2_lookup, s3_lookup, target_s1, target_s2, target_s3
        gc.collect()

        # 4. Train and select model with threshold optimization
        metadata = self.model.train_and_select(
            X=X,
            y=y,
            dataset_name=dataset_name,
            preferred_model_type=model_type
        )

        # 4. Save trained model
        self.model.save()
        return metadata

    def get_current_model_metadata(self) -> Optional[Dict[str, Any]]:
        """Returns saved model metadata if trained."""
        meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
        if os.path.isfile(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None
