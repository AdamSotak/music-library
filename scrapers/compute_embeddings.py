"""
Lightweight embedding generator for tracks.

Features (metadata only, no heavy dependencies):
- duration (z-score)
- release year (z-score)
- artist popularity / monthly listeners (z-score)
- optional bpm (z-score) if column exists

Categories / genres are NOT embedded (no hashing); keep them discrete for gating.

Stores unit-normalized vector in track_embeddings table as JSON.
Safe to run repeatedly; it upserts embeddings.
"""
import argparse
import json
import os
import sqlite3
import math
from typing import List, Tuple


def fetch_tracks(cur) -> List[tuple]:
    cur.execute("PRAGMA table_info(tracks)")
    cols = [row[1] for row in cur.fetchall()]
    has_bpm = "bpm" in cols

    cur.execute(
        f"""
        SELECT t.id,
               t.duration,
               a.release_date,
               ar.monthly_listeners
               {', t.bpm' if has_bpm else ''}
        FROM tracks t
        LEFT JOIN albums a ON a.id = t.album_id
        LEFT JOIN artists ar ON ar.id = t.artist_id
        WHERE t.audio_url IS NOT NULL
        """
    )
    rows = cur.fetchall()
    return rows, has_bpm


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

    rows, has_bpm = fetch_tracks(cur)
    if not rows:
        print("No tracks found.")
        return

    durations = [r[1] or 0 for r in rows]
    years = [year_from_date(r[2]) for r in rows]
    popularity = [r[3] or 0 for r in rows]
    bpm_vals = [r[4] or 0 for r in rows] if has_bpm else None

    duration_z, _, _ = zscore(durations)
    year_z, _, _ = zscore(years)
    popularity_z, _, _ = zscore(popularity)
    bpm_z = zscore(bpm_vals)[0] if bpm_vals is not None else None

    for idx, row in enumerate(rows):
        track_id, duration, release_date, monthly_listeners, *rest = row
        vec = [
            duration_z.get(idx, 0.0),
            year_z.get(idx, 0.0),
            popularity_z.get(idx, 0.0),
        ]
        if bpm_z is not None:
            vec.append(bpm_z.get(idx, 0.0))

        vector = normalize(vec)
        upsert_embedding(cur, track_id, vector)

    conn.commit()
    print(f"Wrote embeddings for {len(rows)} tracks.")


if __name__ == "__main__":
    main()
