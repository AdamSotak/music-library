import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockHomepageData, formatDuration } from "@/lib/mock-data";
import { Home, Search, Library, Heart, Clock, Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";

export default function Index() {
  const { featured_albums, popular_tracks, recent_albums, trending_artists } = mockHomepageData;

  return (
    <div className="w-screen min-h-screen bg-background-base">
      {/* Main App Layout */}
      <div className="flex h-screen">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-black border-r border-zinc-800 flex-shrink-0">
          <div className="p-6">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="text-spotify-green">
                <circle cx="12" cy="12" r="10" fill="currentColor"/>
                <path d="M8 12l2 2 4-4" stroke="black" strokeWidth="2" fill="none"/>
              </svg>
              Music Library
            </h1>
          </div>
          
          {/* Navigation Menu */}
          <nav className="px-4 space-y-2">
            <a href="/" className="flex items-center px-3 py-2 text-white bg-zinc-800 rounded-md">
              <Home className="mr-3 h-5 w-5" />
              Home
            </a>
            <a href="/search" className="flex items-center px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
              <Search className="mr-3 h-5 w-5" />
              Search
            </a>
            <a href="/library" className="flex items-center px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
              <Library className="mr-3 h-5 w-5" />
              Your Library
            </a>
          </nav>

          {/* Library Section */}
          <div className="mt-8 px-4">
            <h3 className="text-sm font-semibold text-zinc-400 mb-2 px-3">
              PLAYLISTS
            </h3>
            <div className="space-y-1">
              <a href="/liked" className="flex items-center px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
                <Heart className="mr-3 h-4 w-4" />
                Liked Songs
              </a>
              <a href="/recent" className="flex items-center px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
                <Clock className="mr-3 h-4 w-4" />
                Recently Played
              </a>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="bg-zinc-900 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" className="p-2 hover:bg-zinc-800 rounded-full">
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="p-2 hover:bg-zinc-800 rounded-full">
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="search"
                    placeholder="Search artists, songs, or albums..."
                    className="w-80 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-spotify-green"
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto bg-gradient-to-b from-zinc-800 to-background-base">
            <div className="p-6 space-y-8">
              {/* Welcome Section */}
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Good evening</h2>
                
                {/* Quick Access Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {featured_albums.slice(0, 6).map((album) => (
                    <Card key={album.id} className="bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors cursor-pointer group">
                      <CardContent className="p-4 flex items-center space-x-4">
                        <img 
                          src={album.cover_image} 
                          alt={album.title}
                          className="w-16 h-16 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate">{album.title}</h3>
                          <p className="text-zinc-400 text-sm truncate">{album.artist.name}</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-spotify-green hover:bg-spotify-green/90 text-black rounded-full w-12 h-12 p-0"
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Featured Albums Section */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Featured Albums</h2>
                <div className="grid grid-cols-5 gap-6">
                  {featured_albums.map((album) => (
                    <Card key={album.id} className="bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors cursor-pointer group p-4">
                      <div className="relative mb-4">
                        <img 
                          src={album.cover_image} 
                          alt={album.title}
                          className="w-full aspect-square rounded object-cover"
                        />
                        <Button 
                          size="sm" 
                          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-spotify-green hover:bg-spotify-green/90 text-black rounded-full w-12 h-12 p-0"
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                      </div>
                      <div>
                        <h3 className="text-white font-medium truncate">{album.title}</h3>
                        <p className="text-zinc-400 text-sm truncate">{album.artist.name}</p>
                        <p className="text-zinc-500 text-xs mt-1">{album.tracks_count} tracks</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Popular Tracks Section */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Popular right now</h2>
                <div className="space-y-2">
                  {popular_tracks.slice(0, 5).map((track, index) => (
                    <div key={track.id} className="flex items-center space-x-4 p-2 hover:bg-zinc-800/50 rounded-md group cursor-pointer">
                      <span className="text-zinc-400 text-sm w-6">{index + 1}</span>
                      <img 
                        src={track.album?.cover_image} 
                        alt={track.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{track.title}</h3>
                        <p className="text-zinc-400 text-sm truncate">{track.artist.name}</p>
                      </div>
                      <Badge variant="secondary" className="bg-zinc-700 text-zinc-300">
                        {track.genre}
                      </Badge>
                      <span className="text-zinc-400 text-sm">{formatDuration(track.duration)}</span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending Artists */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Trending Artists</h2>
                <div className="grid grid-cols-6 gap-6">
                  {trending_artists.map((artist) => (
                    <Card key={artist.id} className="bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors cursor-pointer group p-4">
                      <div className="text-center">
                        <Avatar className="w-24 h-24 mx-auto mb-4">
                          <AvatarImage src={artist.image} alt={artist.name} />
                          <AvatarFallback className="bg-zinc-700 text-white text-xl">
                            {artist.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="text-white font-medium truncate">{artist.name}</h3>
                        <p className="text-zinc-400 text-sm">Artist</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-3 flex items-center justify-between">
        {/* Currently Playing */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="w-14 h-14 bg-zinc-700 rounded flex-shrink-0"></div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              No track playing
            </p>
            <p className="text-xs text-zinc-400 truncate">
              Select a song to start playing
            </p>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-center space-x-4 flex-1">
          <Button variant="ghost" size="sm" className="p-2 hover:text-white">
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button className="p-3 bg-white text-black rounded-full hover:bg-zinc-200 transition-colors">
            <Play className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2 hover:text-white">
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Volume & Options */}
        <div className="flex items-center space-x-3 flex-1 justify-end">
          <Volume2 className="h-5 w-5 text-zinc-400" />
          <div className="w-20 h-1 bg-zinc-600 rounded-full">
            <div className="w-3/4 h-full bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
