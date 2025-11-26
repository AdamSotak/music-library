from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import time
import uuid
from typing import Dict, List, Optional, Sequence, Tuple

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_URL = "https://api.deezer.com"
SESSION: Optional[requests.Session] = None
GENRE_FALLBACK_SLUG = "unknown"
GENRE_ID_MAP = {
    132: "pop",
    116: "hip-hop",
    152: "metal",
    85: "rock",
    98: "folk-and-acoustic",
    173: "classical",
    169: "jazz",
    113: "dance-electronic",
    165: "soul",
    464: "dance-electronic",
    4642: "latin",
    52: "metal",
    1520: "metal",
    1521: "rock",
    1522: "rock",
    1523: "rock",
    75: "reggae",
    1324: "country",
    84: "punk",
}
GENRE_NAME_KEYWORDS = [
    ("metal", "metal"),
    ("rock", "rock"),
    ("pop", "pop"),
    ("hip hop", "hip-hop"),
    ("hip-hop", "hip-hop"),
    ("rap", "hip-hop"),
    ("edm", "dance-electronic"),
    ("dance", "dance-electronic"),
    ("electro", "dance-electronic"),
    ("soul", "soul"),
    ("r&b", "soul"),
    ("rnb", "soul"),
    ("jazz", "jazz"),
    ("country", "country"),
    ("folk", "folk-and-acoustic"),
    ("acoustic", "folk-and-acoustic"),
    ("classical", "classical"),
    ("latin", "latin"),
    ("reggae", "reggae"),
    ("blues", "blues"),
    ("punk", "punk"),
]


def timestamp() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())


def make_session() -> requests.Session:
    s = requests.Session()
    retries = Retry(
        total=5, backoff_factor=1, status_forcelist=(429, 500, 502, 503, 504)
    )
    s.mount("https://", HTTPAdapter(max_retries=retries))
    return s


def api_get(path: str, params: Optional[Dict] = None) -> dict:
    global SESSION
    if SESSION is None:
        SESSION = make_session()
    url = f"{BASE_URL.rstrip('/')}/{path.lstrip('/')}"
    resp = SESSION.get(url, params=params or {}, timeout=20)
    resp.raise_for_status()
    return resp.json()


def search_artist_by_name(name: str) -> Optional[dict]:
    payload = api_get("search/artist", {"q": name, "limit": 1})
    items = payload.get("data") or []
    return items[0] if items else None


def get_artist_by_id(artist_id: str) -> Optional[dict]:
    try:
        return api_get(f"artist/{artist_id}")
    except requests.HTTPError:
        return None


def get_related_artists(artist_id: str, limit: int) -> List[dict]:
    data = api_get(f"artist/{artist_id}/related", {"limit": limit})
    return data.get("data") or []


def get_artist_top_tracks(artist_id: str, limit: int) -> List[dict]:
    data = api_get(f"artist/{artist_id}/top", {"limit": limit})
    return data.get("data") or []


def get_artist_albums(artist_id: str, limit: int) -> List[dict]:
    data = api_get(f"artist/{artist_id}/albums", {"limit": limit})
    return data.get("data") or []


def normalize_genre_id(value) -> Optional[int]:
    if value is None:
        return None
    try:
        genre_id = int(value)
        return genre_id if genre_id > 0 else None
    except (TypeError, ValueError):
        return None


def slug_from_name(name: str) -> Optional[str]:
    if not name:
        return None
    lowered = name.lower()
    for keyword, slug in GENRE_NAME_KEYWORDS:
        if keyword in lowered:
            return slug
    return None


def map_genre_id(genre_id: Optional[int]) -> str:
    if genre_id is None:
        return GENRE_FALLBACK_SLUG
    return GENRE_ID_MAP.get(genre_id, GENRE_FALLBACK_SLUG)


def extract_genre(
    track: Optional[dict],
    album: Optional[dict],
    artist: Optional[dict],
) -> Tuple[Optional[int], str]:
    ids: List[int] = []
    names: List[str] = []

    def gather(obj: Optional[dict]):
        if not obj:
            return
        gid = normalize_genre_id(obj.get("genre_id"))
        if gid is not None:
            ids.append(gid)
        genres = (obj.get("genres") or {}).get("data") or []
        for item in genres:
            gid = normalize_genre_id(item.get("id"))
            if gid is not None:
                ids.append(gid)
            name = item.get("name")
            if name:
                names.append(name)

    gather(track)
    gather(album)
    gather(artist)

    slug = None
    for name in names:
        slug = slug_from_name(name)
        if slug:
            break

    if slug is None:
        for gid in ids:
            slug = map_genre_id(gid)
            if slug and slug != GENRE_FALLBACK_SLUG:
                break

    if slug is None:
        slug = GENRE_FALLBACK_SLUG

    genre_id = ids[0] if ids else None
    return genre_id, slug


def ensure_artist(cur, artist: dict) -> str:
    name = artist.get("name") or "Unknown Artist"
    image = (
        artist.get("picture_big")
        or artist.get("picture_medium")
        or artist.get("picture")
        or f"https://placehold.co/400x400/222/fff?text={name}"
    )
    monthly = int(artist.get("nb_fan") or 0)
    is_verified = 1 if artist.get("radio") else 0

    cur.execute("SELECT id FROM artists WHERE lower(name)=lower(?)", (name,))
    row = cur.fetchone()
    if row:
        artist_id = row[0]
        cur.execute(
            """
            UPDATE artists
            SET name=?, image_url=COALESCE(NULLIF(image_url,''), ?),
                monthly_listeners=?, is_verified=?, updated_at=?
            WHERE id=?
            """,
            (name, image, monthly, is_verified, timestamp(), artist_id),
        )
        return artist_id

    artist_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO artists (id, name, image_url, monthly_listeners, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (artist_id, name, image, monthly, is_verified, timestamp(), timestamp()),
    )
    return artist_id


def ensure_album(cur, album: dict, artist_id: str, genre_slug: str) -> str:
    name = album.get("title") or "Unknown Album"
    cover = (
        album.get("cover_big")
        or album.get("cover_medium")
        or album.get("cover")
        or f"https://placehold.co/600x600/333/fff?text={name}"
    )
    release_date = album.get("release_date") or "2000-01-01"

    cur.execute(
        "SELECT id, image_url FROM albums WHERE lower(name)=lower(?) AND artist_id=?",
        (name, artist_id),
    )
    row = cur.fetchone()
    if row:
        album_id, current_cover = row
        chosen_cover = current_cover or cover
        cur.execute(
            """
            UPDATE albums
            SET name=?, image_url=?, release_date=?, genre=?, updated_at=?
            WHERE id=?
            """,
            (name, chosen_cover, release_date, genre_slug, timestamp(), album_id),
        )
        return album_id

    album_id = str(album.get("id") or uuid.uuid4())
    cur.execute(
        """
        INSERT INTO albums (id, name, artist_id, image_url, release_date, genre, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            album_id,
            name,
            artist_id,
            cover,
            release_date,
            genre_slug,
            timestamp(),
            timestamp(),
        ),
    )
    return album_id


def ensure_track(
    cur,
    track: dict,
    artist_id: str,
    album_id: str,
    genre_slug: str,
    genre_id: Optional[int],
):
    deezer_track_id = str(track.get("id"))
    name = track.get("title") or "Unknown Track"
    duration = int(track.get("duration") or 0)
    audio = track.get("preview") or ""
    genre_id_str = str(genre_id) if genre_id is not None else None

    cur.execute("SELECT id FROM tracks WHERE deezer_track_id=?", (deezer_track_id,))
    row = cur.fetchone()
    if row:
        track_id = row[0]
        cur.execute(
            """
            UPDATE tracks
            SET name=?, artist_id=?, album_id=?, duration=?, audio_url=?, category_slug=?, deezer_genre_id=?, updated_at=?
            WHERE id=?
            """,
            (
                name,
                artist_id,
                album_id,
                duration,
                audio,
                genre_slug,
                genre_id_str,
                timestamp(),
                track_id,
            ),
        )
        return

    cur.execute(
        "SELECT id FROM tracks WHERE lower(name)=lower(?) AND artist_id=?",
        (name, artist_id),
    )
    row = cur.fetchone()
    if row:
        track_id = row[0]
        cur.execute(
            """
            UPDATE tracks
            SET deezer_track_id=?, album_id=?, duration=?, audio_url=?, category_slug=?, deezer_genre_id=?, updated_at=?
            WHERE id=?
            """,
            (
                deezer_track_id,
                album_id,
                duration,
                audio,
                genre_slug,
                genre_id_str,
                timestamp(),
                track_id,
            ),
        )
        return

    track_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO tracks (id, name, artist_id, album_id, duration, audio_url, category_slug, deezer_genre_id, created_at, updated_at, deezer_track_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            track_id,
            name,
            artist_id,
            album_id,
            duration,
            audio,
            genre_slug,
            genre_id_str,
            timestamp(),
            timestamp(),
            deezer_track_id,
        ),
    )


def ingest_artist(cur, artist_obj: dict, tracks_per_artist: int, albums_per_artist: int, related_depth: int):
    artist_id = ensure_artist(cur, artist_obj)
    artist_genre_id, artist_slug = extract_genre(None, None, artist_obj)

    album_map: Dict[str, Tuple[str, dict, Optional[int], str]] = {}
    for album_obj in get_artist_albums(str(artist_obj["id"]), limit=albums_per_artist):
        album_genre_id, album_slug = extract_genre(None, album_obj, artist_obj)
        if album_slug == GENRE_FALLBACK_SLUG:
            album_slug = artist_slug
        if album_genre_id is None:
            album_genre_id = artist_genre_id
        album_local_id = ensure_album(cur, album_obj, artist_id, album_slug)
        if album_obj.get("id"):
            album_map[str(album_obj["id"])] = (
                album_local_id,
                album_obj,
                album_genre_id,
                album_slug,
            )

    for track_obj in get_artist_top_tracks(str(artist_obj["id"]), limit=tracks_per_artist):
        album_ref = track_obj.get("album") or {}
        deezer_album_id = album_ref.get("id")
        album_data = album_map.get(str(deezer_album_id))
        album_local_id = album_data[0] if album_data else None
        album_obj_full = album_data[1] if album_data else None
        album_genre_id = album_data[2] if album_data else None
        album_slug = album_data[3] if album_data else artist_slug

        if not album_local_id:
            fallback_album_slug = album_slug or artist_slug
            album_local_id = ensure_album(
                cur,
                {
                    "id": deezer_album_id or uuid.uuid4(),
                    "title": album_ref.get("title") or track_obj.get("title"),
                    "cover": album_ref.get("cover"),
                },
                artist_id,
                fallback_album_slug,
            )
            album_genre_id = album_genre_id or artist_genre_id
            album_obj_full = album_ref

        genre_id, genre_slug = extract_genre(track_obj, album_obj_full, artist_obj)
        if genre_slug == GENRE_FALLBACK_SLUG:
            genre_slug = album_slug or artist_slug
        if genre_id is None:
            genre_id = album_genre_id or artist_genre_id

        ensure_track(cur, track_obj, artist_id, album_local_id, genre_slug, genre_id)


def build_seed_lists(args, cur) -> Sequence[dict]:
    seeds: List[dict] = []
    processed_names: set[str] = set()

    def maybe_add(artist_obj: Optional[dict]):
        if not artist_obj:
            return
        name = (artist_obj.get("name") or "").lower()
        if not name or name in processed_names:
            return
        processed_names.add(name)
        seeds.append(artist_obj)

    seed_names = [s.strip() for s in (args.seeds or "").split(",") if s.strip()]
    if args.use_existing:
        cur.execute("SELECT DISTINCT name FROM artists WHERE name IS NOT NULL")
        for (name,) in cur.fetchall():
            if name:
                seed_names.append(name)

    for name in seed_names:
        maybe_add(search_artist_by_name(name))

    artist_ids = [s.strip() for s in (args.artist_ids or "").split(",") if s.strip()]
    for artist_id in artist_ids:
        maybe_add(get_artist_by_id(artist_id))

    return seeds


def main():
    parser = argparse.ArgumentParser(description="Incremental Deezer ingestion.")
    parser.add_argument(
        "--db",
        default=os.path.join(
            os.path.dirname(__file__), "..", "database", "database.sqlite"
        ),
    )
    parser.add_argument(
        "--seeds", help="Comma-separated artist names to seed from.", default=""
    )
    parser.add_argument(
        "--artist-ids", help="Comma-separated Deezer artist IDs.", default=""
    )
    parser.add_argument(
        "--use-existing",
        action="store_true",
        help="Use artist names already stored in the database as additional seeds.",
    )
    parser.add_argument("--tracks-per-artist", type=int, default=25)
    parser.add_argument("--albums-per-artist", type=int, default=15)
    parser.add_argument("--related-depth", type=int, default=3)
    parser.add_argument(
        "--max-artists",
        type=int,
        default=500,
        help="Maximum total artists to ingest (including seeds).",
    )
    parser.add_argument(
        "--workers", type=int, default=4, help="Number of worker threads (unused in serial mode)."
    )
    parser.add_argument(
        "--resume-file", type=str, default="", help="Path to resume JSON (visited + queue)."
    )
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"Database not found at {args.db}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(args.db, check_same_thread=False)
    cur = conn.cursor()

    try:
        # build initial seeds (artist objects)
        seeds = build_seed_lists(args, cur)
        if not seeds:
            print(
                "No valid artist seeds resolved. Provide --seeds or --artist-ids.",
                file=sys.stderr,
            )
            sys.exit(1)

        # resume support
        visited = set()
        queue: List[dict] = []
        if args.resume_file and os.path.exists(args.resume_file):
            try:
                with open(args.resume_file, "r") as f:
                    j = json.load(f)
                    visited = set(j.get("visited", []))
                    queue = j.get("queue", [])
            except Exception as e:
                print(f"Failed to load resume file: {e}", file=sys.stderr)
                queue = seeds.copy()
        else:
            queue = seeds.copy()

        # Ensure we don't re-queue visited seeds if starting fresh
        queue = [
            q for q in queue if str(q.get("id") or q.get("name", "")) not in visited
        ]

        total_ingested = len(visited)
        print(
            f"Starting ingest. Queue size: {len(queue)}. Visited: {len(visited)}. Max: {args.max_artists}"
        )

        while queue and total_ingested < args.max_artists:
            artist_obj = queue.pop(0)
            aid = str(artist_obj.get("id") or artist_obj.get("name", ""))

            if not aid or aid in visited:
                continue

            visited.add(aid)
            total_ingested += 1

            print(
                f"[{total_ingested}/{args.max_artists}] Ingesting: {artist_obj.get('name')}"
            )

            try:
                ingest_artist(
                    cur,
                    artist_obj,
                    tracks_per_artist=args.tracks_per_artist,
                    albums_per_artist=args.albums_per_artist,
                    related_depth=0,  # No recursion
                )
                conn.commit()

                # Fetch related to expand queue
                related = get_related_artists(
                    str(artist_obj["id"]), limit=args.related_depth
                )
                for r in related:
                    rid = str(r.get("id") or r.get("name", ""))
                    if rid and rid not in visited:
                        # Avoid duplicates in queue (simple check)
                        if not any(str(q.get("id")) == rid for q in queue):
                            queue.append(r)

            except Exception as e:
                print(
                    f"Failed to ingest {artist_obj.get('name')}: {e}", file=sys.stderr
                )

            # Save resume state every 10 artists
            if args.resume_file and total_ingested % 10 == 0:
                with open(args.resume_file, "w") as f:
                    json.dump({"visited": list(visited), "queue": queue}, f)

        if args.resume_file:
            with open(args.resume_file, "w") as f:
                json.dump({"visited": list(visited), "queue": queue}, f)

        print("Import complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
