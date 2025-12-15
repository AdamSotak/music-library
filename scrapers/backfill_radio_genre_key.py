"""
Backfill tracks.radio_genre_key with a trusted coarse genre anchor for Radio gating.

Design goals:
- Never default "unknown" to "pop" (pop is a real genre, not a placeholder).
- Only set radio_genre_key when we have evidence (track slug, deezer id mapping, album dominant, artist dominant).
- Prefer album-level dominance (strong signal) over track-level noisy/placeholder tags.

Safe to rerun.
"""

import argparse
import os
import sqlite3
from collections import Counter, defaultdict
from typing import Optional


PLACEHOLDERS = {"", "unknown", "misc", "other", "music", "various", "various-artists"}

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

# Minimal coarse set: must roughly align with GenreGraph keys.
ALLOWED = {
    "metal",
    "rock",
    "punk",
    "pop",
    "dance-electronic",
    "rnb",
    "soul",
    "jazz",
    "blues",
    "hip-hop",
    "classical",
    "instrumental",
    "ambient",
    "electronic",
    "latin",
    "reggae",
    "country",
    "folk-and-acoustic",
}


def norm_slug(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip().lower()
    if s in PLACEHOLDERS:
        return None
    if s not in ALLOWED:
        return None
    return s


def slug_from_id(genre_id: Optional[str]) -> Optional[str]:
    if genre_id is None:
        return None
    raw = str(genre_id).strip()
    # Deezer 132 ("pop") was previously used as a default fallback in this repo.
    # Treat it as untrusted unless supported by other metadata.
    if raw == "132":
        return None
    return norm_slug(GENRE_ID_TO_SLUG.get(raw))


def dominant_key(values: list[str], min_share: float, min_count: int) -> Optional[str]:
    if not values:
        return None
    counts = Counter(values)
    key, count = counts.most_common(1)[0]
    total = sum(counts.values())
    if total < min_count:
        return None
    if total == 0:
        return None
    if (count / total) < min_share:
        return None
    return key


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill tracks.radio_genre_key.")
    parser.add_argument(
        "--db",
        default=os.path.join(os.path.dirname(__file__), "..", "database", "database.sqlite"),
    )
    parser.add_argument("--album-share", type=float, default=0.90)
    parser.add_argument("--artist-share", type=float, default=0.80)
    parser.add_argument("--min-count", type=int, default=5)
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(tracks)")
    cols = {row[1] for row in cur.fetchall()}
    if "radio_genre_key" not in cols:
        raise SystemExit("tracks.radio_genre_key column missing; run migrations first.")

    cur.execute(
        """
        SELECT t.id,
               t.artist_id,
               t.album_id,
               t.category_slug,
               t.deezer_genre_id,
               a.genre as album_genre,
               t.radio_genre_key
        FROM tracks t
        LEFT JOIN albums a ON a.id = t.album_id
        """
    )
    rows = cur.fetchall()

    # First pass: provisional track key from direct metadata (no dominance yet).
    provisional: dict[str, Optional[str]] = {}
    track_artist: dict[str, Optional[str]] = {}
    track_album: dict[str, Optional[str]] = {}

    by_album: dict[str, list[str]] = defaultdict(list)
    by_artist: dict[str, list[str]] = defaultdict(list)

    for track_id, artist_id, album_id, category_slug, deezer_genre_id, album_genre, existing in rows:
        track_id = str(track_id)
        artist_id = str(artist_id) if artist_id is not None else None
        album_id = str(album_id) if album_id is not None else None

        track_artist[track_id] = artist_id
        track_album[track_id] = album_id

        # Build from source metadata only; do not feed existing radio_genre_key back
        # into the model, because previous runs may have baked in bad defaults.
        key = norm_slug(category_slug) or slug_from_id(deezer_genre_id) or norm_slug(album_genre)
        provisional[track_id] = key
        if key:
            if album_id:
                by_album[album_id].append(key)
            if artist_id:
                by_artist[artist_id].append(key)

    album_dom = {
        album_id: dominant_key(keys, args.album_share, args.min_count)
        for album_id, keys in by_album.items()
    }
    artist_dom = {
        artist_id: dominant_key(keys, args.artist_share, args.min_count)
        for artist_id, keys in by_artist.items()
    }

    # Pragmatic override: if an artist has a non-trivial count of metal tracks,
    # treat "pop" as suspect and anchor the artist to metal.
    # This is specifically meant to counter earlier genre poisoning.
    min_metal = 3
    for artist_id, keys in by_artist.items():
        counts = Counter(keys)
        if counts.get("metal", 0) >= min_metal:
            if artist_dom.get(artist_id) in (None, "pop"):
                artist_dom[artist_id] = "metal"

    updated = 0
    for track_id, artist_id, album_id, category_slug, deezer_genre_id, album_genre, existing in rows:
        track_id = str(track_id)
        artist_id = str(artist_id) if artist_id is not None else None
        album_id = str(album_id) if album_id is not None else None

        existing_key = norm_slug(existing)
        # Allow overriding existing 'pop' when we can infer a better non-pop anchor.
        if existing_key and existing_key != "pop":
            continue

        key = provisional.get(track_id)

        # If direct key is missing, fill from dominant album/artist.
        if not key:
            if album_id and album_dom.get(album_id):
                key = album_dom[album_id]
            elif artist_id and artist_dom.get(artist_id):
                key = artist_dom[artist_id]

        # If direct key is "pop" but album/artist are strongly non-pop, override.
        if key == "pop":
            if album_id and album_dom.get(album_id) and album_dom[album_id] != "pop":
                key = album_dom[album_id]
            elif artist_id and artist_dom.get(artist_id) and artist_dom[artist_id] != "pop":
                key = artist_dom[artist_id]

        if not key:
            continue

        cur.execute("UPDATE tracks SET radio_genre_key=? WHERE id=?", (key, track_id))
        updated += cur.rowcount

    conn.commit()
    print(f"Updated {updated} tracks with radio_genre_key.")


if __name__ == "__main__":
    main()
