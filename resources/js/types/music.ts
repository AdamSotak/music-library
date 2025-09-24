// Music domain types

export interface Artist {
  id: number;
  name: string;
  bio?: string;
  image?: string;
  albums_count?: number;
  tracks_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Album {
  id: number;
  title: string;
  artist_id: number;
  artist: Artist;
  cover_image?: string;
  release_date?: string;
  tracks_count?: number;
  duration?: number; // total duration in seconds
  tracks?: Track[];
  created_at?: string;
  updated_at?: string;
}

export interface Track {
  id: number;
  title: string;
  artist_id: number;
  album_id?: number;
  artist: Artist;
  album?: Album;
  file_path: string;
  duration: number; // duration in seconds
  track_number?: number;
  genre?: string;
  plays_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Playlist {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  tracks: Track[];
  tracks_count: number;
  is_public: boolean;
  cover_image?: string;
  created_at?: string;
  updated_at?: string;
}

// Player state types
export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number; // 0-1
  currentTime: number; // seconds
  duration: number; // seconds
  queue: Track[];
  currentIndex: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// Homepage data structure
export interface HomepageData {
  featured_albums: Album[];
  popular_tracks: Track[];
  recent_albums: Album[];
  trending_artists: Artist[];
}
