import type { Friend, ReceivedFriendRequest, SentFriendRequest } from "@/types"
import { router } from "@inertiajs/react"
import { useState, useCallback } from "react"

interface SearchUser {
	id: number
	name: string
	email: string
	friend_status: string
}

interface FriendsIndexProps {
	friends: Friend[]
	sentFriendRequests: SentFriendRequest[]
	receivedFriendRequests: ReceivedFriendRequest[]
}

export default function FriendsIndex({
	friends,
	sentFriendRequests,
	receivedFriendRequests,
}: FriendsIndexProps) {
	const [searchQuery, setSearchQuery] = useState("")
	const [searchResults, setSearchResults] = useState<SearchUser[]>([])
	const [isSearching, setIsSearching] = useState(false)

	const handleAcceptRequest = (userId: number) => {
		router.post(`/friends/${userId}/accept`)
	}

	const handleRemoveFriend = (userId: number) => {
		router.post(`/friends/${userId}/remove`)
	}

	const handleCancelRequest = (userId: number) => {
		router.post(`/friends/${userId}`)
	}

	const handleSendFriendRequest = (userId: number) => {
		router.post(`/friends/${userId}`)
	}

	const handleSearch = useCallback(async (query: string) => {
		if (query.length < 2) {
			setSearchResults([])
			return
		}

		setIsSearching(true)
		try {
			const response = await fetch(
				`/api/friends/search?query=${encodeURIComponent(query)}`,
			)
			const data = await response.json()
			setSearchResults(data.users || [])
		} catch (error) {
			console.error("Search failed:", error)
			setSearchResults([])
		} finally {
			setIsSearching(false)
		}
	}, [])

	const handleSearchChange = (value: string) => {
		setSearchQuery(value)
		handleSearch(value)
	}

	return (
		<div className="min-h-screen bg-background-base p-6">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-white text-3xl font-bold mb-8">Friends</h1>

				{/* Search for Users */}
				<div className="mb-8">
					<h2 className="text-white text-xl font-semibold mb-4">
						Find Friends
					</h2>
					<div className="relative">
						<div className="flex items-center bg-zinc-800 rounded-lg px-4 py-3 border border-zinc-700">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="gray"
								className="w-5 h-5 mr-3 flex-shrink-0"
							>
								<path
									d="M21 21l-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => handleSearchChange(e.target.value)}
								placeholder="Search users by name or email..."
								className="bg-transparent text-white placeholder-zinc-400 outline-none flex-1"
							/>
							{isSearching && (
								<div className="ml-3 animate-spin rounded-full h-4 w-4 border-b-2 border-white flex-shrink-0"></div>
							)}
						</div>

						{/* Search Results */}
						{searchResults.length > 0 && (
							<div className="absolute top-full left-0 right-0 bg-zinc-800 border border-zinc-700 rounded-lg mt-3 max-h-96 overflow-y-auto z-20 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
								{searchResults.map((user) => (
									<div
										key={user.id}
										className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-700 border-b border-zinc-700 last:border-b-0 transition-colors"
									>
										<div className="flex-1 min-w-0">
											<h3 className="text-white font-medium truncate">
												{user.name}
											</h3>
											<p className="text-zinc-400 text-sm truncate">
												{user.email}
											</p>
										</div>
										<div className="flex items-center gap-2 flex-shrink-0">
											{user.friend_status === "none" && (
												<button
													onClick={() => handleSendFriendRequest(user.id)}
													className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
												>
													Add Friend
												</button>
											)}
											{user.friend_status === "pending_sent" && (
												<span className="text-yellow-400 text-sm font-medium whitespace-nowrap">
													Request Sent
												</span>
											)}
											{user.friend_status === "pending_received" && (
												<span className="text-green-400 text-sm font-medium whitespace-nowrap">
													Request Received
												</span>
											)}
											{user.friend_status === "accepted" && (
												<span className="text-green-500 text-sm font-medium whitespace-nowrap">
													Friends
												</span>
											)}
											{(user.friend_status === "accepted" ||
												user.friend_status === "pending_sent") && (
												<button
													onClick={() => handleRemoveFriend(user.id)}
													className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
												>
													Remove
												</button>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Received Friend Requests */}
				{receivedFriendRequests.length > 0 && (
					<div className="mb-8">
						<h2 className="text-white text-xl font-semibold mb-4">
							Friend Requests ({receivedFriendRequests.length})
						</h2>
						<div className="space-y-4">
							{receivedFriendRequests.map((request) => (
								<div
									key={request.id}
									className="bg-zinc-800 p-4 rounded-lg flex items-center justify-between"
								>
									<div>
										<h3 className="text-white font-medium">{request.name}</h3>
										<p className="text-zinc-400 text-sm">{request.email}</p>
										<p className="text-zinc-500 text-xs">
											Requested{" "}
											{new Date(request.requested_at).toLocaleDateString()}
										</p>
									</div>
									<div className="flex gap-2">
										<button
											onClick={() => handleAcceptRequest(request.id)}
											className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
										>
											Accept
										</button>
										<button
											onClick={() => handleRemoveFriend(request.id)}
											className="bg-zinc-600 hover:bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
										>
											Decline
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Current Friends */}
				<div className="mb-8">
					<h2 className="text-white text-xl font-semibold mb-4">
						My Friends ({friends.length})
					</h2>
					{friends.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{friends.map((friend) => (
								<div
									key={friend.id}
									className="bg-zinc-800 p-4 rounded-lg flex items-center justify-between"
								>
									<div>
										<h3 className="text-white font-medium">{friend.name}</h3>
										<p className="text-zinc-400 text-sm">{friend.email}</p>
										<p className="text-zinc-500 text-xs">
											Friends since{" "}
											{new Date(friend.created_at).toLocaleDateString()}
										</p>
									</div>
									<button
										onClick={() => handleRemoveFriend(friend.id)}
										className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
									>
										Remove
									</button>
								</div>
							))}
						</div>
					) : (
						<div className="bg-zinc-800 p-8 rounded-lg text-center">
							<p className="text-zinc-400 mb-4">
								You don't have any friends yet.
							</p>
							<p className="text-zinc-500 text-sm">
								Start by finding users in search or browsing playlists!
							</p>
						</div>
					)}
				</div>

				{/* Sent Friend Requests */}
				{sentFriendRequests.length > 0 && (
					<div>
						<h2 className="text-white text-xl font-semibold mb-4">
							Pending Requests ({sentFriendRequests.length})
						</h2>
						<div className="space-y-4">
							{sentFriendRequests.map((request) => (
								<div
									key={request.id}
									className="bg-zinc-800 p-4 rounded-lg flex items-center justify-between"
								>
									<div>
										<h3 className="text-white font-medium">{request.name}</h3>
										<p className="text-zinc-400 text-sm">{request.email}</p>
										<p className="text-zinc-500 text-xs">
											Sent {new Date(request.requested_at).toLocaleDateString()}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-yellow-400 text-sm font-medium">
											Pending
										</span>
										<button
											onClick={() => handleCancelRequest(request.id)}
											className="bg-zinc-600 hover:bg-zinc-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
										>
											Cancel
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
