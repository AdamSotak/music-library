export type InertiaPageProps = {
	user: {
		id: number
		name: string
		email: string
		createdAt: string
		twoFactorEnabled: boolean
	} | null
	playlists: Playlist[]
	savedAlbums: SavedAlbum[]
	followedArtists: FollowedArtist[]
}

export type SavedAlbum = {
	id: string
	name: string
	artist: string
	artist_id: string
	cover: string
	year: number | null
	saved_at: string
}

export type FollowedArtist = {
	id: string
	name: string
	image: string
	monthly_listeners?: number
	is_verified?: boolean
	followed_at: string
}

export type Artist = {
	id: string
	name: string
	image: string
	monthly_listeners?: number
	is_verified?: boolean
}

export type Category = {
	id: string
	name: string
	image: string
	color: string
	tracks?: Track[]
	albums?: Omit<Album, "tracks">[]
	playlists?: Omit<Playlist, "tracks">[]
}

export type Track = {
	id: string
	name: string
	artist: string
	artist_id: string
	album?: string
	album_id?: string
	album_cover?: string
	duration: number
	audio: string | null
	color?: string
}

export type Album = {
	id: string
	name: string
	artist: string
	artist_id: string
	cover: string
	year: number
	tracks: Track[]
}

export type Playlist = {
	id: string
	name: string
	description: string | null
	image: string
	tracks: Track[]
	is_default?: boolean
	created_at?: string
	updated_at?: string
	owner_name?: string | null
}

export type ShelfItem = {
	id: string
	title: string
	subtitle?: string
	type?: "album" | "track" | "artist"
	image?: string
	track?: Track
}
