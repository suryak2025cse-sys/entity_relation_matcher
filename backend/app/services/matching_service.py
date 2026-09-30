"""
Matching Service: Reuses the existing trained model for inference on new candidate pairs.
Strictly NEVER retrains the model during normal matching.
Produces standard submission output: backend/data/outputs/matching_results.tsv.
"""

import os
import gc
import json
import collections
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

from app.ml.model import EntityResolutionModel, MODELS_DIR
from app.ml.features import FeatureExtractor
from app.ml.blocking import BlockingIndex

OUTPUTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "outputs"))

class MatchingService:
    def __init__(self):
        self.model = EntityResolutionModel()
        self.feature_extractor = FeatureExtractor()
        self.results_cache: List[Dict[str, Any]] = []
        self.last_matching_summary: Dict[str, Any] = {}
        self.last_matched_source1_path: Optional[str] = None
        self.last_matched_s1_records_count: int = 0
        os.makedirs(OUTPUTS_DIR, exist_ok=True)

    def load_model(self) -> bool:
        """Loads the pre-trained model from disk."""
        return self.model.load(MODELS_DIR)

    def match_records(
        self,
        source1_processed_path: str,
        source2_processed_path: str,
        source3_processed_path: str,
        threshold_override: Optional[float] = None,
        max_s1_records: Optional[int] = None,
        progress_callback=None
    ) -> Dict[str, Any]:
        """
        Runs the full matching pipeline using the pre-trained model:
        1. Builds blocking index on Source 2 and 3
        2. Queries candidates for Source 1 records
        3. Extracts features for candidate pairs
        4. Predicts match probabilities using existing model
        5. Applies decision threshold
        6. Writes matching_results.tsv and candidate_pairs.tsv
        """
        # Load model
        if not self.load_model():
            raise RuntimeError("No trained model found! Please train or place a trained model in backend/models/ before matching.")

        threshold = threshold_override if threshold_override is not None else self.model.threshold

        # 1. Build Inverted Index from S2 and S3
        blocking_index = BlockingIndex(max_candidates_per_key=60)
        
        if os.path.isfile(source2_processed_path):
            for chunk in pd.read_csv(source2_processed_path, sep="\t", chunksize=25000, encoding="utf-8", dtype=str):
                blocking_index.add_candidates_from_dataframe(chunk, source_label="source2")
                del chunk

        if os.path.isfile(source3_processed_path):
            for chunk in pd.read_csv(source3_processed_path, sep="\t", chunksize=25000, encoding="utf-8", dtype=str):
                blocking_index.add_candidates_from_dataframe(chunk, source_label="source3")
                del chunk

        gc.collect()

        # 2. Output file paths
        matching_output_path = os.path.join(OUTPUTS_DIR, "matching_results.tsv")
        candidate_output_path = os.path.join(OUTPUTS_DIR, "candidate_pairs.tsv")

        total_s1 = 0
        total_matched_s1 = 0
        total_unmatched_s1 = 0
        total_match_pairs = 0
        high_conf_count = 0
        med_conf_count = 0
        confidence_distribution = {"0.90-1.00": 0, "0.80-0.89": 0, "0.70-0.79": 0, "0.60-0.69": 0, "0.50-0.59": 0, "<0.50": 0}
        source_breakdown = {"source2": 0, "source3": 0}
        all_results_list = []

        with open(matching_output_path, "w", encoding="utf-8") as f_match, \
             open(candidate_output_path, "w", encoding="utf-8") as f_cand:

            f_match.write("source1_entity_id\tmatched_entity_ids\n")
            f_cand.write("source1_entity_id\tcandidate_entity_ids\n")

            for chunk in pd.read_csv(source1_processed_path, sep="\t", chunksize=1000, encoding="utf-8", dtype=str):
                if max_s1_records and total_s1 >= max_s1_records:
                    break

                records = chunk.to_dict("records")
                # Pre-fetch candidate pairs for this entire batch of S1 records
                batch_candidates = [] # list of (rec_idx, s1_rec, cand_id, cand_source, cand_rec, rule_name)
                s1_candidates_map = {} # s1_id -> list of candidate ids for candidate_pairs.tsv

                for idx, s1_rec in enumerate(records):
                    s1_id = str(s1_rec.get("entity_id", "")).strip()
                    if not s1_id:
                        continue
                    cands = blocking_index.get_candidates_for_query(s1_rec, max_total_candidates=35)
                    cand_ids = [c[0] for c in cands]
                    s1_candidates_map[s1_id] = cand_ids
                    f_cand.write(f"{s1_id}\t{','.join(cand_ids)}\n")

                    for cid, csource, bmethod in cands:
                        cand_rec = blocking_index.entities.get(cid)
                        if cand_rec:
                            batch_candidates.append((idx, s1_rec, cid, csource, cand_rec, bmethod))

                # Bulk predict match probabilities for all candidate pairs in batch
                candidate_probs = []
                if batch_candidates:
                    X_bulk = np.array([
                        self.feature_extractor.extract_vector(item[1], item[4], item[3])
                        for item in batch_candidates
                    ], dtype=np.float32)
                    candidate_probs = self.model.predict_proba(X_bulk)

                # Group candidate predictions by S1 record index
                cand_results_by_rec = collections.defaultdict(list)
                for cand_idx, prob in enumerate(candidate_probs):
                    rec_idx, s1_rec, cid, csource, cand_rec, bmethod = batch_candidates[cand_idx]
                    cand_results_by_rec[rec_idx].append((cid, csource, cand_rec, float(prob), cand_idx))

                # Process results for each S1 record in the chunk
                for idx, s1_rec in enumerate(records):
                    s1_id = str(s1_rec.get("entity_id", "")).strip()
                    if not s1_id:
                        continue

                    matched_ids = []
                    matched_details = []
                    best_conf = 0.0

                    c_list = cand_results_by_rec.get(idx, [])
                    for cid, csource, cand_rec, prob_val, cand_idx in c_list:
                        if prob_val > best_conf:
                            best_conf = prob_val

                        # Confidence binning
                        if prob_val >= 0.90:
                            confidence_distribution["0.90-1.00"] += 1
                        elif prob_val >= 0.80:
                            confidence_distribution["0.80-0.89"] += 1
                        elif prob_val >= 0.70:
                            confidence_distribution["0.70-0.79"] += 1
                        elif prob_val >= 0.60:
                            confidence_distribution["0.60-0.69"] += 1
                        elif prob_val >= 0.50:
                            confidence_distribution["0.50-0.59"] += 1
                        else:
                            confidence_distribution["<0.50"] += 1

                        if prob_val >= threshold:
                            matched_ids.append(cid)
                            source_breakdown[csource] = source_breakdown.get(csource, 0) + 1

                            if prob_val >= 0.85:
                                high_conf_count += 1
                            else:
                                med_conf_count += 1

                            vec = X_bulk[cand_idx]
                            feat_dict = {k: float(v) for k, v in zip(self.feature_extractor.feature_names, vec)}
                            matched_details.append({
                                "matched_id": cid,
                                "matched_name": cand_rec.get("business_name", ""),
                                "matched_address": cand_rec.get("business_address", ""),
                                "matched_country": cand_rec.get("country", ""),
                                "matched_source": csource,
                                "confidence": round(prob_val, 4),
                                "name_similarity_pct": round(feat_dict.get("name_token_set_ratio", 0.0) * 100, 1),
                                "address_similarity_pct": round(feat_dict.get("addr_token_set_ratio", 0.0) * 100, 1),
                                "country_match": bool(feat_dict.get("country_exact_match", 0.0) == 1.0),
                                "features": feat_dict
                            })

                    # Write to matching_results.tsv
                    f_match.write(f"{s1_id}\t{','.join(matched_ids)}\n")

                    has_match = len(matched_ids) > 0
                    if has_match:
                        total_matched_s1 += 1
                        total_match_pairs += len(matched_ids)
                    else:
                        total_unmatched_s1 += 1

                    # Store in memory cache for pagination / UI display (keep first 25000 for fast browsing)
                    if len(all_results_list) < 25000:
                        all_results_list.append({
                            "source1_entity_id": s1_id,
                            "source1_business_name": s1_rec.get("business_name", ""),
                            "source1_address": s1_rec.get("business_address", ""),
                            "source1_country": s1_rec.get("country", ""),
                            "matched_entity_ids": matched_ids,
                            "matched_entities_details": matched_details,
                            "best_confidence": round(best_conf, 4),
                            "has_match": has_match
                        })

                    total_s1 += 1
                    if max_s1_records and total_s1 >= max_s1_records:
                        break

                del chunk, records, batch_candidates, candidate_probs, cand_results_by_rec
                gc.collect()

        del blocking_index
        gc.collect()

        self.results_cache = all_results_list
        self.last_matched_source1_path = source1_processed_path
        self.last_matched_s1_records_count = total_s1

        self.last_matching_summary = {
            "total_entities": total_s1,
            "total_matches": total_matched_s1,
            "unmatched_entities": total_unmatched_s1,
            "total_match_pairs": total_match_pairs,
            "high_confidence_count": high_conf_count,
            "medium_confidence_count": med_conf_count,
            "threshold_used": threshold,
            "source1_processed_path": source1_processed_path,
            "matching_file": matching_output_path,
            "candidate_file": candidate_output_path,
            "confidence_distribution": confidence_distribution,
            "source_breakdown": source_breakdown
        }

        # Save summary JSON for persistence
        summary_path = os.path.join(OUTPUTS_DIR, "matching_summary.json")
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(self.last_matching_summary, f, indent=2)

        return self.last_matching_summary

    def get_paginated_results(
        self,
        page: int = 1,
        page_size: int = 20,
        search_query: Optional[str] = None,
        only_matches: Optional[bool] = None,
        source_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Returns paginated and filtered results from the matching cache or matching_results.tsv.
        """
        filtered = self.results_cache

        if search_query:
            q = search_query.lower().strip()
            filtered = [
                r for r in filtered
                if q in r["source1_entity_id"].lower() or q in r["source1_business_name"].lower() or any(q in m["matched_id"].lower() or q in m["matched_name"].lower() for m in r["matched_entities_details"])
            ]

        if only_matches is True:
            filtered = [r for r in filtered if r["has_match"]]
        elif only_matches is False:
            filtered = [r for r in filtered if not r["has_match"]]

        if source_filter:
            filtered = [
                r for r in filtered
                if any(m.get("matched_source") == source_filter for m in r["matched_entities_details"])
            ]

        total_records = len(filtered)
        total_pages = max(1, (total_records + page_size - 1) // page_size)
        page = max(1, min(page, total_pages))
        
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_items = filtered[start_idx:end_idx]

        summary = self.last_matching_summary or {}

        return {
            "total_entities": summary.get("total_entities", len(self.results_cache)),
            "total_matches": summary.get("total_matches", sum(1 for r in self.results_cache if r["has_match"])),
            "unmatched_entities": summary.get("unmatched_entities", sum(1 for r in self.results_cache if not r["has_match"])),
            "high_confidence_count": summary.get("high_confidence_count", 0),
            "medium_confidence_count": summary.get("medium_confidence_count", 0),
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "filtered_total": total_records,
            "results": page_items
        }

    def explain_match(
        self,
        s1_record: Dict[str, Any],
        cand_record: Dict[str, Any],
        candidate_source: str = "source2"
    ) -> Dict[str, Any]:
        """
        Calculates real feature explanation for a match pair.
        """
        feats = self.feature_extractor.extract_features_from_pair(s1_record, cand_record, candidate_source)
        vec = np.array([self.feature_extractor.extract_vector(s1_record, cand_record, candidate_source)], dtype=np.float32)
        
        prob = 0.0
        if self.model.model is not None:
            prob = float(self.model.predict_proba(vec)[0])

        return {
            "s1_id": str(s1_record.get("entity_id", "")),
            "s1_name": s1_record.get("business_name", ""),
            "s1_address": s1_record.get("business_address", ""),
            "s1_country": s1_record.get("country", ""),
            "matched_id": str(cand_record.get("entity_id", "")),
            "matched_name": cand_rec.get("business_name", "") if "cand_rec" in locals() else cand_record.get("business_name", ""),
            "matched_address": cand_record.get("business_address", ""),
            "matched_country": cand_record.get("country", ""),
            "matched_source": candidate_source,
            "confidence": round(prob, 4),
            "is_match": bool(prob >= self.model.threshold),
            "name_similarity_pct": round(feats.get("name_token_set_ratio", 0.0) * 100, 1),
            "address_similarity_pct": round(feats.get("addr_token_set_ratio", 0.0) * 100, 1),
            "country_match": bool(feats.get("country_exact_match", 0.0) == 1.0),
            "feature_breakdown": feats
        }
