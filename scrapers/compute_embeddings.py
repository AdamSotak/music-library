"""
Lightweight embedding generator (no external ML deps).

What it encodes:
– Text surface: track name + artist + album + genre slug (hashed TF counts, fixed dim)
– Numeric: duration_z, year_z, popularity_z, optional bpm_z

Genres are kept discrete for gating; this embedding focuses on similarity beyond crude tags.

Stores unit-normalized vector in track_embeddings as JSON. Safe to rerun (upsert).
"""
import argparse
import json
import os
import sqlite3
import math
import re
from typing import List, Tuple, Optional


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

GENERIC = {"unknown", "misc", "other", ""}


def fetch_tracks(cur) -> Tuple[List[tuple], bool]:
    cur.execute("PRAGMA table_info(tracks)")
    cols = [row[1] for row in cur.fetchall()]
    has_bpm = "bpm" in cols
    has_radio_key = "radio_genre_key" in cols

    cur.execute(
        f"""
        SELECT t.id,
               t.name,
               t.duration,
               t.category_slug,
               t.deezer_genre_id,
               { 't.radio_genre_key,' if has_radio_key else "NULL as radio_genre_key," }
               a.name as album_name,
               a.release_date,
               a.genre as album_genre,
               ar.name as artist_name,
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


def to_float(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    try:
        s = str(value).strip()
        if s == "":
            return 0.0
        return float(s)
    except Exception:
        return 0.0


def zscore(values: List[float]) -> Tuple[dict, float, float]:
    if not values:
        return {}, 0.0, 1.0
    mean = sum(values) / len(values)
    var = sum((v - mean) ** 2 for v in values) / max(1, len(values) - 1)
    std = math.sqrt(var) or 1.0
    normed = {i: (v - mean) / std for i, v in enumerate(values)}
    return normed, mean, std


def year_from_date(date_str: Optional[str]) -> int:
    if not date_str:
        return 2000
    try:
        return int(str(date_str)[:4])
    except Exception:
        return 2000


def normalize(vec: List[float]) -> List[float]:
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")


def tokenize(text: str) -> List[str]:
    return TOKEN_RE.findall(text.lower())


def hash_tokens(tokens: List[str], dim: int) -> List[float]:
    vec = [0.0] * dim
    if dim <= 0:
        return vec
    for tok in tokens:
        h = abs(hash(tok)) % dim
        vec[h] += 1.0
    return vec


def resolve_slug(
    radio_genre_key: Optional[str],
    category_slug: Optional[str],
    deezer_genre_id: Optional[str],
    album_genre: Optional[str],
) -> Optional[str]:
    candidates = [radio_genre_key, category_slug, album_genre]
    for cand in candidates:
        if cand:
            c = str(cand).strip().lower()
            if c and c not in GENERIC:
                return c
    if deezer_genre_id:
        return GENRE_ID_TO_SLUG.get(str(deezer_genre_id).strip(), None)
    return None


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
    parser = argparse.ArgumentParser(description="Compute improved embeddings (hashed text + numeric).")
    parser.add_argument("--db", default=os.path.join(os.path.dirname(__file__), "..", "database", "database.sqlite"))
    parser.add_argument("--text-dim", type=int, default=256, help="Hashed text dimension.")
    parser.add_argument("--text-weight", type=float, default=1.0, help="Scalar to weight text block.")
    parser.add_argument("--num-weight", type=float, default=0.3, help="Scalar to weight numeric block.")
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    cur = conn.cursor()

    rows, has_bpm = fetch_tracks(cur)
    if not rows:
        print("No tracks found.")
        return

    # Row shape (with radio_genre_key):
    # 0 id, 1 name, 2 duration, 3 category_slug, 4 deezer_genre_id, 5 radio_genre_key,
    # 6 album_name, 7 release_date, 8 album_genre, 9 artist_name, 10 monthly_listeners, (11 bpm?)
    durations = [to_float(r[2]) for r in rows]
    years = [year_from_date(r[7]) for r in rows]
    popularity = [to_float(r[10]) for r in rows]
    bpm_vals = [to_float(r[-1]) for r in rows] if has_bpm else None

    duration_z, _, _ = zscore(durations)
    year_z, _, _ = zscore(years)
    popularity_z, _, _ = zscore(popularity)
    bpm_z = zscore(bpm_vals)[0] if bpm_vals is not None else None

    text_dim = max(0, args.text_dim)
    for idx, row in enumerate(rows):
        (
            track_id,
            track_name,
            duration,
            category_slug,
            deezer_genre_id,
            radio_genre_key,
            album_name,
            release_date,
            album_genre,
            artist_name,
            monthly_listeners,
            *rest,
        ) = row

        slug = resolve_slug(radio_genre_key, category_slug, deezer_genre_id, album_genre) or "unknown"
        tokens = tokenize(" ".join(filter(None, [track_name, artist_name, album_name, slug])))
        text_vec = hash_tokens(tokens, text_dim)

        # normalize text block then weight
        text_vec = normalize(text_vec)
        text_vec = [v * args.text_weight for v in text_vec]

        num_vec = [
            duration_z.get(idx, 0.0),
            year_z.get(idx, 0.0),
            popularity_z.get(idx, 0.0),
        ]
        if bpm_z is not None:
            num_vec.append(bpm_z.get(idx, 0.0))
        num_vec = [v * args.num_weight for v in num_vec]

        full_vec = text_vec + num_vec
        full_vec = normalize(full_vec)

        upsert_embedding(cur, track_id, full_vec)

    conn.commit()
    print(f"Wrote embeddings for {len(rows)} tracks. dim={text_dim}+{len(num_vec)}")


if __name__ == "__main__":
    main()
