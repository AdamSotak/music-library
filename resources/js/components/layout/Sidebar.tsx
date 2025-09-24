import { Button } from "@/components/ui/button";
import { Home, Search, Library, Heart, Clock, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
}

interface PlaylistItem {
  id: number;
  name: string;
  href: string;
  trackCount?: number;
}

interface SidebarProps {
  activeRoute?: string;
  playlists?: PlaylistItem[];
  className?: string;
  defaultCollapsed?: boolean;
}

export default function Sidebar({ activeRoute = "/", playlists = [], className, defaultCollapsed = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const mainNavigation: NavigationItem[] = [
    {
      href: "/",
      label: "Home",
      icon: <Home className="h-5 w-5" />,
      isActive: activeRoute === "/"
    },
    {
      href: "/search",
      label: "Search",
      icon: <Search className="h-5 w-5" />,
      isActive: activeRoute === "/search"
    },
    {
      href: "/library",
      label: "Your Library",
      icon: <Library className="h-5 w-5" />,
      isActive: activeRoute === "/library"
    }
  ];

  const quickAccess: NavigationItem[] = [
    {
      href: "/liked",
      label: "Liked Songs",
      icon: <Heart className="h-4 w-4" />,
      isActive: activeRoute === "/liked"
    },
    {
      href: "/recent",
      label: "Recently Played",
      icon: <Clock className="h-4 w-4" />,
      isActive: activeRoute === "/recent"
    }
  ];

  return (
    <aside className={cn(
      "bg-black border-r border-zinc-800 flex-shrink-0 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Brand Header with Toggle */}
      <div className={cn("p-6 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className="text-spotify-green">
              <circle cx="12" cy="12" r="10" fill="currentColor"/>
              <path d="M8 12l2 2 4-4" stroke="black" strokeWidth="2" fill="none"/>
            </svg>
            Music Library
          </h1>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Main Navigation */}
      <nav className="px-4 space-y-2">
        {mainNavigation.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 rounded-md transition-colors",
              item.isActive 
                ? "text-white bg-zinc-800" 
                : "text-zinc-400 hover:text-white hover:bg-zinc-800",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? item.label : undefined}
          >
            {item.icon}
            {!isCollapsed && <span className="ml-3">{item.label}</span>}
          </a>
        ))}
      </nav>

      {/* Library Section - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="mt-8 px-4">
          <div className="flex items-center justify-between mb-2 px-3">
            <h3 className="text-sm font-semibold text-zinc-400">
              YOUR LIBRARY
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        
        {/* Quick Access Items */}
        <div className="space-y-1 mb-4">
          {quickAccess.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                item.isActive 
                  ? "text-white bg-zinc-800" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              )}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </a>
          ))}
        </div>

        {/* Playlists Section */}
        {playlists.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-zinc-500 mb-2 px-3">
              PLAYLISTS
            </h4>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {playlists.map((playlist) => (
                <a
                  key={playlist.id}
                  href={playlist.href}
                  className="block px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors group"
                >
                  <div className="truncate">{playlist.name}</div>
                  {playlist.trackCount && (
                    <div className="text-xs text-zinc-500 group-hover:text-zinc-400">
                      {playlist.trackCount} songs
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

          {/* Create Playlist Button */}
          <div className="mt-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800 px-3 py-2 h-auto"
            >
              <Plus className="h-4 w-4 mr-3" />
              Create Playlist
            </Button>
          </div>
        </div>
      )}

      {/* Collapsed state - show only essential quick access */}
      {isCollapsed && (
        <div className="mt-8 px-4 space-y-2">
          {quickAccess.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center px-3 py-2 text-sm rounded-md transition-colors",
                item.isActive 
                  ? "text-white bg-zinc-800" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              )}
              title={item.label}
            >
              {item.icon}
            </a>
          ))}
        </div>
      )}
    </aside>
  );
}
