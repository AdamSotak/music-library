import { Artist, Album, Track, HomepageData } from '@/types/music';

// Mock Artists
export const mockArtists: Artist[] = [
  {
    id: 1,
    name: "The Midnight",
    bio: "Synthwave duo creating nostalgic electronic music",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    albums_count: 5,
    tracks_count: 42,
  },
  {
    id: 2,
    name: "ODESZA",
    bio: "Electronic music duo blending organic and electronic sounds",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
    albums_count: 4,
    tracks_count: 38,
  },
  {
    id: 3,
    name: "Tycho",
    bio: "Ambient electronic music producer and graphic designer",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
    albums_count: 6,
    tracks_count: 54,
  },
  {
    id: 4,
    name: "Bonobo",
    bio: "British musician, producer and DJ known for downtempo electronic music",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    albums_count: 7,
    tracks_count: 67,
  },
];

// Mock Albums
export const mockAlbums: Album[] = [
  {
    id: 1,
    title: "Endless Summer",
    artist_id: 1,
    artist: mockArtists[0],
    cover_image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
    release_date: "2016-08-05",
    tracks_count: 10,
    duration: 2400, // 40 minutes
  },
  {
    id: 2,
    title: "A Moment Apart",
    artist_id: 2,
    artist: mockArtists[1],
    cover_image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
    release_date: "2017-09-08",
    tracks_count: 12,
    duration: 2880, // 48 minutes
  },
  {
    id: 3,
    title: "Dive",
    artist_id: 3,
    artist: mockArtists[2],
    cover_image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&h=300&fit=crop",
    release_date: "2011-11-08",
    tracks_count: 11,
    duration: 2640, // 44 minutes
  },
  {
    id: 4,
    title: "Black Sands",
    artist_id: 4,
    artist: mockArtists[3],
    cover_image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=300&h=300&fit=crop",
    release_date: "2010-03-29",
    tracks_count: 12,
    duration: 3120, // 52 minutes
  },
];

// Mock Tracks
export const mockTracks: Track[] = [
  {
    id: 1,
    title: "Sunset",
    artist_id: 1,
    album_id: 1,
    artist: mockArtists[0],
    album: mockAlbums[0],
    file_path: "/music/the-midnight/endless-summer/sunset.mp3",
    duration: 242, // 4:02
    track_number: 1,
    genre: "Synthwave",
    plays_count: 1234,
  },
  {
    id: 2,
    title: "Vampires",
    artist_id: 1,
    album_id: 1,
    artist: mockArtists[0],
    album: mockAlbums[0],
    file_path: "/music/the-midnight/endless-summer/vampires.mp3",
    duration: 195, // 3:15
    track_number: 2,
    genre: "Synthwave",
    plays_count: 987,
  },
  {
    id: 3,
    title: "Higher Ground",
    artist_id: 2,
    album_id: 2,
    artist: mockArtists[1],
    album: mockAlbums[1],
    file_path: "/music/odesza/a-moment-apart/higher-ground.mp3",
    duration: 218, // 3:38
    track_number: 1,
    genre: "Electronic",
    plays_count: 2156,
  },
  {
    id: 4,
    title: "A Moment Apart",
    artist_id: 2,
    album_id: 2,
    artist: mockArtists[1],
    album: mockAlbums[1],
    file_path: "/music/odesza/a-moment-apart/a-moment-apart.mp3",
    duration: 287, // 4:47
    track_number: 2,
    genre: "Electronic",
    plays_count: 1876,
  },
  {
    id: 5,
    title: "A Walk",
    artist_id: 3,
    album_id: 3,
    artist: mockArtists[2],
    album: mockAlbums[2],
    file_path: "/music/tycho/dive/a-walk.mp3",
    duration: 267, // 4:27
    track_number: 1,
    genre: "Ambient",
    plays_count: 3421,
  },
];

// Homepage data combining all mock data
export const mockHomepageData: HomepageData = {
  featured_albums: mockAlbums.slice(0, 6),
  popular_tracks: mockTracks.slice(0, 10),
  recent_albums: mockAlbums.slice(0, 4),
  trending_artists: mockArtists.slice(0, 6),
};

// Utility functions for development
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
