import os, sys, json, time, urllib.parse, requests

BASE_URL = "https://api.deezer.com"

def api_get(path, params=None):
    r = requests.get(f"{BASE_URL}{path}", params=params or {}, timeout=30)
    j = r.json()
    if isinstance(j, dict) and "data" in j:
        return j["data"]
    return j

def find_artists_by_name(name, limit=1):
    return api_get("/search/artist", {"q": name, "limit": limit})

def get_artist_tracks(artist_id, limit=5):
    return api_get(f"/artist/{artist_id}/top", {"limit": limit})

def get_artist_albums(artist_id, limit=5):
    return api_get(f"/artist/{artist_id}/albums", {"limit": limit})

def normalize_track(t):
    a = t.get("album") or {}
    return {
        "id": t.get("id"),
        "deezer_id": t.get("id"),  # Store Deezer track ID explicitly
        "name": t.get("title"),
        "duration": t.get("duration"),
        "releasedate": None,
        "shareurl": t.get("link"),
        "album_id": a.get("id"),
        "album_name": a.get("title"),
        "audio": t.get("preview"),
        "audiodownload": None,
        "audiodownload_allowed": False,
        "license_ccurl": None,
        "artist_id": (t.get("artist") or {}).get("id"),
        "artist_name": (t.get("artist") or {}).get("name")
    }

def normalize_album(a):
    return {
        "id": a.get("id"),
        "name": a.get("title"),
        "releasedate": a.get("release_date"),
        "shareurl": a.get("link"),
        "image": a.get("cover_medium") or a.get("cover"),
        "zip": None,
        "artist_id": (a.get("artist") or {}).get("id"),
        "artist_name": (a.get("artist") or {}).get("name"),
    }

def normalize_artist(a):
    return {
        "id": a.get("id"),
        "name": a.get("name"),
        "shareurl": a.get("link"),
        "website": None,
        "image": a.get("picture_medium") or a.get("picture"),
        "joindate": None
    }

def fetch_bundle(artist_names, tracks_per_artist=5, albums_per_artist=5):
    out = {
        "generated_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "Deezer API",
        "artists": []
    }
    for name in artist_names:
        artists = find_artists_by_name(name, limit=1)
        if not artists:
            out["artists"].append({"query": name, "error": "artist_not_found"})
            continue
        a = artists[0]
        artist_core = normalize_artist(a)
        tracks_raw = get_artist_tracks(a.get("id"), limit=tracks_per_artist)
        albums_raw = get_artist_albums(a.get("id"), limit=albums_per_artist)
        tracks = [normalize_track(t) for t in tracks_raw]
        albums = [normalize_album(x) for x in albums_raw]
        out["artists"].append({
            "query": name,
            "artist": artist_core,
            "tracks": tracks,
            "albums": albums
        })
    return out

def main():
    tracks_n = 5
    albums_n = 5
    out_path = "data.json"
    names = [
        "Drake",
        "Kendrick Lamar",
        "Kanye West",
        "Metallica",
        "Taylor Swift",
        "Ed Sheeran",
        "Beyoncé",
        "Billie Eilish",
        "The Weeknd",
        "Adele",
        "Coldplay",
        "Eminem",
        "Rihanna",
        "Imagine Dragons",
        "Dua Lipa"
    ]
    bundle = fetch_bundle(names, tracks_per_artist=tracks_n, albums_per_artist=albums_n)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=2)
    print(out_path)

if __name__ == "__main__":
    main()
