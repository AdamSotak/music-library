"""
Normalize track genres using album genre, artist dominance, and slug/id mapping.
Safe to rerun; will only update category_slug/deezer_genre_id when a better slug is available.
"""

import argparse
import os
import sqlite3
from collections import Counter, defaultdict
from typing import Optional

GENERIC = {"unknown", "misc", "other", ""}

GENRE_ID_TO_SLUG = {
    "132": "pop",
    "116": "hip-hop",
    "152": "metal",
    "85": "rock",
    "98": "folk-and-acoustic",
    "173": "classical",
    "169": "jazz",
    "113": "dance-electronic",
    "165": "soul",
    "4642": "latin",
    "75": "reggae",
    "1324": "country",
    "84": "punk",
}

SLUG_TO_ID = {v: k for k, v in GENRE_ID_TO_SLUG.items()}


def normalize_slug(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    s = str(value).strip().lower()
    if s in GENERIC:
        return None
    return s


def slug_from_id(genre_id: Optional[str]) -> Optional[str]:
    if not genre_id:
        return None
    return GENRE_ID_TO_SLUG.get(str(genre_id).strip())


def dominant_slug(slugs: list[str]) -> Optional[str]:
    counts = Counter([s for s in slugs if s])
    if not counts:
        return None
    slug, count = counts.most_common(1)[0]
    if count == 0:
        return None
    return slug


def main():
    parser = argparse.ArgumentParser(description="Normalize category_slug/deezer_genre_id using album + artist info.")
    parser.add_argument("--db", default=os.path.join(os.path.dirname(__file__), "..", "database", "database.sqlite"))
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    cur = conn.cursor()

    # Fetch album genres
    cur.execute("SELECT id, genre FROM albums")
    album_genres = {row[0]: normalize_slug(row[1]) for row in cur.fetchall()}

    # Fetch artist dominant slug based on album genres
    artist_albums: dict[str, list[str]] = defaultdict(list)
    cur.execute("SELECT artist_id, genre FROM albums WHERE genre IS NOT NULL")
    for artist_id, gen in cur.fetchall():
        artist_albums[artist_id].append(normalize_slug(gen))
    artist_dominant = {aid: dominant_slug(slugs) for aid, slugs in artist_albums.items()}

    # Fetch all tracks
    cur.execute(
        """
        SELECT id, category_slug, deezer_genre_id, album_id, artist_id
        FROM tracks
        """
    )
    rows = cur.fetchall()

    updated = 0
    for track_id, cat_slug, genre_id, album_id, artist_id in rows:
        current_slug = normalize_slug(cat_slug) or slug_from_id(genre_id)
        if current_slug and current_slug not in GENERIC:
            continue  # already good enough

        album_slug = normalize_slug(album_genres.get(album_id))
        artist_slug = normalize_slug(artist_dominant.get(artist_id))

        chosen = album_slug or artist_slug or "pop"  # final fallback to pop
        chosen_id = SLUG_TO_ID.get(chosen, "132")

        cur.execute(
            "UPDATE tracks SET category_slug=?, deezer_genre_id=? WHERE id=?",
            (chosen, chosen_id, track_id),
        )
        updated += cur.rowcount

    conn.commit()
    print(f"Updated {updated} tracks with normalized genres.")


if __name__ == "__main__":
    main()
