import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react"
import { getTrackCover, usePlayer, type Track } from "@/hooks/usePlayer"
import { router } from "@inertiajs/react"
import { useUiLayout } from "@/hooks/useUiLayout"

// Mobile compact player component
function MobilePlayer({
	isPlaying,
	togglePlay,
	setIsExpanded,
	currentTrack,
}: {
	isPlaying: boolean
	togglePlay: () => void
	setIsExpanded: (value: boolean) => void
	currentTrack: Track | null
}) {
	return (
		<div className="flex items-center justify-between w-full px-4 py-2 bg-zinc-900/95 backdrop-blur-sm border-t border-white/10">
			{/* Album art and song info */}
			<div className="flex items-center gap-3 flex-1 min-w-0">
				<img
					src={
						getTrackCover(currentTrack) ||
						`https://placehold.co/40x40/333/white?text=T`
					}
					alt="Album cover"
					className="w-10 h-10 rounded-sm flex-shrink-0 object-cover"
				/>
				<div className="flex flex-col min-w-0 flex-1">
					<span className="text-sm font-medium text-white leading-none truncate">
						{currentTrack?.name || "No track"}
					</span>
					<span className="text-xs text-white/70 leading-none truncate">
						{/* Handle artist as object or string */}
						{(typeof currentTrack?.artist === "object"
							? (currentTrack.artist as any).name
							: currentTrack?.artist) || "Unknown artist"}
					</span>
				</div>
			</div>

			{/* Mobile controls */}
			<div className="flex items-center gap-2">
				<Button
					size="icon"
					variant="spotifyTransparent"
					className="w-8 h-8"
					onClick={togglePlay}
				>
					{isPlaying ? (
						<svg
							viewBox="0 0 16 16"
							fill="white"
							className="w-4 h-4"
							aria-hidden="true"
						>
							<path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"></path>
						</svg>
					) : (
						<svg
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="white"
							className="w-4 h-4"
						>
							<path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288z"></path>
						</svg>
					)}
				</Button>

				<Button
					size="icon"
					variant="spotifyTransparent"
					className="w-8 h-8"
					onClick={() => setIsExpanded(true)}
				>
					<ChevronUp className="w-4 h-4 text-white" />
				</Button>
			</div>
		</div>
	)
}

// Desktop player component (original layout)
function DesktopPlayer({
	isPlaying,
	togglePlay,
	currentTime,
	duration,
	handleSeek,
	isShuffle,
	setIsShuffle,
	repeatMode,
	setRepeatMode,
	volume,
	setVolume,
	currentTrack,
	playNext,
	playPrevious,
	formatTime,
}: {
	isPlaying: boolean
	togglePlay: () => void
	currentTime: number
	duration: number
	handleSeek: (value: number[]) => void
	isShuffle: boolean
	setIsShuffle: (value: boolean | ((prev: boolean) => boolean)) => void
	repeatMode: "off" | "playlist" | "track"
	setRepeatMode: (
		value:
			| "off"
			| "playlist"
			| "track"
			| ((prev: "off" | "playlist" | "track") => "off" | "playlist" | "track"),
	) => void
	volume: number
	setVolume: (value: number | ((prev: number) => number)) => void
	currentTrack: Track | null
	playNext: () => void
	playPrevious: () => void
	formatTime: (seconds: number) => string
}) {
	const { toggleRightSidebar, isRightSidebarOpen } = useUiLayout()

	return (
		<div className="flex justify-between items-center w-full h-20 px-4">
			<div>
				<div className="flex items-center gap-2">
					<div>
						<img
							src={
								getTrackCover(currentTrack) ||
								`https://placehold.co/48x48/333/white?text=T`
							}
							alt="Album cover"
							className="w-12 h-12 rounded-sm object-cover"
						/>
					</div>

					<div className="flex justify-between items-center gap-2 min-w-50 max-w-56">
						<div className="flex flex-col gap-0.5 ml-1">
							<span className="text-sm font-medium text-white leading-none">
								{currentTrack?.name || "No track"}
							</span>
							<span
								className="text-xs text-white/70 leading-none hover:underline cursor-pointer"
								onClick={() =>
									router.visit(`/artist/${currentTrack?.artist_id}`)
								}
							>
								{/* Handle artist as object or string */}
								{(typeof currentTrack?.artist === "object"
									? (currentTrack.artist as any).name
									: currentTrack?.artist) || "Unknown artist"}
							</span>
						</div>

						<Button
							size={"icon"}
							variant={"spotifyTransparent"}
							className="group"
						>
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								fill="gray"
								viewBox="0 0 16 16"
								className="min-w-4 min-h-4 transition-colors duration-300 group-hover:fill-white"
							>
								<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8"></path>
								<path d="M11.75 8a.75.75 0 0 1-.75.75H8.75V11a.75.75 0 0 1-1.5 0V8.75H5a.75.75 0 0 1 0-1.5h2.25V5a.75.75 0 0 1 1.5 0v2.25H11a.75.75 0 0 1 .75.75"></path>
							</svg>
						</Button>
					</div>
				</div>
			</div>

			<div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 pb-2">
				<div className="flex items-center gap-1">
					<Button
						size={"icon"}
						variant={"spotifyTransparent"}
						className="group relative"
						onClick={() => setIsShuffle((prev) => !prev)}
					>
						{!isShuffle ? (
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="gray"
								className="min-w-4 min-h-4 transition-colors duration-300 group-hover:fill-white"
							>
								<path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path>
								<path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"></path>
							</svg>
						) : (
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="#1ed760"
								className="min-w-4 min-h-4"
							>
								<path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path>
								<path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"></path>
							</svg>
						)}

						{isShuffle && (
							<div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-spotify-green rounded-full" />
						)}
					</Button>

					<Button
						size={"icon"}
						variant={"spotifyTransparent"}
						className="group"
						onClick={playPrevious}
					>
						<svg
							data-encore-id="icon"
							role="img"
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="gray"
							className="min-w-4 min-h-4 transition-colors duration-300 group-hover:fill-white"
						>
							<path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7z"></path>
						</svg>
					</Button>

					<Button
						size={"icon"}
						variant={"spotifyGray"}
						className="group bg-white w-8 h-8"
						onClick={togglePlay}
					>
						{isPlaying ? (
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								fill="black"
								viewBox="0 0 16 16"
								className="min-w-4 min-h-4"
							>
								<path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"></path>
							</svg>
						) : (
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="black"
								className="min-w-4 min-h-4"
							>
								<path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288z"></path>
							</svg>
						)}
					</Button>

					<Button
						size={"icon"}
						variant={"spotifyTransparent"}
						className="group"
						onClick={playNext}
					>
						<svg
							data-encore-id="icon"
							role="img"
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="gray"
							className="min-w-4 min-h-4 transition-colors duration-300 group-hover:fill-white"
						>
							<path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"></path>
						</svg>
					</Button>

					<Button
						size={"icon"}
						variant={"spotifyTransparent"}
						className="group relative"
						onClick={() =>
							setRepeatMode((prev) =>
								prev === "off"
									? "playlist"
									: prev === "playlist"
										? "track"
										: "off",
							)
						}
					>
						{repeatMode === "off" ? (
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="gray"
								className="min-w-4 min-h-4 transition-colors duration-300 group-hover:fill-white"
							>
								<path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"></path>
							</svg>
						) : repeatMode === "playlist" ? (
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="#1ed760"
								className="min-w-4 min-h-4"
							>
								<path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"></path>
							</svg>
						) : repeatMode === "track" ? (
							<svg
								data-encore-id="icon"
								role="img"
								aria-hidden="true"
								viewBox="0 0 16 16"
								fill="#1ed760"
								className="min-w-4 min-h-4"
							>
								<path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h.75v1.5h-.75A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75zM12.25 2.5a2.25 2.25 0 0 1 2.25 2.25v5A2.25 2.25 0 0 1 12.25 12H9.81l1.018-1.018a.75.75 0 0 0-1.06-1.06L6.939 12.75l2.829 2.828a.75.75 0 1 0 1.06-1.06L9.811 13.5h2.439A3.75 3.75 0 0 0 16 9.75v-5A3.75 3.75 0 0 0 12.25 1h-.75v1.5z"></path>
								<path d="m8 1.85.77.694H6.095V1.488q1.046-.077 1.507-.385.474-.308.583-.913h1.32V8H8z"></path>
								<path d="M8.77 2.544 8 1.85v.693z"></path>
							</svg>
						) : null}

						{(repeatMode === "track" || repeatMode === "playlist") && (
							<div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-spotify-green rounded-full" />
						)}
					</Button>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-xs">{formatTime(currentTime)}</span>
					<Slider
						className="w-[23rem]"
						max={duration || 100}
						hideThumb
						value={[currentTime]}
						onValueChange={handleSeek}
					/>
					<span className="text-xs">{formatTime(duration)}</span>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<Button
					size={"icon"}
					variant={"spotifyTransparent"}
					className="group w-4 h-4"
				>
					<svg
						data-encore-id="icon"
						role="img"
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill="gray"
						className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
					>
						<path d="M11.196 8 6 5v6z"></path>
						<path d="M15.002 1.75A1.75 1.75 0 0 0 13.252 0h-10.5a1.75 1.75 0 0 0-1.75 1.75v12.5c0 .966.783 1.75 1.75 1.75h10.5a1.75 1.75 0 0 0 1.75-1.75zm-1.75-.25a.25.25 0 0 1 .25.25v12.5a.25.25 0 0 1-.25.25h-10.5a.25.25 0 0 1-.25-.25V1.75a.25.25 0 0 1 .25-.25z"></path>
					</svg>
				</Button>

				<Button
					size={"icon"}
					variant={"spotifyTransparent"}
					className="group w-4 h-4"
				>
					<svg
						data-encore-id="icon"
						role="img"
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill="gray"
						className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
					>
						<path d="M13.426 2.574a2.831 2.831 0 0 0-4.797 1.55l3.247 3.247a2.831 2.831 0 0 0 1.55-4.797M10.5 8.118l-2.619-2.62L4.74 9.075 2.065 12.12a1.287 1.287 0 0 0 1.816 1.816l3.06-2.688 3.56-3.129zM7.12 4.094a4.331 4.331 0 1 1 4.786 4.786l-3.974 3.493-3.06 2.689a2.787 2.787 0 0 1-3.933-3.933l2.676-3.045z"></path>
					</svg>
				</Button>

				<Button
					size={"icon"}
					variant={"spotifyTransparent"}
					className="group w-4 h-4 relative"
					onClick={toggleRightSidebar}
				>
					<svg
						data-encore-id="icon"
						role="img"
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill={isRightSidebarOpen ? "#1ed760" : "gray"}
						className={`max-w-4 max-h-4 transition-colors duration-300 ${!isRightSidebarOpen ? "group-hover:fill-white" : ""}`}
					>
						<path d="M15 15H1v-1.5h14zm0-4.5H1V9h14zm-14-7A2.5 2.5 0 0 1 3.5 1h9a2.5 2.5 0 0 1 0 5h-9A2.5 2.5 0 0 1 1 3.5m2.5-1a1 1 0 0 0 0 2h9a1 1 0 1 0 0-2z"></path>
					</svg>
					{isRightSidebarOpen && (
						<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-spotify-green rounded-full" />
					)}
				</Button>

				<Button
					size={"icon"}
					variant={"spotifyTransparent"}
					className="group w-4 h-4"
				>
					<svg
						data-encore-id="icon"
						role="img"
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill="gray"
						className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
					>
						<path d="M6 2.75C6 1.784 6.784 1 7.75 1h6.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15h-6.5A1.75 1.75 0 0 1 6 13.25zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25zm-6 0a.25.25 0 0 0-.25.25v6.5c0 .138.112.25.25.25H4V11H1.75A1.75 1.75 0 0 1 0 9.25v-6.5C0 1.784.784 1 1.75 1H4v1.5zM4 15H2v-1.5h2z"></path>
						<path d="M13 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-1-5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"></path>
					</svg>
				</Button>

				<div className="flex items-center gap-2">
					<Button
						size={"icon"}
						variant={"spotifyTransparent"}
						className="group w-4 h-4"
						onClick={() => setVolume((prev) => (prev === 0 ? 32 : 0))}
					>
						{volume === 0 ? (
							<svg
								data-encore-id="icon"
								role="presentation"
								aria-label="Volume off"
								aria-hidden="false"
								viewBox="0 0 16 16"
								fill="gray"
								className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
							>
								<path d="M13.86 5.47a.75.75 0 0 0-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 0 0 8.8 6.53L10.269 8l-1.47 1.47a.75.75 0 1 0 1.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 0 0 1.06-1.06L12.39 8l1.47-1.47a.75.75 0 0 0 0-1.06"></path>
								<path d="M10.116 1.5A.75.75 0 0 0 8.991.85l-6.925 4a3.64 3.64 0 0 0-1.33 4.967 3.64 3.64 0 0 0 1.33 1.332l6.925 4a.75.75 0 0 0 1.125-.649v-1.906a4.7 4.7 0 0 1-1.5-.694v1.3L2.817 9.852a2.14 2.14 0 0 1-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694z"></path>
							</svg>
						) : volume > 0 && volume < 30 ? (
							<svg
								data-encore-id="icon"
								role="presentation"
								aria-label="Volume low"
								aria-hidden="false"
								viewBox="0 0 16 16"
								fill="gray"
								className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
							>
								<path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88"></path>
							</svg>
						) : volume > 30 && volume < 70 ? (
							<svg
								data-encore-id="icon"
								role="presentation"
								aria-label="Volume medium"
								aria-hidden="false"
								viewBox="0 0 16 16"
								fill="gray"
								className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
							>
								<path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 6.087a4.502 4.502 0 0 0 0-8.474v1.65a3 3 0 0 1 0 5.175z"></path>
							</svg>
						) : volume > 70 ? (
							<svg
								data-encore-id="icon"
								role="presentation"
								aria-label="Volume high"
								aria-hidden="false"
								viewBox="0 0 16 16"
								fill="gray"
								className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
							>
								<path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88"></path>
								<path d="M11.5 13.614a5.752 5.752 0 0 0 0-11.228v1.55a4.252 4.252 0 0 1 0 8.127z"></path>
							</svg>
						) : null}
					</Button>
					<Slider
						className="w-20"
						max={100}
						hideThumb
						value={[volume]}
						onValueChange={(value) => setVolume(value[0])}
					/>
				</div>

				<Button
					size={"icon"}
					variant={"spotifyTransparent"}
					className="group w-4 h-4"
				>
					<svg
						data-encore-id="icon"
						role="img"
						viewBox="0 0 16 16"
						fill="gray"
						aria-hidden="true"
						className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
					>
						<path
							fillRule="evenodd"
							clipRule="evenodd"
							d="M0.25 3C0.25 2.0335 1.0335 1.25 2 1.25H5.375V2.75H2C1.86193 2.75 1.75 2.86193 1.75 3V5.42857H0.25V3ZM14 2.75H10.625V1.25H14C14.9665 1.25 15.75 2.0335 15.75 3V5.42857H14.25V3C14.25 2.86193 14.1381 2.75 14 2.75ZM1.75 10.5714V13C1.75 13.1381 1.86193 13.25 2 13.25H5.375V14.75H2C1.0335 14.75 0.25 13.9665 0.25 13V10.5714H1.75ZM14.25 13V10.5714H15.75V13C15.75 13.9665 14.9665 14.75 14 14.75H10.625V13.25H14C14.1381 13.25 14.25 13.1381 14.25 13Z"
						></path>
					</svg>
				</Button>
			</div>
		</div>
	)
}

// Expanded mobile player modal
function ExpandedPlayer({
	isPlaying,
	togglePlay,
	setIsExpanded,
	currentTime,
	duration,
	handleSeek,
	isShuffle,
	setIsShuffle,
	repeatMode,
	setRepeatMode,
	volume,
	setVolume,
	currentTrack,
	playNext,
	playPrevious,
	formatTime,
}: {
	isPlaying: boolean
	togglePlay: () => void
	setIsExpanded: () => void
	currentTime: number
	duration: number
	handleSeek: (value: number[]) => void
	isShuffle: boolean
	setIsShuffle: (value: boolean | ((prev: boolean) => boolean)) => void
	repeatMode: "off" | "playlist" | "track"
	setRepeatMode: (
		value:
			| "off"
			| "playlist"
			| "track"
			| ((prev: "off" | "playlist" | "track") => "off" | "playlist" | "track"),
	) => void
	volume: number
	setVolume: (value: number | ((prev: number) => number)) => void
	currentTrack: Track | null
	playNext: () => void
	playPrevious: () => void
	formatTime: (seconds: number) => string
}) {
	return (
		<div className="flex flex-col h-full w-full text-white p-4 safe-area-inset overflow-y-auto">
			{/* Header with close button */}
			<div className="flex justify-between items-center mb-6 pt-2">
				<Button
					size="icon"
					variant="spotifyTransparent"
					onClick={setIsExpanded}
					className="w-10 h-10"
				>
					<ChevronDown className="w-6 h-6" />
				</Button>
				<span className="text-sm font-medium">Now Playing</span>
				<Button size="icon" variant="spotifyTransparent" className="w-10 h-10">
					<MoreHorizontal className="w-6 h-6" />
				</Button>
			</div>

			{/* Large album art */}
			<div className="flex-1 flex items-center justify-center mb-6 px-4">
				<img
					src={
						getTrackCover(currentTrack) ||
						`https://placehold.co/400x400/333/white?text=T`
					}
					alt="Album cover"
					className="w-full max-w-sm aspect-square rounded-lg shadow-2xl"
				/>
			</div>

			{/* Song info */}
			<div className="text-center mb-6 px-4">
				<h1 className="text-2xl font-bold mb-2 truncate">
					{currentTrack?.name || "No track"}
				</h1>
				<p className="text-lg text-white/70 truncate">
					{/* Handle artist as object or string */}
					{(typeof currentTrack?.artist === "object"
						? (currentTrack.artist as any).name
						: currentTrack?.artist) || "Unknown artist"}
				</p>
			</div>

			{/* Progress bar */}
			<div className="mb-8 px-4">
				<Slider
					className="w-full mb-3"
					max={duration || 100}
					value={[currentTime]}
					onValueChange={handleSeek}
				/>
				<div className="flex justify-between text-sm text-white/70">
					<span>{formatTime(currentTime)}</span>
					<span>{formatTime(duration)}</span>
				</div>
			</div>

			{/* Main controls */}
			<div className="flex items-center justify-center gap-6 mb-8 px-4">
				<Button
					size="icon"
					variant="spotifyTransparent"
					className="w-12 h-12 relative"
					onClick={() => setIsShuffle((prev) => !prev)}
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill={isShuffle ? "#1ed760" : "gray"}
						className="w-6 h-6"
					>
						<path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path>
						<path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"></path>
					</svg>
					{isShuffle && (
						<div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-spotify-green rounded-full" />
					)}
				</Button>

				<Button
					size="icon"
					variant="spotifyTransparent"
					className="w-12 h-12"
					onClick={playPrevious}
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill="white"
						className="w-6 h-6"
					>
						<path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7z"></path>
					</svg>
				</Button>

				<Button
					size="icon"
					variant="spotifyGray"
					className="w-12 h-12 bg-white"
					onClick={togglePlay}
				>
					{isPlaying ? (
						<svg
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="black"
							className="w-8 h-8"
						>
							<path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"></path>
						</svg>
					) : (
						<svg
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="black"
							className="w-8 h-8"
						>
							<path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288z"></path>
						</svg>
					)}
				</Button>

				<Button
					size="icon"
					variant="spotifyTransparent"
					className="w-12 h-12"
					onClick={playNext}
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill="white"
						className="w-6 h-6"
					>
						<path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"></path>
					</svg>
				</Button>

				<Button
					size="icon"
					variant="spotifyTransparent"
					className="w-12 h-12 relative"
					onClick={() =>
						setRepeatMode((prev) =>
							prev === "off"
								? "playlist"
								: prev === "playlist"
									? "track"
									: "off",
						)
					}
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 16 16"
						fill={repeatMode !== "off" ? "#1ed760" : "gray"}
						className="w-6 h-6"
					>
						<path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z"></path>
					</svg>
					{repeatMode === "track" && (
						<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-spotify-green">
							1
						</div>
					)}
					{repeatMode !== "off" && (
						<div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-spotify-green rounded-full" />
					)}
				</Button>
			</div>

			{/* Volume control */}
			<div className="flex items-center gap-4 px-4 pb-4">
				<Button
					size="icon"
					variant="spotifyTransparent"
					className="w-10 h-10 group"
					onClick={() => setVolume((prev) => (prev === 0 ? 32 : 0))}
				>
					{volume === 0 ? (
						<svg
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="gray"
							className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
						>
							<path d="M13.86 5.47a.75.75 0 0 0-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 0 0 8.8 6.53L10.269 8l-1.47 1.47a.75.75 0 1 0 1.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 0 0 1.06-1.06L12.39 8l1.47-1.47a.75.75 0 0 0 0-1.06"></path>
							<path d="M10.116 1.5A.75.75 0 0 0 8.991.85l-6.925 4a3.64 3.64 0 0 0-1.33 4.967 3.64 3.64 0 0 0 1.33 1.332l6.925 4a.75.75 0 0 0 1.125-.649v-1.906a4.7 4.7 0 0 1-1.5-.694v1.3L2.817 9.852a2.14 2.14 0 0 1-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694z"></path>
						</svg>
					) : volume > 0 && volume < 30 ? (
						<svg
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="gray"
							className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
						>
							<path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88"></path>
						</svg>
					) : volume > 30 && volume < 70 ? (
						<svg
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="gray"
							className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
						>
							<path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 6.087a4.502 4.502 0 0 0 0-8.474v1.65a3 3 0 0 1 0 5.175z"></path>
						</svg>
					) : (
						<svg
							aria-hidden="true"
							viewBox="0 0 16 16"
							fill="gray"
							className="max-w-4 max-h-4 transition-colors duration-300 group-hover:fill-white"
						>
							<path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88"></path>
							<path d="M11.5 13.614a5.752 5.752 0 0 0 0-11.228v1.55a4.252 4.252 0 0 1 0 8.127z"></path>
						</svg>
					)}
				</Button>
				<Slider
					className="flex-1"
					max={100}
					value={[volume]}
					onValueChange={(value) => setVolume(value[0])}
				/>
			</div>
		</div>
	)
}

export default function AudioPlayer() {
	const audioRef = useRef<HTMLAudioElement>(null)
	const { currentTrack, isPlaying, setIsPlaying, playNext, playPrevious } =
		usePlayer()
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [volume, setVolume] = useState(50)
	const [isShuffle, setIsShuffle] = useState(false)
	const [repeatMode, setRepeatMode] = useState<"off" | "playlist" | "track">(
		"off",
	)
	const [isExpanded, setIsExpanded] = useState(false)
	const [isClosing, setIsClosing] = useState(false)

	// Load and play track when currentTrack changes
	useEffect(() => {
		if (!audioRef.current || !currentTrack) return

		const url = `/api/audio/stream?q=${encodeURIComponent(currentTrack.name)}`

		audioRef.current.src = url
		audioRef.current.load()

		if (isPlaying) {
			audioRef.current.play().catch((err) => {
				console.error("Playback failed:", err)
				setIsPlaying(false)
			})
		} else {
			audioRef.current.pause()
		}
	}, [isPlaying, currentTrack, setIsPlaying])

	// Handle play/pause state changes
	useEffect(() => {
		if (!audioRef.current || !currentTrack) return

		if (isPlaying) {
			audioRef.current.play().catch((err) => {
				console.error("Playback failed:", err)
				setIsPlaying(false)
			})
		} else {
			audioRef.current.pause()
		}
	}, [isPlaying, currentTrack, setIsPlaying])

	// Update volume
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = volume / 100
		}
	}, [volume])

	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime)
		}
	}

	const handleLoadedMetadata = () => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration)
		}
	}

	const handleEnded = () => {
		if (repeatMode === "track") {
			audioRef.current?.play()
			return
		}

		const _before = usePlayer.getState()
		if (repeatMode === "playlist" || repeatMode === "off") {
			playNext()
		}
		const after = usePlayer.getState()
		const isAtEnd = after.currentIndex >= after.queue.length - 1
		if (isAtEnd) {
			if (typeof window !== "undefined") {
				window.dispatchEvent(new Event("player:end-of-queue"))
			}
		}
	}

	const handleSeek = (value: number[]) => {
		const time = value[0]
		if (audioRef.current) {
			audioRef.current.currentTime = time
			setCurrentTime(time)
		}
	}

	const togglePlay = () => {
		setIsPlaying(!isPlaying)
	}

	const formatTime = (seconds: number) => {
		if (!Number.isFinite(seconds)) return "0:00"
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins}:${secs.toString().padStart(2, "0")}`
	}

	const handleClose = useCallback(() => {
		setIsClosing(true)
		setTimeout(() => {
			setIsExpanded(false)
			setIsClosing(false)
		}, 300) // Match animation duration
	}, [])

	// Handle escape key to close modal
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && isExpanded && !isClosing) {
				handleClose()
			}
		}

		if (isExpanded) {
			document.addEventListener("keydown", handleKeyDown)
			// Prevent body scroll when modal is open
			document.body.style.overflow = "hidden"
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown)
			document.body.style.overflow = "unset"
		}
	}, [isExpanded, isClosing, handleClose])

	return (
		<>
			<audio
				ref={audioRef}
				onTimeUpdate={handleTimeUpdate}
				onLoadedMetadata={handleLoadedMetadata}
				onEnded={handleEnded}
				aria-label="Audio player"
			>
				<track kind="captions" />
			</audio>

			{/* Full-screen mobile player modal */}
			{isExpanded && (
				<div
					className={`fixed inset-0 z-50 bg-gradient-to-b from-zinc-800 to-zinc-900 lg:hidden transition-transform duration-300 ease-in-out ${
						isClosing
							? "animate-out slide-out-to-bottom"
							: "animate-in slide-in-from-bottom"
					}`}
					onClick={(e) => {
						// Close if clicking on backdrop (not on content)
						if (e.target === e.currentTarget) {
							handleClose()
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							handleClose()
						}
					}}
					role="dialog"
					aria-modal="true"
					tabIndex={-1}
				>
					<ExpandedPlayer
						isPlaying={isPlaying}
						togglePlay={togglePlay}
						setIsExpanded={handleClose}
						currentTime={currentTime}
						duration={duration}
						handleSeek={handleSeek}
						isShuffle={isShuffle}
						setIsShuffle={setIsShuffle}
						repeatMode={repeatMode}
						setRepeatMode={setRepeatMode}
						volume={volume}
						setVolume={setVolume}
						currentTrack={currentTrack}
						playNext={playNext}
						playPrevious={playPrevious}
						formatTime={formatTime}
					/>
				</div>
			)}

			{/* Mobile layout (hidden on md and up) */}
			<div className="lg:hidden w-full mt-1 bg-zinc-900/95 backdrop-blur-sm border-t border-white/10">
				<MobilePlayer
					isPlaying={isPlaying}
					togglePlay={togglePlay}
					setIsExpanded={setIsExpanded}
					currentTrack={currentTrack}
				/>
			</div>

			{/* Desktop layout (hidden on mobile) */}
			<div className="hidden lg:block">
				<DesktopPlayer
					isPlaying={isPlaying}
					togglePlay={togglePlay}
					currentTime={currentTime}
					duration={duration}
					handleSeek={handleSeek}
					isShuffle={isShuffle}
					setIsShuffle={setIsShuffle}
					repeatMode={repeatMode}
					setRepeatMode={setRepeatMode}
					volume={volume}
					setVolume={setVolume}
					currentTrack={currentTrack}
					playNext={playNext}
					playPrevious={playPrevious}
					formatTime={formatTime}
				/>
			</div>
		</>
	)
}
