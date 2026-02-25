"""
String manipulation and fuzzy matching utilities.

This module provides utilities for calculating string similarity
and performing fuzzy pattern matching for the chatbot's NLP capabilities.
"""

from difflib import SequenceMatcher
from typing import Tuple


def calculate_similarity(str1: str, str2: str) -> float:
    """
    Calculate similarity ratio between two strings.
    
    Uses SequenceMatcher from difflib to determine how similar two strings are.
    
    Args:
        str1: First string to compare
        str2: Second string to compare
        
    Returns:
        Float between 0.0 and 1.0, where 1.0 means identical strings
    """
    return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()


def fuzzy_match_pattern(query: str, pattern: str, threshold: float = 0.6) -> Tuple[bool, float]:
    """
    Perform fuzzy matching between a query and a pattern.
    
    This function uses multiple matching strategies:
    1. Exact match
    2. Substring containment
    3. Word subset matching
    4. Individual word similarity
    5. Overall string similarity
    
    Args:
        query: User's input query
        pattern: Pattern to match against
        threshold: Minimum similarity threshold (0.0 to 1.0)
        
    Returns:
        Tuple of (is_match: bool, similarity_score: float)
    """
    query_lower = query.lower().strip()
    pattern_lower = pattern.lower().strip()

    # Strategy 1: Exact match
    if pattern_lower == query_lower:
        return True, 1.0

    # Strategy 2: Substring containment
    if pattern_lower in query_lower or query_lower in pattern_lower:
        return True, 0.98
    
    # Strategy 3: Word subset matching
    query_words = query_lower.split()
    pattern_words = pattern_lower.split()
    query_words_set = set(query_words)
    pattern_words_set = set(pattern_words)

    # Check if all pattern words are in query
    if pattern_words_set.issubset(query_words_set):
        return True, 0.95

    # Strategy 4: Partial word set matching
    if len(pattern_words_set) > 0:
        matched_words = len(pattern_words_set.intersection(query_words_set))
        match_ratio = matched_words / len(pattern_words_set)
        if match_ratio >= 0.6:
            return True, 0.8 + (match_ratio * 0.15)

    # Strategy 5: Individual word similarity
    if len(query_words) > 0 and len(pattern_words) > 0:
        word_matches = []

        for p_word in pattern_words:
            best_match_score = 0.0
            
            for q_word in query_words:
                # Exact word match
                if q_word == p_word:
                    best_match_score = 1.0
                    break

                # Substring word match for longer words
                if len(q_word) >= 3 and len(p_word) >= 3:
                    if q_word in p_word or p_word in q_word:
                        best_match_score = 0.9
                        continue

                # Calculate word similarity
                similarity = calculate_similarity(q_word, p_word)
                if similarity > best_match_score:
                    best_match_score = similarity

            word_matches.append(best_match_score)

        if word_matches:
            avg_match = sum(word_matches) / len(word_matches)
            if avg_match >= 0.7:
                # Check if enough words have good matches
                good_matches = sum(1 for score in word_matches if score >= 0.6)
                if good_matches >= max(1, len(pattern_words) * 0.6):
                    return True, avg_match

    # Strategy 6: Overall string similarity
    overall_similarity = calculate_similarity(query_lower, pattern_lower)
    if overall_similarity >= threshold:
        return True, overall_similarity
    
    return False, overall_similarity
