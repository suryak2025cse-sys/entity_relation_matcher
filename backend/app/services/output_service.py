"""
Output Service: Validates submission outputs against strict challenge rules and manages downloads.
"""

import os
import pandas as pd
from typing import Dict, Any, List, Set, Optional

OUTPUTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "outputs"))

class OutputService:
    def __init__(self):
        os.makedirs(OUTPUTS_DIR, exist_ok=True)

    def get_output_paths(self) -> Dict[str, Optional[str]]:
        match_path = os.path.join(OUTPUTS_DIR, "matching_results.tsv")
        cand_path = os.path.join(OUTPUTS_DIR, "candidate_pairs.tsv")
        return {
            "matching_results_path": match_path if os.path.isfile(match_path) else None,
            "candidate_pairs_path": cand_path if os.path.isfile(cand_path) else None
        }

    def validate_outputs(
        self,
        source1_file: Optional[str] = None,
        max_reference_rows: Optional[int] = None,
        check_ids: bool = False
    ) -> Dict[str, Any]:
        """
        Validates matching_results.tsv and candidate_pairs.tsv against challenge rules.
        """
        errors = []
        warnings = []
        
        match_path = os.path.join(OUTPUTS_DIR, "matching_results.tsv")
        cand_path = os.path.join(OUTPUTS_DIR, "candidate_pairs.tsv")

        if not os.path.isfile(match_path):
            errors.append(f"matching_results.tsv is missing from {OUTPUTS_DIR}.")
            return {
                "is_valid": False,
                "matching_file_present": False,
                "candidate_file_present": os.path.isfile(cand_path),
                "errors": errors,
                "warnings": warnings,
                "total_s1_rows": 0,
                "empty_matches_count": 0,
                "non_empty_matches_count": 0,
                "ready_for_download": False
            }

        # 1. Read required Source 1 IDs if source1_file provided
        required_s1_ids = set()
        if source1_file and os.path.isfile(source1_file):
            try:
                read_count = 0
                for chunk in pd.read_csv(source1_file, sep="\t", usecols=["entity_id"], chunksize=25000, dtype=str):
                    chunk_ids = chunk["entity_id"].dropna().str.strip()
                    if max_reference_rows and read_count + len(chunk_ids) > max_reference_rows:
                        needed = max_reference_rows - read_count
                        required_s1_ids.update(chunk_ids.iloc[:needed])
                        break
                    required_s1_ids.update(chunk_ids)
                    read_count += len(chunk_ids)
                    if max_reference_rows and read_count >= max_reference_rows:
                        break
            except Exception as e:
                warnings.append(f"Could not read source1 reference file: {e}")

        # 2. Validate matching_results.tsv
        seen_s1_match = set()
        dup_s1 = set()
        intra_dupes = set()
        self_matches = set()
        wrong_prefix = set()
        n_rows = 0
        empty_rows = 0
        matched_map: Dict[str, Set[str]] = {}

        try:
            with open(match_path, "r", encoding="utf-8") as f:
                header = f.readline().strip().split("\t")
                if header != ["source1_entity_id", "matched_entity_ids"]:
                    errors.append(f"Invalid header in matching_results.tsv: {header}. Expected: ['source1_entity_id', 'matched_entity_ids']")

                for line in f:
                    line_clean = line.rstrip("\r\n")
                    if not line_clean:
                        continue
                    parts = line_clean.split("\t")
                    s1 = parts[0].strip()
                    n_rows += 1

                    if s1 in seen_s1_match:
                        dup_s1.add(s1)
                    seen_s1_match.add(s1)

                    ids_str = parts[1].strip() if len(parts) > 1 else ""
                    if not ids_str:
                        empty_rows += 1
                        matched_map[s1] = set()
                        continue

                    ids = [x.strip() for x in ids_str.split(",") if x.strip()]
                    if len(ids) != len(set(ids)):
                        intra_dupes.add(s1)

                    id_set = set(ids)
                    matched_map[s1] = id_set

                    for mid in id_set:
                        if mid.startswith("S1-"):
                            self_matches.add(mid)
                        elif not mid.startswith(("S2-", "S3-")):
                            wrong_prefix.add(mid)

        except UnicodeDecodeError:
            errors.append("matching_results.tsv is not valid UTF-8 text.")
        except Exception as e:
            errors.append(f"Error reading matching_results.tsv: {e}")

        if dup_s1:
            errors.append(f"Duplicate source1_entity_id row(s): {len(dup_s1)} duplicates found.")
        if intra_dupes:
            errors.append(f"Duplicate IDs inside matched list for {len(intra_dupes)} entities.")
        if self_matches:
            errors.append(f"Self-matches found ({len(self_matches)} S1 IDs inside matched lists).")
        if wrong_prefix:
            errors.append(f"IDs with invalid prefix (not S2-/S3-) found: {len(wrong_prefix)}.")

        # Check completeness against required IDs
        if required_s1_ids:
            missing_s1 = required_s1_ids - seen_s1_match
            if missing_s1:
                if max_reference_rows or (n_rows < len(required_s1_ids) and seen_s1_match.issubset(required_s1_ids)):
                    warnings.append(f"Sample batch verified ({n_rows:,} entities valid). For final official leaderboard submission, match with 'Full Dataset' to cover all {len(required_s1_ids):,} entities.")
                else:
                    errors.append(f"Missing {len(missing_s1)} required Source 1 entities from matching_results.tsv.")
            extra_s1 = seen_s1_match - required_s1_ids
            if extra_s1:
                errors.append(f"Found {len(extra_s1)} unexpected Source 1 entities not in reference dataset.")

        # 3. Check candidate_pairs.tsv if present
        candidate_map = {}
        has_cand = os.path.isfile(cand_path)
        if has_cand:
            try:
                with open(cand_path, "r", encoding="utf-8") as f:
                    c_header = f.readline().strip().split("\t")
                    for line in f:
                        parts = line.rstrip("\r\n").split("\t")
                        if parts and parts[0]:
                            s1 = parts[0].strip()
                            c_ids = set(parts[1].split(",")) if len(parts) > 1 and parts[1].strip() else set()
                            candidate_map[s1] = c_ids

                # Cross-check matches are subset of candidates
                subset_violations = [s1 for s1, mids in matched_map.items() if mids - candidate_map.get(s1, set())]
                if subset_violations:
                    warnings.append(f"{len(subset_violations)} S1 entities have matches not present in candidate_pairs.tsv.")
            except Exception as e:
                warnings.append(f"Warning checking candidate file: {e}")

        is_valid = len(errors) == 0

        return {
            "is_valid": is_valid,
            "matching_file_present": True,
            "candidate_file_present": has_cand,
            "errors": errors,
            "warnings": warnings,
            "total_s1_rows": n_rows,
            "empty_matches_count": empty_rows,
            "non_empty_matches_count": n_rows - empty_rows,
            "ready_for_download": is_valid
        }
