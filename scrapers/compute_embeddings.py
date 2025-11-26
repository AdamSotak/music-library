"""
Lightweight embedding generator for tracks.

Features (metadata only, no heavy dependencies):
- duration (z-score)
- release year (z-score)
- category slug (hashed bucket)
- Deezer genre id (hashed bucket)
- artist popularity / monthly listeners (z-score)

Stores unit-normalized vector in track_embeddings table as JSON.
Safe to run repeatedly; it upserts embeddings.
"""
import argparse
import json
import os
import sqlite3
import math
from collections import defaultdict
from typing import List, Optional, Tuple


def fetch_tracks(cur) -> List[tuple]:
    cur.execute(
        """
        SELECT t.id,
               t.duration,
               t.category_slug,
               t.deezer_genre_id,
               a.release_date,
               ar.monthly_listeners
        FROM tracks t
        LEFT JOIN albums a ON a.id = t.album_id
        LEFT JOIN artists ar ON ar.id = t.artist_id
        WHERE t.audio_url IS NOT NULL
        """
    )
    return cur.fetchall()


def zscore(values: List[float]) -> Tuple[dict, float, float]:
    if not values:
        return {}, 0.0, 1.0
    mean = sum(values) / len(values)
    var = sum((v - mean) ** 2 for v in values) / max(1, len(values) - 1)
    std = math.sqrt(var) or 1.0
    normed = {i: (v - mean) / std for i, v in enumerate(values)}
    return normed, mean, std


def year_from_date(date_str: str) -> int:
    if not date_str:
        return 2000
    try:
        return int(str(date_str)[:4])
    except Exception:
        return 2000


def hash_bucket(value, buckets: int = 32) -> float:
    if value is None:
        return 0.0
    text = str(value)
    if not text:
        return 0.0
    return (abs(hash(text)) % buckets) / (buckets - 1 or 1)


def slug_bucket(slug: Optional[str]) -> float:
    if not slug or slug.lower() in {"unknown", "misc", "other"}:
        return 0.0
    return hash_bucket(slug.lower(), 48)


def normalize(vec: List[float]) -> List[float]:
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def upsert_embedding(cur, track_id: str, vector: List[float]):
    cur.execute(
        """
        INSERT INTO track_embeddings (track_id, embedding, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(track_id) DO UPDATE SET embedding=excluded.embedding, updated_at=CURRENT_TIMESTAMP
        """,
        (track_id, json.dumps(vector)),
    )


def main():
    parser = argparse.ArgumentParser(description="Compute simple metadata embeddings for tracks.")
    parser.add_argument("--db", default=os.path.join(os.path.dirname(__file__), "..", "database", "database.sqlite"))
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    cur = conn.cursor()

    rows = fetch_tracks(cur)
    if not rows:
        print("No tracks found.")
        return

    durations = [r[1] or 0 for r in rows]
    years = [year_from_date(r[4]) for r in rows]
    popularity = [r[5] or 0 for r in rows]

    duration_z, _, _ = zscore(durations)
    year_z, _, _ = zscore(years)
    popularity_z, _, _ = zscore(popularity)

    for idx, (track_id, duration, category, deezer_genre_id, release_date, monthly_listeners) in enumerate(rows):
        vec = [
            duration_z.get(idx, 0.0),
            year_z.get(idx, 0.0),
            slug_bucket(category),
            hash_bucket(deezer_genre_id or ""),
            popularity_z.get(idx, 0.0),
        ]
        vector = normalize(vec)
        upsert_embedding(cur, track_id, vector)

    conn.commit()
    print(f"Wrote embeddings for {len(rows)} tracks.")


if __name__ == "__main__":
    main()
