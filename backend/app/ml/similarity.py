"""
High-Performance Similarity Computation Module.
Computes string similarity, token overlap, numeric overlap, and geographical matching metrics.
"""

from functools import lru_cache
from typing import AbstractSet, FrozenSet, List, Set, Optional, Any
import numpy as np
from rapidfuzz import fuzz

def jaccard_similarity(tokens1: AbstractSet[str], tokens2: AbstractSet[str]) -> float:
    """Computes Jaccard index between two sets of tokens."""
    if not tokens1 or not tokens2:
        return 0.0
    intersection = len(tokens1.intersection(tokens2))
    if intersection == 0:
        return 0.0
    union = len(tokens1.union(tokens2))
    return float(intersection) / float(union) if union > 0 else 0.0

def get_char_ngrams(text: str, n: int = 3) -> Set[str]:
    """Extracts character n-grams from a string."""
    return set(_cached_char_ngrams(text, n))

@lru_cache(maxsize=32768)
def _cached_char_ngrams(text: str, n: int = 3) -> FrozenSet[str]:
    length = len(text)
    if length < n:
        return frozenset((text,)) if length > 0 else frozenset()
    return frozenset(text[i:i+n] for i in range(length - n + 1))

@lru_cache(maxsize=32768)
def _cached_tokens(text: str) -> FrozenSet[str]:
    return frozenset(text.split())

def compute_name_similarities(name1: Any, name2: Any, stem1: Any = "", stem2: Any = "") -> dict:
    """
    Computes a comprehensive suite of name similarity features with high-speed fast paths.
    """
    n1 = str(name1) if name1 is not None and not (isinstance(name1, float) and np.isnan(name1)) else ""
    n2 = str(name2) if name2 is not None and not (isinstance(name2, float) and np.isnan(name2)) else ""
    
    # Fast path: Both empty
    if not n1 and not n2:
        return {
            "name_exact_match": 0.0,
            "name_exact_stem_match": 0.0,
            "name_fuzz_ratio": 0.0,
            "name_token_sort_ratio": 0.0,
            "name_token_set_ratio": 0.0,
            "name_partial_ratio": 0.0,
            "name_stem_ratio": 0.0,
            "name_stem_token_sort": 0.0,
            "name_jaccard_tokens": 0.0,
            "name_jaccard_char_3gram": 0.0,
            "name_common_tokens": 0.0,
            "name_len_diff_ratio": 0.0
        }

    # Fast path: Exact match
    if n1 == n2:
        tokens = _cached_tokens(n1)
        return {
            "name_exact_match": 1.0,
            "name_exact_stem_match": 1.0,
            "name_fuzz_ratio": 1.0,
            "name_token_sort_ratio": 1.0,
            "name_token_set_ratio": 1.0,
            "name_partial_ratio": 1.0,
            "name_stem_ratio": 1.0,
            "name_stem_token_sort": 1.0,
            "name_jaccard_tokens": 1.0,
            "name_jaccard_char_3gram": 1.0,
            "name_common_tokens": float(len(tokens)),
            "name_len_diff_ratio": 0.0
        }

    s1 = str(stem1) if stem1 is not None and not (isinstance(stem1, float) and np.isnan(stem1)) else n1
    s2 = str(stem2) if stem2 is not None and not (isinstance(stem2, float) and np.isnan(stem2)) else n2

    # Exact stem match check
    exact_stem_match = 1.0 if (s1 and s1 == s2) else 0.0

    # RapidFuzz metrics
    ratio = fuzz.ratio(n1, n2) / 100.0
    token_sort = fuzz.token_sort_ratio(n1, n2) / 100.0
    token_set = fuzz.token_set_ratio(n1, n2) / 100.0
    partial = fuzz.partial_ratio(n1, n2) / 100.0

    # Stem similarities
    if s1 == s2 and s1:
        stem_ratio = 1.0
        stem_token_sort = 1.0
    else:
        stem_ratio = fuzz.ratio(s1, s2) / 100.0
        stem_token_sort = fuzz.token_sort_ratio(s1, s2) / 100.0

    # Token-level Jaccard
    tokens1 = _cached_tokens(n1)
    tokens2 = _cached_tokens(n2)
    jaccard_tokens = jaccard_similarity(tokens1, tokens2)
    common_token_count = len(tokens1.intersection(tokens2))

    # Char 3-gram Jaccard
    ngrams1 = _cached_char_ngrams(s1, 3)
    ngrams2 = _cached_char_ngrams(s2, 3)
    jaccard_char_3gram = jaccard_similarity(ngrams1, ngrams2)

    # Length features
    len1, len2 = len(n1), len(n2)
    max_len = max(len1, len2, 1)
    len_diff_ratio = abs(len1 - len2) / max_len

    return {
        "name_exact_match": 0.0,
        "name_exact_stem_match": exact_stem_match,
        "name_fuzz_ratio": ratio,
        "name_token_sort_ratio": token_sort,
        "name_token_set_ratio": token_set,
        "name_partial_ratio": partial,
        "name_stem_ratio": stem_ratio,
        "name_stem_token_sort": stem_token_sort,
        "name_jaccard_tokens": jaccard_tokens,
        "name_jaccard_char_3gram": jaccard_char_3gram,
        "name_common_tokens": float(common_token_count),
        "name_len_diff_ratio": len_diff_ratio
    }

def compute_address_similarities(addr1: Any, addr2: Any, nums1: Optional[List[str]] = None, nums2: Optional[List[str]] = None) -> dict:
    """
    Computes address similarity features and numeric overlap with fast paths.
    """
    a1 = str(addr1) if addr1 is not None and not (isinstance(addr1, float) and np.isnan(addr1)) else ""
    a2 = str(addr2) if addr2 is not None and not (isinstance(addr2, float) and np.isnan(addr2)) else ""
    
    # Fast path: Both empty
    if not a1 and not a2:
        return {
            "addr_exact_match": 0.0,
            "addr_fuzz_ratio": 0.0,
            "addr_token_sort_ratio": 0.0,
            "addr_token_set_ratio": 0.0,
            "addr_partial_ratio": 0.0,
            "addr_jaccard_tokens": 0.0,
            "addr_num_match_score": 0.5,
            "addr_num_common_count": 0.0,
            "addr_len_diff_ratio": 0.0
        }

    # Fast path: Exact address match
    if a1 == a2:
        nums_set1 = set(nums1 or [])
        nums_set2 = set(nums2 or [])
        common_nums = nums_set1.intersection(nums_set2)
        return {
            "addr_exact_match": 1.0,
            "addr_fuzz_ratio": 1.0,
            "addr_token_sort_ratio": 1.0,
            "addr_token_set_ratio": 1.0,
            "addr_partial_ratio": 1.0,
            "addr_jaccard_tokens": 1.0,
            "addr_num_match_score": 1.0 if common_nums or (not nums_set1 and not nums_set2) else 0.5,
            "addr_num_common_count": float(len(common_nums)),
            "addr_len_diff_ratio": 0.0
        }

    exact_match = 0.0
    ratio = fuzz.ratio(a1, a2) / 100.0
    token_sort = fuzz.token_sort_ratio(a1, a2) / 100.0
    token_set = fuzz.token_set_ratio(a1, a2) / 100.0
    partial = fuzz.partial_ratio(a1, a2) / 100.0
    
    tokens1 = _cached_tokens(a1)
    tokens2 = _cached_tokens(a2)
    jaccard_tokens = jaccard_similarity(tokens1, tokens2)
    
    # Address number match logic
    nums_set1 = set(nums1 or [])
    nums_set2 = set(nums2 or [])
    
    if not nums_set1 and not nums_set2:
        num_match_score = 0.5
        num_common_count = 0.0
    elif nums_set1 and nums_set2:
        common_nums = nums_set1.intersection(nums_set2)
        num_common_count = float(len(common_nums))
        num_match_score = 1.0 if common_nums else 0.0
    else:
        num_match_score = 0.2
        num_common_count = 0.0

    len1, len2 = len(a1), len(a2)
    max_len = max(len1, len2, 1)
    len_diff_ratio = abs(len1 - len2) / max_len

    return {
        "addr_exact_match": exact_match,
        "addr_fuzz_ratio": ratio,
        "addr_token_sort_ratio": token_sort,
        "addr_token_set_ratio": token_set,
        "addr_partial_ratio": partial,
        "addr_jaccard_tokens": jaccard_tokens,
        "addr_num_match_score": num_match_score,
        "addr_num_common_count": num_common_count,
        "addr_len_diff_ratio": len_diff_ratio
    }

def compute_country_similarity(c1: str, c2: str) -> dict:
    """Computes exact country match."""
    c1_clean = (c1 or "").strip().upper()
    c2_clean = (c2 or "").strip().upper()
    
    exact = 1.0 if (c1_clean and c1_clean == c2_clean and c1_clean != "UNKNOWN") else 0.0
    both_unknown = 1.0 if (c1_clean == "UNKNOWN" and c2_clean == "UNKNOWN") else 0.0
    
    return {
        "country_exact_match": exact,
        "country_both_unknown": both_unknown
    }
