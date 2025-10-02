export type Category = {
	id: string
	name: string
	image: string
	color: string
}

export type Track = {
	id: string
	name: string
	artist: string
	album?: string
	album_id?: string
	album_cover?: string
	duration: number
	audio: string | null
}

export type Album = {
	id: string
	name: string
	artist: string
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
}
