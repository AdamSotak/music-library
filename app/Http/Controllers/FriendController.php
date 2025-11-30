<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FriendController extends Controller
{
    // Send friend request or remove if already friends
    public function sendFriendRequest(Request $request, int $userId)
    {
        $targetUser = User::findOrFail($userId);
        $currentUser = $request->user();

        if ($currentUser->id === $userId) {
            return redirect()->back()->with('error', 'You cannot send a friend request to yourself.');
        }

        $existingRequest = DB::table('user_friends')
            ->where(function ($query) use ($currentUser, $userId) {
                $query->where('user_id', $currentUser->id)->where('friend_id', $userId);
            })
            ->orWhere(function ($query) use ($currentUser, $userId) {
                $query->where('user_id', $userId)->where('friend_id', $currentUser->id);
            })
            ->first();

        if ($existingRequest) {
            if ($existingRequest->status === 'accepted') {
                // remove friendship
                DB::table('user_friends')
                    ->where('user_id', $existingRequest->user_id)
                    ->where('friend_id', $existingRequest->friend_id)
                    ->delete();

                // remove ex-friend from any shared playlists owned by current user
                DB::table('shared_playlist_users')
                    ->whereIn('playlist_id', function ($query) use ($currentUser) {
                        $query->select('id')
                            ->from('playlists')
                            ->where('user_id', $currentUser->id);
                    })
                    ->where('user_id', $userId)
                    ->delete();

                // remove current user from any shared playlists owned by ex-friend
                DB::table('shared_playlist_users')
                    ->whereIn('playlist_id', function ($query) use ($userId) {
                        $query->select('id')
                            ->from('playlists')
                            ->where('user_id', $userId);
                    })
                    ->where('user_id', $currentUser->id)
                    ->delete();
            } elseif ($existingRequest->status === 'pending') {
                // cancel pending request
                DB::table('user_friends')
                    ->where('user_id', $existingRequest->user_id)
                    ->where('friend_id', $existingRequest->friend_id)
                    ->delete();
            }
        } else {
            // send new friend request
            DB::table('user_friends')->insert([
                'user_id' => $currentUser->id,
                'friend_id' => $userId,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return redirect()->back();
    }

    public function acceptFriendRequest(Request $request, int $userId)
    {
        $currentUser = $request->user();

        $friendRequest = DB::table('user_friends')
            ->where('user_id', $userId)
            ->where('friend_id', $currentUser->id)
            ->where('status', 'pending')
            ->first();

        if (! $friendRequest) {
            return redirect()->back()->with('error', 'Friend request not found.');
        }

        DB::table('user_friends')
            ->where('user_id', $friendRequest->user_id)
            ->where('friend_id', $friendRequest->friend_id)
            ->update([
                'status' => 'accepted',
                'friendship_started_at' => now(),
                'updated_at' => now(),
            ]);

        return redirect()->back();
    }

    public function removeFriend(Request $request, int $userId)
    {
        $currentUser = $request->user();

        $relationship = DB::table('user_friends')
            ->where(function ($query) use ($currentUser, $userId) {
                $query->where('user_id', $currentUser->id)->where('friend_id', $userId);
            })
            ->orWhere(function ($query) use ($currentUser, $userId) {
                $query->where('user_id', $userId)->where('friend_id', $currentUser->id);
            })
            ->first();

        if ($relationship) {
            // remove from friendship table
            DB::table('user_friends')
                ->where('user_id', $relationship->user_id)
                ->where('friend_id', $relationship->friend_id)
                ->delete();

            // removes exfriend from any shared playist owned by user
            DB::table('shared_playlist_users')
                ->whereIn('playlist_id', function ($query) use ($currentUser) {
                    $query->select('id')
                        ->from('playlists')
                        ->where('user_id', $currentUser->id);
                })
                ->where('user_id', $userId)
                ->delete();

            // removes user from any shared playlist owned by exfriend
            DB::table('shared_playlist_users')
                ->whereIn('playlist_id', function ($query) use ($userId) {
                    $query->select('id')
                        ->from('playlists')
                        ->where('user_id', $userId);
                })
                ->where('user_id', $currentUser->id)
                ->delete();
        }

        return redirect()->back();
    }

    public function checkFriendStatus(Request $request, int $userId)
    {
        $currentUser = $request->user();

        if ($currentUser->id === $userId) {
            return response()->json(['status' => 'self']);
        }

        $relationship = DB::table('user_friends')
            ->where(function ($query) use ($currentUser, $userId) {
                $query->where('user_id', $currentUser->id)->where('friend_id', $userId);
            })
            ->orWhere(function ($query) use ($currentUser, $userId) {
                $query->where('user_id', $userId)->where('friend_id', $currentUser->id);
            })
            ->first();

        $status = 'none';
        if ($relationship) {
            $status = $relationship->status;

            // If pending, check who sent it
            if ($status === 'pending') {
                if ($relationship->user_id === $currentUser->id) {
                    $status = 'pending_sent';
                } else {
                    $status = 'pending_received';
                }
            }
        }

        return response()->json(['status' => $status]);
    }

    // Search for users
    public function searchUsers(Request $request)
    {
        $request->validate([
            'query' => 'required|string|min:2|max:255',
        ]);

        $query = $request->input('query');
        $currentUser = $request->user();

        $users = User::where(function ($q) use ($query) {
            $q->where('name', 'like', "%{$query}%")
                ->orWhere('email', 'like', "%{$query}%");
        })
            ->where('id', '!=', $currentUser->id) // Don't show current user
            ->limit(10)
            ->get()
            ->map(function ($user) use ($currentUser) {
                // Check friend status for each user
                $relationship = DB::table('user_friends')
                    ->where(function ($query) use ($currentUser, $user) {
                        $query->where('user_id', $currentUser->id)->where('friend_id', $user->id);
                    })
                    ->orWhere(function ($query) use ($currentUser, $user) {
                        $query->where('user_id', $user->id)->where('friend_id', $currentUser->id);
                    })
                    ->first();

                $status = 'none';
                if ($relationship) {
                    $status = $relationship->status;

                    if ($status === 'pending') {
                        if ($relationship->user_id === $currentUser->id) {
                            $status = 'pending_sent';
                        } else {
                            $status = 'pending_received';
                        }
                    }
                }

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'friend_status' => $status,
                ];
            });

        return response()->json(['users' => $users]);
    }
}
