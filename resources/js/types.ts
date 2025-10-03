export type Category = {
	id: string
	name: string
	image: string
	color: string
}

export type Playlist = {
	id: string
	name: string
	description: string
}

export type ShelfItem = {
	title: string
	subtitle?: string
	img?: string
	circle?: boolean
}
