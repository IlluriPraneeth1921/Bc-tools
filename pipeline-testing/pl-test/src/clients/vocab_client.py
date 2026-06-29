"""
Vocabulary Client.
Reads from [InterfaceModule].[VocabularyLookup] and [VocabularyLookupDisplayNames].

Generic shared service — each interface plugin passes its own lookup key mappings.
"""
from typing import Optional, Dict, Tuple
from src.core.database import db, DatabaseManager


class VocabLookupResult:
    """Result of a vocabulary lookup."""
    def __init__(self, display_name: str, identifier: str, code_system_identifier: str):
        self.display_name = display_name
        self.identifier = identifier
        self.code_system_identifier = code_system_identifier


class VocabClient:
    """
    Resolves source values to target display names using VocabularyLookup tables.

    Each interface plugin provides its own lookup_keys dict mapping logical names
    (e.g., 'address_type') to dotted lookup definitions
    (e.g., 'MMIS.MEDICAID PROVIDER.Location Address Type').
    """

    def __init__(self, lookup_keys: Dict[str, str] = None):
        """
        Args:
            lookup_keys: Dict mapping logical lookup names to dotted definitions
                         (CustomerSystemName.CustomerTableName.CustomerColumnName).
                         If None, no lookups will resolve.
        """
        self._lookup_keys = lookup_keys or {}
        self._cache: Dict[Tuple[str, str], Optional[VocabLookupResult]] = {}
        self._vocab_keys: Dict[str, str] = {}

    def _get_vocab_key(self, lookup_name: str) -> Optional[str]:
        if lookup_name in self._vocab_keys:
            return self._vocab_keys[lookup_name]
        lookup_def = self._lookup_keys.get(lookup_name)
        if not lookup_def:
            return None
        parts = lookup_def.split(".")
        if len(parts) != 3:
            return None
        result = db.execute_scalar(
            DatabaseManager.INTERFACE,
            "SELECT VocabularyLookupKey FROM [InterfaceModule].[VocabularyLookup] WHERE CustomerSystemName=? AND CustomerTableName=? AND CustomerColumnName=?",
            tuple(parts),
        )
        if result:
            self._vocab_keys[lookup_name] = str(result)
        return str(result) if result else None

    def lookup(self, lookup_name: str, customer_value: str) -> Optional[VocabLookupResult]:
        """Look up a customer value and return the full vocabulary result."""
        if not customer_value or not customer_value.strip():
            return None
        cache_key = (lookup_name, customer_value)
        if cache_key in self._cache:
            return self._cache[cache_key]
        vocab_key = self._get_vocab_key(lookup_name)
        if not vocab_key:
            self._cache[cache_key] = None
            return None
        rows = db.execute_query(
            DatabaseManager.INTERFACE,
            "SELECT DisplayName, Identifier, CodeSystemIdentifier FROM [InterfaceModule].[VocabularyLookupDisplayNames] WHERE VocabularyLookupKey=? AND CustomerValue=?",
            (vocab_key, customer_value),
        )
        result = VocabLookupResult(rows[0]["DisplayName"], str(rows[0]["Identifier"]), str(rows[0]["CodeSystemIdentifier"])) if rows else None
        self._cache[cache_key] = result
        return result

    def lookup_display_name(self, lookup_name: str, customer_value: str) -> Optional[str]:
        """Look up and return just the display name."""
        r = self.lookup(lookup_name, customer_value)
        return r.display_name if r else None

    def lookup_identifier(self, lookup_name: str, customer_value: str) -> Optional[str]:
        """Look up and return just the identifier."""
        r = self.lookup(lookup_name, customer_value)
        return r.identifier if r else None

    def clear_cache(self):
        """Clear all cached lookup results."""
        self._cache.clear()
        self._vocab_keys.clear()
