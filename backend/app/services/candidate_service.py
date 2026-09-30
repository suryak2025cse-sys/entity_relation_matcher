"""
Candidate Generation Service: Inverted Index Blocking and candidate pair generation.
Streams candidate generation to disk in chunks to handle 1 GB+ datasets without memory bloat.
"""

import os
import gc
import json
import pandas as pd
from typing import Dict, Any, List, Set, Tuple, Optional
from app.ml.blocking import BlockingIndex

CANDIDATES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "candidates"))
OUTPUTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "outputs"))

class CandidateService:
    def __init__(self, max_candidates_per_key: int = 80, max_candidates_per_entity: int = 150):
        self.max_candidates_per_key = max_candidates_per_key
        self.max_candidates_per_entity = max_candidates_per_entity
        self.index = BlockingIndex(max_candidates_per_key=max_candidates_per_key)
        os.makedirs(CANDIDATES_DIR, exist_ok=True)
        os.makedirs(OUTPUTS_DIR, exist_ok=True)

    def build_index(
        self,
        source2_path: str,
        source3_path: str,
        chunk_size: int = 25000,
        max_records_per_source: Optional[int] = None
    ) -> Dict[str, int]:
        """
        Builds the inverted blocking index from preprocessed Source 2 and Source 3 files.
        """
        self.index.clear()
        indexed_counts = {"source2": 0, "source3": 0}

        # Index Source 2
        if os.path.isfile(source2_path):
            for chunk in pd.read_csv(source2_path, sep="\t", chunksize=chunk_size, encoding="utf-8", dtype=str):
                if max_records_per_source and indexed_counts["source2"] >= max_records_per_source:
                    break
                self.index.add_candidates_from_dataframe(chunk, source_label="source2")
                indexed_counts["source2"] += len(chunk)
                del chunk

        # Index Source 3
        if os.path.isfile(source3_path):
            for chunk in pd.read_csv(source3_path, sep="\t", chunksize=chunk_size, encoding="utf-8", dtype=str):
                if max_records_per_source and indexed_counts["source3"] >= max_records_per_source:
                    break
                self.index.add_candidates_from_dataframe(chunk, source_label="source3")
                indexed_counts["source3"] += len(chunk)
                del chunk

        gc.collect()
        return indexed_counts

    def generate_candidates_stream(
        self,
        source1_path: str,
        output_candidate_tsv: Optional[str] = None,
        output_detailed_tsv: Optional[str] = None,
        chunk_size: int = 10000,
        max_s1_records: Optional[int] = None,
        progress_callback=None
    ) -> Dict[str, Any]:
        """
        Generates candidate pairs for Source 1 records against the built index.
        Writes both candidate_pairs.tsv (standard submission format) and candidate_pairs_detailed.tsv (for feature extraction).
        """
        if not output_candidate_tsv:
            output_candidate_tsv = os.path.join(CANDIDATES_DIR, "candidate_pairs.tsv")
        if not output_detailed_tsv:
            output_detailed_tsv = os.path.join(CANDIDATES_DIR, "candidate_pairs_detailed.tsv")

        total_s1_processed = 0
        total_candidate_pairs = 0
        method_counts: Dict[str, int] = {}
        samples: List[Dict[str, Any]] = []

        with open(output_candidate_tsv, "w", encoding="utf-8") as f_sub, \
             open(output_detailed_tsv, "w", encoding="utf-8") as f_det:
            
            # Headers
            f_sub.write("source1_entity_id\tcandidate_entity_ids\n")
            f_det.write("source1_entity_id\tcandidate_entity_id\tcandidate_source\tblocking_method\n")

            for chunk in pd.read_csv(source1_path, sep="\t", chunksize=chunk_size, encoding="utf-8", dtype=str):
                if max_s1_records and total_s1_processed >= max_s1_records:
                    break

                for _, row in chunk.iterrows():
                    s1_rec = row.to_dict()
                    s1_id = str(s1_rec.get("entity_id", "")).strip()
                    if not s1_id:
                        continue

                    # Retrieve candidate matches from blocking index
                    cands = self.index.get_candidates_for_query(s1_rec, max_total_candidates=self.max_candidates_per_entity)
                    cand_ids = [c[0] for c in cands]
                    
                    # Write to standard submission format
                    cand_str = ",".join(cand_ids)
                    f_sub.write(f"{s1_id}\t{cand_str}\n")

                    # Write detailed pairs for feature generation
                    for cid, csource, bmethod in cands:
                        f_det.write(f"{s1_id}\t{cid}\t{csource}\t{bmethod}\n")
                        method_counts[bmethod] = method_counts.get(bmethod, 0) + 1
                        total_candidate_pairs += 1

                    if len(samples) < 10 and cands:
                        cand_id_first = cands[0][0]
                        cand_rec = self.index.entities.get(cand_id_first, {})
                        samples.append({
                            "source1_id": s1_id,
                            "source1_name": s1_rec.get("business_name", ""),
                            "source1_address": s1_rec.get("business_address", ""),
                            "candidate_id": cand_id_first,
                            "candidate_name": cand_rec.get("business_name", ""),
                            "candidate_address": cand_rec.get("business_address", ""),
                            "candidate_source": cands[0][1],
                            "blocking_method": cands[0][2],
                            "total_candidates_for_s1": len(cands)
                        })

                    total_s1_processed += 1
                    if progress_callback and total_s1_processed % 5000 == 0:
                        progress_callback(total_s1_processed)

                del chunk
                gc.collect()

        # Also copy candidate_pairs.tsv to outputs dir
        output_final_path = os.path.join(OUTPUTS_DIR, "candidate_pairs.tsv")
        if output_candidate_tsv != output_final_path:
            import shutil
            shutil.copy2(output_candidate_tsv, output_final_path)

        avg_cands = round(total_candidate_pairs / max(total_s1_processed, 1), 2)

        return {
            "success": True,
            "total_source1_entities": total_s1_processed,
            "total_candidate_pairs": total_candidate_pairs,
            "avg_candidates_per_entity": avg_cands,
            "blocking_method_breakdown": method_counts,
            "candidate_file": output_candidate_tsv,
            "sample_candidates": samples
        }
