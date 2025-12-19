<?php

namespace App\Services\Recommendation;

use App\Models\Album;
use App\Models\Artist;
use App\Models\Playlist;
use App\Models\Track;
use App\Models\User;
use App\Models\UserTrackPlay;
use Illuminate\Support\Collection;

class PersonalRecommendationService
{
    private GenreGraph $genreGraph;

    public function __construct()
    {
        $this->genreGraph = new GenreGraph;
    }

    /**
     * @return array{tracks: array<int, array<string,mixed>>, albums: array<int, array<string,mixed>>, artists: array<int, array<string,mixed>>}
     */
    public function recommendForUser(User $user, int $trackLimit = 20, int $albumLimit = 18, int $artistLimit = 18): array
    {
        $signals = $this->collectSignals($user);
        if (! $signals['profile_vec']) {
            return [
                'tracks' => $this->formatTracks($this->fallbackTracks($signals['exclude_ids'], $trackLimit)),
                'albums' => $this->formatAlbums($this->fallbackAlbums($albumLimit)),
                'artists' => $this->formatArtists($this->fallbackArtists($artistLimit)),
            ];
        }

        /** @var array<int, float> $profileVec */
        $profileVec = $signals['profile_vec'];
        $allowedGenres = $signals['allowed_genres'];

        $candidatePool = $this->buildCandidatePool($signals['exclude_ids'], $signals['followed_artist_ids'], $signals['saved_album_ids'], $allowedGenres);
        if ($candidatePool->isEmpty()) {
            return [
                'tracks' => $this->formatTracks($this->fallbackTracks($signals['exclude_ids'], $trackLimit)),
                'albums' => $this->formatAlbums($this->fallbackAlbums($albumLimit)),
                'artists' => $this->formatArtists($this->fallbackArtists($artistLimit)),
            ];
        }

        $scored = $candidatePool->map(function (Track $t) use ($profileVec) {
            $vec = $t->embedding?->embedding;
            if (! is_array($vec)) {
                return null;
            }

            return [
                'track' => $t,
                'score' => $this->cosine($profileVec, $vec),
                'vec' => $vec,
            ];
        })->filter()->values();

        $seedGenreCounts = $signals['seed_genre_counts'];
        $likedTrackIds = $signals['liked_track_ids'];

        $tracks = $this->diversifyTracks($scored, $trackLimit, $seedGenreCounts, $likedTrackIds);

        $topForAgg = $scored->sortByDesc('score')->take(500)->values();
        $albums = $this->recommendAlbumsFromScored($topForAgg, $signals['saved_album_ids'], $albumLimit);
        $artists = $this->recommendArtistsFromScored($topForAgg, $signals['followed_artist_ids'], $artistLimit);

        return [
            'tracks' => $this->formatTracks($tracks),
            'albums' => $this->formatAlbums($albums),
            'artists' => $this->formatArtists($artists),
        ];
    }

    /**
     * Collect user preference signals and compute a weighted profile embedding.
     *
     * @return array{
     *   liked_track_ids: array<int, string>,
     *   followed_artist_ids: array<int, string>,
     *   saved_album_ids: array<int, string>,
     *   exclude_ids: array<int, string>,
     *   seed_genre_counts: array<string,int>,
     *   allowed_genres: array<int, string>,
     *   profile_vec: array<int, float>|null
     * }
     */
    private function collectSignals(User $user): array
    {
        $likedTrackIds = $this->likedTrackIds($user, 140);
        $followedArtistIds = $user->followedArtists()->limit(60)->pluck('artists.id')->map(fn ($v) => (string) $v)->all();
        $savedAlbumIds = $user->savedAlbums()->limit(60)->pluck('albums.id')->map(fn ($v) => (string) $v)->all();

        $recent = UserTrackPlay::where('user_id', $user->id)
            ->orderByDesc('played_at')
            ->limit(60)
            ->get(['track_id', 'played_at'])
            ->unique('track_id')
            ->values();

        $recentTrackIds = $recent->pluck('track_id')->map(fn ($v) => (string) $v)->all();

        $seedWeights = [];
        foreach ($likedTrackIds as $id) {
            $seedWeights[$id] = max($seedWeights[$id] ?? 0.0, 1.0);
        }
        foreach ($this->sampleTrackIdsByAlbums($savedAlbumIds, 90) as $id) {
            $seedWeights[$id] = max($seedWeights[$id] ?? 0.0, 0.7);
        }
        foreach ($this->sampleTrackIdsByArtists($followedArtistIds, 90) as $id) {
            $seedWeights[$id] = max($seedWeights[$id] ?? 0.0, 0.6);
        }
        foreach ($recent as $row) {
            $id = (string) $row->track_id;
            $days = $row->played_at?->diffInDays(now()) ?? 0;
            $w = 0.18 * exp(-($days / 3.0)); // played songs are weak/volatile preference signals
            $seedWeights[$id] = max($seedWeights[$id] ?? 0.0, $w);
        }

        $seedTracks = Track::with(['embedding'])
            ->whereIn('id', array_keys($seedWeights))
            ->get(['id', 'radio_genre_key', 'deezer_genre_id']);

        $seedGenreCounts = [];
        foreach ($seedTracks as $t) {
            $k = $t->radio_genre_key ?: ((string) ($t->deezer_genre_id ?? ''));
            if ($k === '' || $k === '132') {
                continue;
            }
            $k = strtolower($k);
            $seedGenreCounts[$k] = ($seedGenreCounts[$k] ?? 0) + 1;
        }

        $profileVec = $this->weightedMeanEmbedding($seedTracks, $seedWeights);
        $allowedGenres = $this->allowedGenresFromCounts($seedGenreCounts);

        $exclude = array_values(array_unique(array_merge($likedTrackIds, $recentTrackIds)));

        return [
            'liked_track_ids' => $likedTrackIds,
            'followed_artist_ids' => $followedArtistIds,
            'saved_album_ids' => $savedAlbumIds,
            'exclude_ids' => $exclude,
            'seed_genre_counts' => $seedGenreCounts,
            'allowed_genres' => $allowedGenres,
            'profile_vec' => $profileVec,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function likedTrackIds(User $user, int $limit): array
    {
        $playlist = Playlist::where('user_id', $user->id)
            ->where('is_default', true)
            ->first();

        if (! $playlist) {
            return [];
        }

        return Track::join('playlist_tracks', 'tracks.id', '=', 'playlist_tracks.track_id')
            ->where('playlist_tracks.playlist_id', $playlist->id)
            ->select('tracks.id')
            ->inRandomOrder()
            ->limit($limit)
            ->pluck('tracks.id')
            ->map(fn ($v) => (string) $v)
            ->all();
    }

    /**
     * @param  array<int, string>  $albumIds
     * @return array<int, string>
     */
    private function sampleTrackIdsByAlbums(array $albumIds, int $limit): array
    {
        if (empty($albumIds)) {
            return [];
        }

        return Track::whereIn('album_id', $albumIds)
            ->whereNotNull('audio_url')
            ->inRandomOrder()
            ->limit($limit)
            ->pluck('id')
            ->map(fn ($v) => (string) $v)
            ->all();
    }

    /**
     * @param  array<int, string>  $artistIds
     * @return array<int, string>
     */
    private function sampleTrackIdsByArtists(array $artistIds, int $limit): array
    {
        if (empty($artistIds)) {
            return [];
        }

        return Track::whereIn('artist_id', $artistIds)
            ->whereNotNull('audio_url')
            ->inRandomOrder()
            ->limit($limit)
            ->pluck('id')
            ->map(fn ($v) => (string) $v)
            ->all();
    }

    /**
     * @param  array<int, string>  $excludeIds
     * @param  array<int, string>  $followedArtistIds
     * @param  array<int, string>  $savedAlbumIds
     * @param  array<int, string>  $allowedGenres
     * @return Collection<int, Track>
     */
    private function buildCandidatePool(array $excludeIds, array $followedArtistIds, array $savedAlbumIds, array $allowedGenres): Collection
    {
        $baseQuery = fn () => Track::with(['artist', 'album', 'embedding'])
            ->whereNotNull('audio_url')
            ->whereNotIn('tracks.id', $excludeIds)
            ->whereHas('embedding');

        $pool = collect();

        if (! empty($allowedGenres)) {
            $pool = $pool->merge(
                $baseQuery()
                    ->whereIn('radio_genre_key', $allowedGenres)
                    ->limit(1600)
                    ->get(),
            );
        }

        if (! empty($followedArtistIds)) {
            $pool = $pool->merge(
                $baseQuery()
                    ->whereIn('artist_id', $followedArtistIds)
                    ->limit(900)
                    ->get(),
            );
        }

        if (! empty($savedAlbumIds)) {
            $pool = $pool->merge(
                $baseQuery()
                    ->whereIn('album_id', $savedAlbumIds)
                    ->limit(650)
                    ->get(),
            );
        }

        // Exploration: always include a small random slice to allow niche discoveries.
        $pool = $pool->merge($baseQuery()->inRandomOrder()->limit(420)->get());

        return $pool->unique('id')->values();
    }

    /**
     * @param  Collection<int, array{track: Track, score: float, vec: array<int, float>}>  $scored
     * @param  array<string, int>  $seedGenreCounts
     * @param  array<int, string>  $likedTrackIds
     * @return Collection<int, Track>
     */
    private function diversifyTracks(Collection $scored, int $limit, array $seedGenreCounts, array $likedTrackIds): Collection
    {
        $liked = array_fill_keys($likedTrackIds, true);

        $sorted = $scored->sortByDesc('score')->values();
        $selected = collect();
        $selectedVecs = [];
        $artistCounts = [];
        $albumCounts = [];
        $genreCounts = [];

        $maxPerArtist = 2;
        $maxPerAlbum = 2;
        $maxLikedInShelf = max(1, (int) round($limit * 0.10));

        $genreQuota = $this->genreQuota($seedGenreCounts, $limit);
        $likedUsed = 0;

        foreach ($sorted as $row) {
            /** @var Track $t */
            $t = $row['track'];
            $artistId = (string) $t->artist_id;
            $albumId = (string) ($t->album_id ?? '');

            if (($artistCounts[$artistId] ?? 0) >= $maxPerArtist) {
                continue;
            }
            if ($albumId !== '' && ($albumCounts[$albumId] ?? 0) >= $maxPerAlbum) {
                continue;
            }

            $genre = strtolower((string) ($t->radio_genre_key ?? ''));
            if ($genre !== '' && isset($genreQuota[$genre]) && ($genreCounts[$genre] ?? 0) >= $genreQuota[$genre]) {
                continue;
            }

            $isLiked = isset($liked[(string) $t->id]);
            if ($isLiked && $likedUsed >= $maxLikedInShelf) {
                continue;
            }

            $vec = $row['vec'];
            $maxSim = 0.0;
            foreach ($selectedVecs as $svec) {
                $maxSim = max($maxSim, $this->cosine($vec, $svec));
            }
            // Conservative MMR-style redundancy penalty.
            $effective = (float) $row['score'] - (0.15 * $maxSim);
            if ($effective < 0.25 && $selected->count() >= (int) round($limit * 0.6)) {
                continue;
            }

            $selected->push($t);
            $selectedVecs[] = $vec;
            $artistCounts[$artistId] = ($artistCounts[$artistId] ?? 0) + 1;
            if ($albumId !== '') {
                $albumCounts[$albumId] = ($albumCounts[$albumId] ?? 0) + 1;
            }
            if ($genre !== '') {
                $genreCounts[$genre] = ($genreCounts[$genre] ?? 0) + 1;
            }
            if ($isLiked) {
                $likedUsed++;
            }

            if ($selected->count() >= $limit) {
                break;
            }
        }

        // If we couldn't fill (e.g. low embeddings coverage), top up with best remaining.
        if ($selected->count() < $limit) {
            foreach ($sorted as $row) {
                $t = $row['track'];
                if ($selected->contains('id', $t->id)) {
                    continue;
                }
                $selected->push($t);
                if ($selected->count() >= $limit) {
                    break;
                }
            }
        }

        return $selected->values();
    }

    /**
     * @param  Collection<int, array{track: Track, score: float, vec: array<int, float>}>  $top
     * @param  array<int, string>  $savedAlbumIds
     * @return Collection<int, Album>
     */
    private function recommendAlbumsFromScored(Collection $top, array $savedAlbumIds, int $limit): Collection
    {
        $saved = array_fill_keys($savedAlbumIds, true);
        $best = [];

        foreach ($top as $row) {
            /** @var Track $t */
            $t = $row['track'];
            if (! $t->album) {
                continue;
            }
            $albumId = (string) $t->album_id;
            if ($albumId === '' || isset($saved[$albumId])) {
                continue;
            }
            $best[$albumId] = max($best[$albumId] ?? 0.0, (float) $row['score']);
        }

        arsort($best);
        $albumIds = array_slice(array_keys($best), 0, max(60, $limit * 4));

        $albums = Album::with('artist')->whereIn('id', $albumIds)->get()->keyBy('id');
        $ranked = collect($albumIds)->map(fn ($id) => $albums[$id] ?? null)->filter();

        // Diversify by artist.
        $out = collect();
        $artistCounts = [];
        foreach ($ranked as $album) {
            $aid = (string) $album->artist_id;
            if (($artistCounts[$aid] ?? 0) >= 2) {
                continue;
            }
            $out->push($album);
            $artistCounts[$aid] = ($artistCounts[$aid] ?? 0) + 1;
            if ($out->count() >= $limit) {
                break;
            }
        }

        return $out;
    }

    /**
     * @param  Collection<int, array{track: Track, score: float, vec: array<int, float>}>  $top
     * @param  array<int, string>  $followedArtistIds
     * @return Collection<int, Artist>
     */
    private function recommendArtistsFromScored(Collection $top, array $followedArtistIds, int $limit): Collection
    {
        $followed = array_fill_keys($followedArtistIds, true);
        $best = [];

        foreach ($top as $row) {
            /** @var Track $t */
            $t = $row['track'];
            $artistId = (string) $t->artist_id;
            if ($artistId === '' || isset($followed[$artistId])) {
                continue;
            }
            $best[$artistId] = max($best[$artistId] ?? 0.0, (float) $row['score']);
        }

        arsort($best);
        $artistIds = array_slice(array_keys($best), 0, max(80, $limit * 4));

        return Artist::whereIn('id', $artistIds)
            ->get()
            ->sortBy(function (Artist $a) use ($best) {
                return -($best[$a->id] ?? 0.0);
            })
            ->values()
            ->take($limit);
    }

    /**
     * @param  Collection<int, Track>  $tracks
     * @return array<int, array<string, mixed>>
     */
    private function formatTracks(Collection $tracks): array
    {
        return $tracks->map(fn (Track $track) => [
            'id' => $track->id,
            'name' => $track->name,
            'artist' => $track->artist?->name,
            'artist_id' => $track->artist_id,
            'album' => $track->album?->name,
            'album_id' => $track->album_id,
            'album_cover' => $track->album?->image_url,
            'duration' => $track->duration,
            'audio' => $track->audio_url,
            'deezer_track_id' => $track->deezer_track_id,
        ])->all();
    }

    /**
     * @param  Collection<int, Album>  $albums
     * @return array<int, array<string, mixed>>
     */
    private function formatAlbums(Collection $albums): array
    {
        return $albums->map(fn (Album $album) => [
            'id' => $album->id,
            'name' => $album->name,
            'artist' => $album->artist?->name,
            'artist_id' => $album->artist_id,
            'cover' => $album->image_url,
        ])->all();
    }

    /**
     * @param  Collection<int, Artist>  $artists
     * @return array<int, array<string, mixed>>
     */
    private function formatArtists(Collection $artists): array
    {
        return $artists->map(fn (Artist $artist) => [
            'id' => $artist->id,
            'name' => $artist->name,
            'image' => $artist->image_url,
        ])->all();
    }

    /**
     * @param  array<int, string>  $exclude
     * @return Collection<int, Track>
     */
    private function fallbackTracks(array $exclude, int $limit): Collection
    {
        return Track::with(['artist', 'album'])
            ->whereNotNull('audio_url')
            ->whereNotIn('id', $exclude)
            ->inRandomOrder()
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, Album>
     */
    private function fallbackAlbums(int $limit): Collection
    {
        return Album::with('artist')->inRandomOrder()->limit($limit)->get();
    }

    /**
     * @return Collection<int, Artist>
     */
    private function fallbackArtists(int $limit): Collection
    {
        return Artist::inRandomOrder()->limit($limit)->get();
    }

    /**
     * @param  array<string, int>  $seedGenreCounts
     * @return array<int, string>
     */
    private function allowedGenresFromCounts(array $seedGenreCounts): array
    {
        if (empty($seedGenreCounts)) {
            return [];
        }

        arsort($seedGenreCounts);
        $top = array_slice(array_keys($seedGenreCounts), 0, 3);

        $allowed = [];
        foreach ($top as $g) {
            foreach ($this->genreGraph->keys() as $cand) {
                if ($this->genreGraph->similarity($g, $cand) >= 0.45) {
                    $allowed[] = $cand;
                }
            }
            $allowed[] = $g;
        }

        return array_values(array_unique(array_filter(array_map('strtolower', $allowed))));
    }

    /**
     * @param  array<string, int>  $seedGenreCounts
     * @return array<string, int>
     */
    private function genreQuota(array $seedGenreCounts, int $limit): array
    {
        if (empty($seedGenreCounts)) {
            return [];
        }

        arsort($seedGenreCounts);
        $total = array_sum($seedGenreCounts) ?: 1;

        $quota = [];
        $top = array_slice($seedGenreCounts, 0, 4, true);
        foreach ($top as $genre => $count) {
            $share = $count / $total;
            $quota[$genre] = max(2, (int) round($limit * min(0.45, $share)));
        }

        return $quota;
    }

    /**
     * @param  Collection<int, Track>  $tracks
     * @param  array<string, float>  $weights
     * @return array<int, float>|null
     */
    private function weightedMeanEmbedding(Collection $tracks, array $weights): ?array
    {
        $vecs = [];
        $len = null;
        $wSum = 0.0;

        foreach ($tracks as $t) {
            $w = (float) ($weights[(string) $t->id] ?? 0.0);
            if ($w <= 0.0) {
                continue;
            }

            $vec = $t->embedding?->embedding;
            if (! is_array($vec) || empty($vec)) {
                continue;
            }

            $len = $len === null ? count($vec) : min($len, count($vec));
            $vecs[] = [$vec, $w];
            $wSum += $w;
        }

        if ($len === null || $wSum <= 0.0) {
            return null;
        }

        $avg = array_fill(0, $len, 0.0);
        foreach ($vecs as [$vec, $w]) {
            for ($i = 0; $i < $len; $i++) {
                $avg[$i] += ((float) $vec[$i]) * $w;
            }
        }
        for ($i = 0; $i < $len; $i++) {
            $avg[$i] /= $wSum;
        }

        return $this->unitNormalize($avg);
    }

    /**
     * @param  array<int, float>  $vec
     * @return array<int, float>|null
     */
    private function unitNormalize(array $vec): ?array
    {
        $norm = 0.0;
        foreach ($vec as $v) {
            $norm += ((float) $v) * ((float) $v);
        }
        $norm = sqrt($norm);
        if ($norm <= 0.0) {
            return null;
        }

        return array_map(fn ($v) => ((float) $v) / $norm, $vec);
    }

    /**
     * @param  array<int, float>  $a
     * @param  array<int, float>  $b
     */
    private function cosine(array $a, array $b): float
    {
        $len = min(count($a), count($b));
        if ($len === 0) {
            return 0.0;
        }

        $dot = 0.0;
        $aNorm = 0.0;
        $bNorm = 0.0;
        for ($i = 0; $i < $len; $i++) {
            $av = (float) $a[$i];
            $bv = (float) $b[$i];
            $dot += $av * $bv;
            $aNorm += $av * $av;
            $bNorm += $bv * $bv;
        }

        $den = sqrt($aNorm) * sqrt($bNorm);
        if ($den <= 0.0) {
            return 0.0;
        }

        return $dot / $den;
    }
}
