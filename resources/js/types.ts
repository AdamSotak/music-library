export type InertiaPageProps = {
	user: {
		id: number
		name: string
		email: string
		createdAt: string
	} | null
	playlists: Playlist[]
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
	description: string
	image: string
	tracks: Track[]
	is_default?: boolean
}

export type ShelfItem = {
	id: string
	title: string
	subtitle?: string
	type?: "album" | "track" | "artist"
	image?: string
	track?: Track
}
