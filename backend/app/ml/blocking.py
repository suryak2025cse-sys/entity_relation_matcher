"""
Multi-Pass Blocking Module for Candidate Generation.
Scalable for large datasets with chunked candidate emission.
"""

import collections
from typing import Dict, Any, List, Set, Tuple, Generator, Optional
import os
import re
import pandas as pd

class BlockingIndex:
    """
    In-memory / partitioned multi-pass inverted index for candidate generation.
    """
    def __init__(self, max_candidates_per_key: int = 50):
        self.max_candidates_per_key = max_candidates_per_key
        # Key -> list of candidate entity IDs
        self.index: Dict[str, List[str]] = collections.defaultdict(list)
        # Entity ID -> preprocessed entity record
        self.entities: Dict[str, Dict[str, Any]] = {}

    def extract_blocking_keys(self, record: Dict[str, Any]) -> List[Tuple[str, str]]:
        """
        Extracts multiple blocking keys for an entity record.
        Returns: list of (blocking_rule_name, key_string)
        """
        keys = []
        country = str(record.get("country_normalized", "UNKNOWN") or "UNKNOWN")
        name_clean = str(record.get("business_name_normalized", "") or "")
        name_stem = str(record.get("business_name_stem", "") or "")
        addr_clean = str(record.get("business_address_normalized", "") or "")
        numbers = record.get("address_numbers", [])
        if not isinstance(numbers, list):
            numbers = []
        
        # 1. Country + First Name Token
        name_tokens = name_clean.split()
        if name_tokens and len(name_tokens[0]) >= 2:
            first_tok = name_tokens[0]
            keys.append(("country_first_word", f"{country}::n1::{first_tok}"))
            
        # 2. Country + Stem First Token (if different)
        stem_tokens = name_stem.split()
        if stem_tokens and len(stem_tokens[0]) >= 2:
            stem_first = stem_tokens[0]
            if not name_tokens or stem_first != name_tokens[0]:
                keys.append(("country_stem_first_word", f"{country}::ns1::{stem_first}"))

        # 3. Country + Name Prefix (3-4 chars)
        if len(name_clean) >= 3:
            prefix = name_clean[:4].strip()
            if len(prefix) >= 3:
                keys.append(("country_name_prefix", f"{country}::np::{prefix}"))

        # 4. Country + Address Number + Street First Token
        if numbers and addr_clean:
            first_num = numbers[0]
            addr_tokens = [t for t in addr_clean.split() if not t.isdigit() and len(t) >= 3]
            if addr_tokens:
                keys.append(("country_addr_num_street", f"{country}::an::{first_num}_{addr_tokens[0]}"))

        return keys

    def add_candidate(self, record: Dict[str, Any]):
        """Indexes a single candidate record."""
        eid = record.get("entity_id")
        if not eid:
            return
        self.entities[eid] = record
        
        keys = self.extract_blocking_keys(record)
        for rule_name, key in keys:
            bucket = self.index[key]
            if len(bucket) < self.max_candidates_per_key:
                bucket.append(eid)

    def add_candidates_from_dataframe(self, df_chunk: pd.DataFrame, source_label: str = "source2"):
        """Indexes records from a preprocessed DataFrame chunk with fast record iteration."""
        records = df_chunk.to_dict("records")
        for rec in records:
            rec["candidate_source"] = source_label
            self.add_candidate(rec)

    def get_candidates_for_query(
        self,
        s1_record: Dict[str, Any],
        max_total_candidates: int = 50
    ) -> List[Tuple[str, str, str]]:
        """
        Retrieves matching candidates for a Source 1 record across blocking rules.
        Returns: List of (candidate_entity_id, candidate_source, blocking_method)
        """
        seen_cand_ids: Set[str] = set()
        candidates: List[Tuple[str, str, str]] = []
        
        keys = self.extract_blocking_keys(s1_record)
        for rule_name, key in keys:
            matched_ids = self.index.get(key, [])
            for cid in matched_ids:
                if cid not in seen_cand_ids:
                    seen_cand_ids.add(cid)
                    cand_rec = self.entities.get(cid, {})
                    src = cand_rec.get("candidate_source", "source2")
                    candidates.append((cid, src, rule_name))
                    if len(candidates) >= max_total_candidates:
                        return candidates
                        
        return candidates

    def clear(self):
        """Clears index to free memory."""
        self.index.clear()
        self.entities.clear()
