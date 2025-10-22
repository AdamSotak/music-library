#!/usr/bin/env python3
"""
Match existing database tracks with Deezer API and populate deezer_track_id.

This script:
1. Reads all tracks from the database
2. Searches Deezer API for each track by name + artist
3. Matches and updates deezer_track_id + audio_url
4. Reports statistics
"""

import sqlite3
import requests
import time
import json
from difflib import SequenceMatcher

# Configuration
DB_PATH = "../database/database.sqlite"
BASE_URL = "https://api.deezer.com"
BATCH_SIZE = 10  # Process in batches to avoid rate limits
DELAY_BETWEEN_REQUESTS = 0.2  # 200ms delay between API calls
MIN_SIMILARITY = 0.7  # 70% similarity threshold for matching

# Statistics
stats = {
    "total": 0,
    "matched": 0,
    "not_found": 0,
    "low_confidence": 0,
    "errors": 0,
    "already_set": 0
}


def similarity(a, b):
    """Calculate similarity ratio between two strings (0-1)."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def search_track_on_deezer(track_name, artist_name):
    """
    Search for a track on Deezer API.

    Returns: (deezer_id, audio_url, confidence_score) or None
    """
    try:
        # Build search query
        query = f'{artist_name} {track_name}'

        # Call Deezer search API
        response = requests.get(
            f"{BASE_URL}/search/track",
            params={"q": query, "limit": 5},
            timeout=10
        )

        if not response.ok:
            print(f"    [ERROR] API error: {response.status_code}")
            return None

        data = response.json()

        if "data" not in data or len(data["data"]) == 0:
            print(f"    [ERROR] No results found")
            return None

        # Find best match from results
        best_match = None
        best_score = 0

        for result in data["data"]:
            result_title = result.get("title", "")
            result_artist = result.get("artist", {}).get("name", "")

            # Calculate similarity scores
            title_score = similarity(track_name, result_title)
            artist_score = similarity(artist_name, result_artist)

            # Combined score (weighted average)
            combined_score = (title_score * 0.6) + (artist_score * 0.4)

            if combined_score > best_score:
                best_score = combined_score
                best_match = result

        if best_match and best_score >= MIN_SIMILARITY:
            deezer_id = best_match.get("id")
            preview_url = best_match.get("preview")

            return (deezer_id, preview_url, best_score)
        else:
            print(f"    [WARN] Low confidence match: {best_score:.2%}")
            return None

    except requests.RequestException as e:
        print(f"    [ERROR] Request error: {e}")
        return None
    except Exception as e:
        print(f"    [ERROR] Unexpected error: {e}")
        return None


def process_tracks(limit=None, dry_run=False):
    """
    Process all tracks and match with Deezer.

    Args:
        limit: Maximum number of tracks to process (None = all)
        dry_run: If True, don't update database
    """
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all tracks with artist info
    query = """
        SELECT
            t.id,
            t.name AS track_name,
            t.deezer_track_id,
            a.name AS artist_name
        FROM tracks t
        JOIN artists a ON t.artist_id = a.id
    """

    if limit:
        query += f" LIMIT {limit}"

    cursor.execute(query)
    tracks = cursor.fetchall()

    stats["total"] = len(tracks)

    print(f"\n{'='*60}")
    print(f"Processing {stats['total']} tracks...")
    print(f"Dry run: {dry_run}")
    print(f"{'='*60}\n")

    for i, track in enumerate(tracks, 1):
        track_id = track["id"]
        track_name = track["track_name"]
        artist_name = track["artist_name"]
        existing_deezer_id = track["deezer_track_id"]

        print(f"[{i}/{stats['total']}] {track_name} by {artist_name}")

        # Skip if already has deezer_track_id
        if existing_deezer_id:
            print(f"    [OK] Already has Deezer ID: {existing_deezer_id}")
            stats["already_set"] += 1
            continue

        # Search on Deezer
        result = search_track_on_deezer(track_name, artist_name)

        if result:
            deezer_id, preview_url, confidence = result

            print(f"    [OK] Matched! Deezer ID: {deezer_id} (confidence: {confidence:.2%})")

            if not dry_run:
                # Update database
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
                    stats["errors"] += 1
            else:
                stats["matched"] += 1
        else:
            stats["not_found"] += 1

        # Rate limiting
        time.sleep(DELAY_BETWEEN_REQUESTS)

        # Print progress every 50 tracks
        if i % 50 == 0:
            print(f"\n--- Progress: {i}/{stats['total']} ---")
            print(f"Matched: {stats['matched']}, Not found: {stats['not_found']}, Errors: {stats['errors']}\n")

    conn.close()

    # Final report
    print(f"\n{'='*60}")
    print(f"FINAL REPORT")
    print(f"{'='*60}")
    print(f"Total tracks:        {stats['total']}")
    print(f"Already had ID:      {stats['already_set']}")
    print(f"Newly matched:       {stats['matched']}")
    print(f"Not found:           {stats['not_found']}")
    print(f"Errors:              {stats['errors']}")
    print(f"Success rate:        {(stats['matched'] / (stats['total'] - stats['already_set']) * 100) if stats['total'] > stats['already_set'] else 0:.1f}%")
    print(f"{'='*60}\n")

    # Save report to file
    report_file = f"match_report_{int(time.time())}.json"
    with open(report_file, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"Report saved to: {report_file}")


if __name__ == "__main__":
    import sys

    # Parse command line arguments
    dry_run = "--dry-run" in sys.argv
    limit = None

    for arg in sys.argv[1:]:
        if arg.startswith("--limit="):
            limit = int(arg.split("=")[1])

    print("\nDeezer Track Matching Script")
    print("=" * 60)

    if dry_run:
        print("WARNING: DRY RUN MODE - No database changes will be made")

    if limit:
        print(f"Processing first {limit} tracks")

    print()

    try:
        process_tracks(limit=limit, dry_run=dry_run)
    except KeyboardInterrupt:
        print("\n\nWARNING: Interrupted by user")
        print(f"\nProgress so far:")
        print(f"Matched: {stats['matched']}, Not found: {stats['not_found']}, Errors: {stats['errors']}")
    except Exception as e:
        print(f"\n\nERROR: Fatal error: {e}")
        import traceback
        traceback.print_exc()
