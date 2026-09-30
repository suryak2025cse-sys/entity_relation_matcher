"""
Validation Service: Verifies schema, data integrity, encoding, and relationships.
Performs chunked validation to handle large datasets within memory bounds.
"""

import os
import pandas as pd
from typing import Dict, Any, List, Optional, Set

REQUIRED_ENTITY_COLUMNS = ["entity_id", "business_name", "business_address", "country"]
REQUIRED_GT_COLUMNS = ["source1_entity_id", "matched_entity_ids"]

class ValidationService:
    def validate_entity_file(
        self,
        file_path: str,
        expected_prefix: Optional[str] = None,
        chunk_size: int = 25000,
        max_sample_rows: int = 5
    ) -> Dict[str, Any]:
        """
        Validates an entity TSV file in chunks.
        """
        if not os.path.isfile(file_path):
            return {
                "file_path": file_path,
                "is_valid": False,
                "errors": [f"File not found: {file_path}"],
                "warnings": [],
                "total_rows": 0,
                "sample_rows": []
            }

        errors = []
        warnings = []
        total_rows = 0
        null_counts = {col: 0 for col in REQUIRED_ENTITY_COLUMNS}
        country_counts: Dict[str, int] = {}
        sample_rows = []
        seen_ids: Set[str] = set()
        duplicate_id_count = 0
        invalid_prefix_count = 0

        try:
            # Check header first
            header_df = pd.read_csv(file_path, sep="\t", nrows=0, encoding="utf-8")
            missing_cols = [col for col in REQUIRED_ENTITY_COLUMNS if col not in header_df.columns]
            if missing_cols:
                errors.append(f"Missing required columns: {missing_cols}. Found: {list(header_df.columns)}")
                return {
                    "file_path": file_path,
                    "is_valid": False,
                    "errors": errors,
                    "warnings": warnings,
                    "total_rows": 0,
                    "sample_rows": []
                }

            # Chunked iteration with C-level vectorization
            for chunk_idx, chunk in enumerate(pd.read_csv(file_path, sep="\t", chunksize=chunk_size, encoding="utf-8", dtype=str)):
                chunk_len = len(chunk)
                total_rows += chunk_len

                if chunk_idx == 0:
                    sample_rows = chunk.head(max_sample_rows).to_dict(orient="records")

                # Count nulls
                for col in REQUIRED_ENTITY_COLUMNS:
                    if col in chunk.columns:
                        null_counts[col] += int(chunk[col].isna().sum())

                # Vectorized ID validation
                if "entity_id" in chunk.columns:
                    eids = chunk["entity_id"].dropna().astype(str).str.strip()
                    if expected_prefix:
                        invalid_prefix_count += int((~eids.str.startswith(expected_prefix)).sum())
                    duplicate_id_count += int(eids.duplicated().sum())

                # Aggregate country counts
                if "country" in chunk.columns:
                    vc = chunk["country"].fillna("UNKNOWN").astype(str).str.strip().value_counts()
                    for c_str, cnt in vc.items():
                        country_counts[c_str] = country_counts.get(c_str, 0) + int(cnt)

        except UnicodeDecodeError:
            errors.append("File is not valid UTF-8 encoded text.")
        except Exception as e:
            errors.append(f"Validation error reading file: {str(e)}")

        if invalid_prefix_count > 0 and expected_prefix:
            warnings.append(f"{invalid_prefix_count} entities do not start with expected prefix '{expected_prefix}'.")

        if duplicate_id_count > 0:
            errors.append(f"Found at least {duplicate_id_count} duplicate entity_ids in the dataset.")

        is_valid = len(errors) == 0

        # Sort top countries
        top_countries = dict(sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:10])

        return {
            "file_path": file_path,
            "filename": os.path.basename(file_path),
            "is_valid": is_valid,
            "errors": errors,
            "warnings": warnings,
            "total_rows": total_rows,
            "null_counts": null_counts,
            "duplicate_id_count": duplicate_id_count,
            "top_countries": top_countries,
            "sample_rows": sample_rows
        }

    def validate_ground_truth_file(
        self,
        file_path: str,
        chunk_size: int = 25000,
        max_sample_rows: int = 5
    ) -> Dict[str, Any]:
        """
        Validates the ground truth TSV file in chunks.
        """
        if not os.path.isfile(file_path):
            return {
                "file_path": file_path,
                "is_valid": False,
                "errors": [f"Ground truth file not found: {file_path}"],
                "warnings": [],
                "total_rows": 0,
                "sample_rows": []
            }

        errors = []
        warnings = []
        total_rows = 0
        total_match_targets = 0
        empty_matches = 0
        sample_rows = []

        try:
            header_df = pd.read_csv(file_path, sep="\t", nrows=0, encoding="utf-8")
            missing_cols = [col for col in REQUIRED_GT_COLUMNS if col not in header_df.columns]
            if missing_cols:
                errors.append(f"Missing ground truth columns: {missing_cols}. Found: {list(header_df.columns)}")
                return {
                    "file_path": file_path,
                    "is_valid": False,
                    "errors": errors,
                    "warnings": warnings,
                    "total_rows": 0,
                    "sample_rows": []
                }

            for chunk_idx, chunk in enumerate(pd.read_csv(file_path, sep="\t", chunksize=chunk_size, encoding="utf-8", dtype=str)):
                total_rows += len(chunk)
                if chunk_idx == 0:
                    sample_rows = chunk.head(max_sample_rows).to_dict(orient="records")

                if "matched_entity_ids" in chunk.columns:
                    matched_series = chunk["matched_entity_ids"].fillna("").astype(str).str.strip()
                    empty_matches += int((matched_series == "").sum())
                    non_empty = matched_series[matched_series != ""]
                    if len(non_empty) > 0:
                        total_match_targets += int((non_empty.str.count(",") + 1).sum())

        except Exception as e:
            errors.append(f"Ground truth validation error: {str(e)}")

        return {
            "file_path": file_path,
            "filename": os.path.basename(file_path),
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "total_rows": total_rows,
            "empty_matches_count": empty_matches,
            "non_empty_matches_count": total_rows - empty_matches,
            "total_ground_truth_pairs": total_match_targets,
            "avg_matches_per_entity": round(total_match_targets / max(total_rows, 1), 2),
            "sample_rows": sample_rows
        }
