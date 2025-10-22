#!/usr/bin/env python3
"""
Retry matching unmatched tracks with more aggressive matching strategies.

This script:
1. Targets only tracks without deezer_track_id
2. Uses lower similarity threshold (60%)
3. Cleans track names (removes feat., Acoustic, etc.)
4. Tries multiple search variations
"""

import sqlite3
import requests
import time
import json
import re
from difflib import SequenceMatcher

# Configuration
DB_PATH = "../database/database.sqlite"
BASE_URL = "https://api.deezer.com"
DELAY_BETWEEN_REQUESTS = 0.2
MIN_SIMILARITY = 0.60  # Lowered from 0.70

# Statistics
stats = {
    "total": 0,
    "matched": 0,
    "not_found": 0,
}


def similarity(a, b):
    """Calculate similarity ratio between two strings (0-1)."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def clean_track_name(name):
    """
    Remove common noise from track names to improve matching.
    - feat. / ft. / featuring
    - (Acoustic), (Remix), (Radio Edit), etc.
    """
    # Remove featuring artists
    name = re.sub(r'\(?\s*f(ea)?t\.?\s+[^)]+\)?', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\(?\s*featuring\s+[^)]+\)?', '', name, flags=re.IGNORECASE)

    # Remove version tags
    name = re.sub(r'\(?\s*(Acoustic|Radio Edit|Album Version|Single Version|Explicit|Clean)\s*\)?', '', name, flags=re.IGNORECASE)

    # Remove extra whitespace
    name = re.sub(r'\s+', ' ', name).strip()

    return name


def search_track_variations(track_name, artist_name):
    """
    Try multiple search variations to find best match.

    Returns: (deezer_id, audio_url, confidence_score) or None
    """
    variations = [
        # 1. Original search
        (f'{artist_name} {track_name}', track_name, artist_name),

        # 2. Cleaned track name
        (f'{artist_name} {clean_track_name(track_name)}', clean_track_name(track_name), artist_name),

        # 3. Just track name (in case artist is wrong)
        (track_name, track_name, None),

        # 4. Cleaned track name only
        (clean_track_name(track_name), clean_track_name(track_name), None),
    ]

    best_overall_match = None
    best_overall_score = 0

    for query, expected_track, expected_artist in variations:
        try:
            response = requests.get(
                f"{BASE_URL}/search/track",
                params={"q": query, "limit": 10},  # Increased limit
                timeout=10
            )

            if not response.ok:
                continue

            data = response.json()

            if "data" not in data or len(data["data"]) == 0:
                continue

            # Find best match from results
            for result in data["data"]:
                result_title = result.get("title", "")
                result_artist = result.get("artist", {}).get("name", "")

                # Calculate similarity scores
                title_score = similarity(expected_track, result_title)

                # If we're checking artist, include it
                if expected_artist:
                    artist_score = similarity(expected_artist, result_artist)
                    combined_score = (title_score * 0.6) + (artist_score * 0.4)
                else:
                    # Just use title score if we're ignoring artist
                    combined_score = title_score

                if combined_score > best_overall_score:
                    best_overall_score = combined_score
                    best_overall_match = result

            time.sleep(DELAY_BETWEEN_REQUESTS)

        except Exception as e:
            print(f"    [WARN] Search variation failed: {e}")
            continue

    if best_overall_match and best_overall_score >= MIN_SIMILARITY:
        deezer_id = best_overall_match.get("id")
        preview_url = best_overall_match.get("preview")

        print(f"    [OK] Found: {best_overall_match.get('title')} by {best_overall_match.get('artist', {}).get('name')} ({best_overall_score:.2%})")
        return (deezer_id, preview_url, best_overall_score)
    else:
        if best_overall_score > 0:
            print(f"    [WARN] Best match too low: {best_overall_score:.2%}")
        return None


def retry_unmatched_tracks():
    """
    Retry matching tracks that don't have deezer_track_id.
    """
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get tracks without deezer_track_id
    query = """
        SELECT
            t.id,
            t.name AS track_name,
            a.name AS artist_name
        FROM tracks t
        JOIN artists a ON t.artist_id = a.id
        WHERE t.deezer_track_id IS NULL
    """

    cursor.execute(query)
    tracks = cursor.fetchall()

    stats["total"] = len(tracks)

    print(f"\n{'='*60}")
    print(f"Retrying {stats['total']} unmatched tracks...")
    print(f"Using lower threshold: {MIN_SIMILARITY:.0%}")
    print(f"{'='*60}\n")

    for i, track in enumerate(tracks, 1):
        track_id = track["id"]
        track_name = track["track_name"]
        artist_name = track["artist_name"]

        print(f"[{i}/{stats['total']}] {track_name} by {artist_name}")

        # Try multiple search variations
        result = search_track_variations(track_name, artist_name)

        if result:
            deezer_id, preview_url, confidence = result

            try:
                cursor.execute(
                    "UPDATE tracks SET deezer_track_id = ?, audio_url = ? WHERE id = ?",
                    (str(deezer_id), preview_url, track_id)
                )
                conn.commit()
                print(f"    [OK] Database updated")
                stats["matched"] += 1
            except Exception as e:
                print(f"    [ERROR] Database update failed: {e}")
        else:
            print(f"    [ERROR] No suitable match found")
            stats["not_found"] += 1

        print()  # Blank line for readability

    conn.close()

    # Final report
    print(f"\n{'='*60}")
    print(f"RETRY RESULTS")
    print(f"{'='*60}")
    print(f"Total unmatched:     {stats['total']}")
    print(f"Newly matched:       {stats['matched']}")
    print(f"Still unmatched:     {stats['not_found']}")
    print(f"Success rate:        {(stats['matched'] / stats['total'] * 100) if stats['total'] > 0 else 0:.1f}%")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    print("\nDeezer Track Retry Matching Script")
    print("=" * 60)
    print("Lower threshold: 60%")
    print("Multiple search strategies")
    print()

    try:
        retry_unmatched_tracks()
    except KeyboardInterrupt:
        print("\n\nWARNING: Interrupted by user")
        print(f"\nProgress so far:")
        print(f"Matched: {stats['matched']}, Not found: {stats['not_found']}")
    except Exception as e:
        print(f"\n\nERROR: Fatal error: {e}")
        import traceback
        traceback.print_exc()
