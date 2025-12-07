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
		<div className="text-white">
			<div className="px-4 md:px-8 pt-8">
				<h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">
					Friends
				</h1>

				{/* Search */}
				<div className="mb-8 max-w-md mx-auto relative">
					<div className="relative">
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => handleSearchChange(e.target.value)}
							placeholder="Search for friends"
							className="w-full bg-zinc-800 text-white px-4 py-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
						/>
						{isSearching && (
							<div className="absolute right-3 top-1/2 -translate-y-1/2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
							</div>
						)}
					</div>

					{/* Search Results Dropdown */}
					{searchResults.length > 0 && (
						<div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 rounded overflow-hidden z-10 shadow-xl">
							{searchResults.map((user) => (
								<div
									key={user.id}
									className="flex items-center gap-3 p-3 hover:bg-white/5 group"
								>
									<div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-medium">
										{user.name.charAt(0).toUpperCase()}
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm truncate">
											{user.name}
										</div>
										<div className="text-xs text-zinc-400 truncate">
											{user.email}
										</div>
									</div>
									{user.friend_status === "none" && (
										<button
											onClick={() => handleSendFriendRequest(user.id)}
											className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform cursor-pointer"
										>
											Add
										</button>
									)}
									{user.friend_status === "pending_sent" && (
										<span className="text-zinc-400 text-xs">Pending</span>
									)}
									{user.friend_status === "pending_received" && (
										<button
											onClick={() => handleAcceptRequest(user.id)}
											className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform cursor-pointer"
										>
											Accept
										</button>
									)}
									{user.friend_status === "accepted" && (
										<span className="text-green-500 text-xs">Friends</span>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				{/* Friend Requests */}
				{receivedFriendRequests.length > 0 && (
					<div className="mb-8">
						<h2 className="text-lg font-bold mb-4">Friend Requests</h2>
						<div className="space-y-1">
							{receivedFriendRequests.map((request) => (
								<div
									key={request.id}
									className="flex items-center gap-3 p-3 rounded hover:bg-white/5 group"
								>
									<div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-lg font-medium">
										{request.name.charAt(0).toUpperCase()}
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-medium truncate">{request.name}</div>
										<div className="text-sm text-zinc-400 truncate">
											{request.email}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<button
											onClick={() => handleAcceptRequest(request.id)}
											className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold hover:scale-105 transition-transform cursor-pointer"
										>
											Accept
										</button>
										<button
											onClick={() => handleRemoveFriend(request.id)}
											className="bg-transparent border border-zinc-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:border-white transition-colors cursor-pointer"
										>
											Decline
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Friends List */}
				<div className="mb-8">
					<h2 className="text-lg font-bold mb-4">Your Friends</h2>
					{friends.length > 0 ? (
						<div className="space-y-1">
							{friends.map((friend) => (
								<div
									key={friend.id}
									className="flex items-center gap-3 p-3 rounded hover:bg-white/5 group"
								>
									<div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-lg font-medium">
										{friend.name.charAt(0).toUpperCase()}
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-medium truncate">{friend.name}</div>
										<div className="text-sm text-zinc-400 truncate">
											{friend.email}
										</div>
									</div>
									<button
										onClick={() => handleRemoveFriend(friend.id)}
										className="bg-transparent border border-zinc-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:border-white transition-all cursor-pointer"
									>
										Remove
									</button>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-12">
							<p className="text-zinc-400 mb-2">No friends yet</p>
							<p className="text-zinc-500 text-sm">
								Search for users to add them as friends
							</p>
						</div>
					)}
				</div>

				{/* Pending Requests */}
				{sentFriendRequests.length > 0 && (
					<div>
						<h2 className="text-lg font-bold mb-4">Pending</h2>
						<div className="space-y-1">
							{sentFriendRequests.map((request) => (
								<div
									key={request.id}
									className="flex items-center gap-3 p-3 rounded hover:bg-white/5 group"
								>
									<div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-lg font-medium">
										{request.name.charAt(0).toUpperCase()}
									</div>
									<div className="flex-1 min-w-0">
										<div className="font-medium truncate">{request.name}</div>
										<div className="text-sm text-zinc-400 truncate">
											{request.email}
										</div>
									</div>
									<div className="flex items-center gap-3">
										<span className="text-zinc-500 text-sm">Pending</span>
										<button
											onClick={() => handleCancelRequest(request.id)}
											className="text-zinc-400 hover:text-white transition-all cursor-pointer"
										>
											<svg
												className="w-5 h-5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M6 18L18 6M6 6l12 12"
												/>
											</svg>
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
