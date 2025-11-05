import type { Friend, ReceivedFriendRequest, SentFriendRequest } from "@/types"
import { router } from "@inertiajs/react"

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
	const handleAcceptRequest = (userId: number) => {
		router.post(`/friends/${userId}/accept`)
	}

	const handleRemoveFriend = (userId: number) => {
		router.post(`/friends/${userId}/remove`)
	}

	const handleCancelRequest = (userId: number) => {
		router.post(`/friends/${userId}`)
	}

	return (
		<div className="min-h-screen bg-background-base p-6">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-white text-3xl font-bold mb-8">Friends</h1>

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
									<div className="flex gap-2">
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
