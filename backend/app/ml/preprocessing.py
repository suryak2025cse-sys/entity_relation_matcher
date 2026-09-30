"""
Reusable Data Preprocessing Module for Business Entity Resolution.
This module is used identically in both Training and Future Matching pipelines.
"""

import re
import unicodedata
from typing import Dict, Any, List, Optional, Tuple

# Common legal and corporate entity suffixes across various countries
LEGAL_SUFFIXES = {
    "inc", "incorporated", "llc", "l.l.c.", "corp", "corporation", "ltd", "limited", 
    "pvt ltd", "private limited", "co", "company", "sarl", "s.a.r.l.", "gmbh", "sa", 
    "s.a.", "llp", "plc", "nv", "bv", "ag", "spa", "s.p.a.", "srl", "s.r.l.", "sl", 
    "s.l.", "oy", "ab", "cia", "cie", "holding", "holdings", "group", "enterprise", 
    "enterprises", "associates", "partners", "intl", "international", "services", 
    "solutions", "technologies", "ventures", "industries", "consulting", "logistics", 
    "trading", "lab", "labs", "ecole", "sci", "eurl", "sas", "sasu"
}

# Regex for stripping legal suffix from end of normalized business name
_LEGAL_SUFFIX_REGEX = re.compile(
    r'\b(?:' + '|'.join(re.escape(s) for s in sorted(LEGAL_SUFFIXES, key=len, reverse=True)) + r')\b',
    re.IGNORECASE
)

# Common address abbreviations
ADDRESS_ABBREVIATIONS = {
    "st": "street",
    "rd": "road",
    "ave": "avenue",
    "av": "avenue",
    "blvd": "boulevard",
    "bd": "boulevard",
    "dr": "drive",
    "ln": "lane",
    "ct": "court",
    "hwy": "highway",
    "sq": "square",
    "apt": "apartment",
    "ste": "suite",
    "fl": "floor",
    "pkwy": "parkway",
    "pl": "place",
    "ter": "terrace",
    "bldg": "building",
    "rt": "route",
    "r": "rue",
    "r.": "rue",
    "tq": "taluk",
    "dist": "district",
    "po": "post office",
    "opp": "opposite",
    "nr": "near"
}

# Country normalization dictionary
COUNTRY_MAP = {
    "united states": "US",
    "united states of america": "US",
    "usa": "US",
    "u.s.a.": "US",
    "u.s.": "US",
    "us": "US",
    "india": "India",
    "ind": "India",
    "in": "India",
    "bharat": "India",
    "france": "France",
    "fra": "France",
    "fr": "France",
    "germany": "Germany",
    "deu": "Germany",
    "de": "Germany",
    "deutschland": "Germany",
    "united kingdom": "UK",
    "uk": "UK",
    "great britain": "UK",
    "gb": "UK",
    "gbr": "UK",
    "canada": "Canada",
    "can": "Canada",
    "ca": "Canada",
    "australia": "Australia",
    "aus": "Australia",
    "au": "Australia",
    "brazil": "Brazil",
    "bra": "Brazil",
    "br": "Brazil",
    "brasil": "Brazil",
    "japan": "Japan",
    "jpn": "Japan",
    "jp": "Japan",
    "china": "China",
    "chn": "China",
    "cn": "China",
    "singapore": "Singapore",
    "sgp": "Singapore",
    "sg": "Singapore",
}

def remove_accents(text: str) -> str:
    """Normalize unicode characters and remove diacritics / accents."""
    if not text:
        return ""
    # Normalize unicode to decomposed form and filter out combining characters
    nfkd_form = unicodedata.normalize('NFKD', text)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def normalize_text(text: Optional[str]) -> str:
    """General text cleaner: unicode normalized, lowercase, punctuation removed, single-spaced."""
    if text is None or not isinstance(text, str):
        return ""
    text = remove_accents(text)
    text = text.lower()
    # Replace non-alphanumeric characters with spaces
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    # Collapse multiple whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def normalize_business_name(name: Optional[str], strip_legal: bool = True) -> Tuple[str, str]:
    """
    Normalizes business name.
    Returns: (cleaned_name, name_without_legal_suffix)
    """
    if name is None or not isinstance(name, str):
        return "", ""
    
    cleaned = normalize_text(name)
    if not cleaned:
        return "", ""
    
    if strip_legal:
        # Strip trailing legal terms
        without_legal = _LEGAL_SUFFIX_REGEX.sub(' ', cleaned)
        without_legal = re.sub(r'\s+', ' ', without_legal).strip()
        if not without_legal:
            without_legal = cleaned  # Don't return empty if name was entirely a suffix
    else:
        without_legal = cleaned
        
    return cleaned, without_legal

def normalize_address(address: Optional[str]) -> Tuple[str, List[str]]:
    """
    Normalizes business address: expands common abbreviations, extracts numbers.
    Returns: (cleaned_address, list_of_numbers)
    """
    if address is None or not isinstance(address, str):
        return "", []
    
    cleaned = normalize_text(address)
    if not cleaned:
        return "", []
    
    # Extract standalone numeric tokens for address number matching
    numbers = re.findall(r'\b\d+\b', cleaned)
    
    # Expand abbreviations
    tokens = cleaned.split()
    expanded_tokens = [ADDRESS_ABBREVIATIONS.get(t, t) for t in tokens]
    expanded_address = " ".join(expanded_tokens)
    
    return expanded_address, numbers

def normalize_country(country: Optional[str]) -> str:
    """
    Normalizes country to a canonical representation.
    Preserves and cleans unseen countries without breaking.
    """
    if country is None or not isinstance(country, str):
        return "UNKNOWN"
    
    cleaned = country.strip().lower()
    cleaned = remove_accents(cleaned)
    if not cleaned:
        return "UNKNOWN"
    
    if cleaned in COUNTRY_MAP:
        return COUNTRY_MAP[cleaned]
    
    # Clean fallback: capitalize each word
    cleaned_std = re.sub(r'[^a-zA-Z0-9\s]', '', cleaned)
    cleaned_std = re.sub(r'\s+', ' ', cleaned_std).strip()
    return cleaned_std.title() if cleaned_std else "UNKNOWN"

class EntityPreprocessor:
    """
    Reusable Entity Preprocessor for batch and stream processing of entity records.
    """
    def __init__(self, strip_legal_suffixes: bool = True):
        self.strip_legal_suffixes = strip_legal_suffixes

    def preprocess_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Preprocesses a single entity dict.
        Expects keys: 'entity_id', 'business_name', 'business_address', 'country'.
        """
        raw_name = str(record.get('business_name', '') or '')
        raw_address = str(record.get('business_address', '') or '')
        raw_country = str(record.get('country', '') or '')
        
        name_clean, name_stem = normalize_business_name(raw_name, strip_legal=self.strip_legal_suffixes)
        addr_clean, numbers = normalize_address(raw_address)
        country_norm = normalize_country(raw_country)
        
        return {
            "entity_id": str(record.get("entity_id", "")).strip(),
            "business_name": raw_name,
            "business_address": raw_address,
            "country": raw_country,
            "business_name_normalized": name_clean,
            "business_name_stem": name_stem,
            "business_address_normalized": addr_clean,
            "address_numbers": numbers,
            "country_normalized": country_norm,
        }

    def preprocess_dataframe_chunk(self, df):
        """
        Preprocesses a pandas DataFrame chunk in-place / returns enriched copy.
        """
        import pandas as pd
        
        df = df.copy()
        for col in ['business_name', 'business_address', 'country']:
            if col not in df.columns:
                df[col] = ""
            else:
                df[col] = df[col].fillna("")
                
        # Vectorized or apply normalization
        res_names = [normalize_business_name(x, strip_legal=self.strip_legal_suffixes) for x in df['business_name']]
        df['business_name_normalized'] = [r[0] for r in res_names]
        df['business_name_stem'] = [r[1] for r in res_names]
        
        res_addrs = [normalize_address(x) for x in df['business_address']]
        df['business_address_normalized'] = [r[0] for r in res_addrs]
        df['address_numbers'] = [r[1] for r in res_addrs]
        
        df['country_normalized'] = [normalize_country(x) for x in df['country']]
        return df

    def get_config(self) -> Dict[str, Any]:
        return {
            "strip_legal_suffixes": self.strip_legal_suffixes,
            "legal_suffix_count": len(LEGAL_SUFFIXES),
            "address_abbreviation_count": len(ADDRESS_ABBREVIATIONS),
            "country_map_count": len(COUNTRY_MAP),
            "version": "1.0.0"
        }
