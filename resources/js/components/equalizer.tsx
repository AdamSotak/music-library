import { useEffect, useRef, useState } from "react"

const EQ_LABELS = ["Bass", "Low-Mids", "Mids", "Presence", "Treble"]
const EQ_BANDS = [100, 250, 1000, 4000, 16000] as const
const DEFAULT_GAIN = 0

type EqualizerProps = {
	audio: HTMLAudioElement | null
	trackKey?: string | number | null
}

export default function Equalizer({ audio, trackKey }: EqualizerProps) {
	const [open, setOpen] = useState(false)
	const [enabled, setEnabled] = useState(false)
	const [gains, setGains] = useState<number[]>(EQ_BANDS.map(() => DEFAULT_GAIN))

	const audioContextRef = useRef<AudioContext | null>(null)
	const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
	const filtersRef = useRef<BiquadFilterNode[]>([])
	const panelRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
				setOpen(false)
			}
		}

		if (open) {
			document.addEventListener("mousedown", handleClickOutside)
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [open])

	useEffect(() => {
		if (!audio) return

		const AudioCtx =
			// biome-ignore lint/suspicious/noExplicitAny: window object is not typed
			(window as any).AudioContext || (window as any).webkitAudioContext
		if (!AudioCtx) {
			console.warn("Web Audio API not supported")
			return
		}

		const ctx: AudioContext = new AudioCtx()
		const source = ctx.createMediaElementSource(audio)

		const filters = EQ_BANDS.map((freq, index) => {
			const f = ctx.createBiquadFilter()
			f.type = "peaking"
			f.frequency.value = freq
			f.Q.value = 1.0
			f.gain.value = gains[index]
			return f
		})

		source.connect(filters[0])
		for (let i = 0; i < filters.length - 1; i++) {
			filters[i].connect(filters[i + 1])
		}
		filters[filters.length - 1].connect(ctx.destination)

		audioContextRef.current = ctx
		sourceRef.current = source
		filtersRef.current = filters

		return () => {
			try {
				source.disconnect()
			} catch {}
			filters.forEach((f) => {
				try {
					f.disconnect()
				} catch {}
			})
			ctx.close().catch(() => {})
			audioContextRef.current = null
			sourceRef.current = null
			filtersRef.current = []
		}
	}, [audio])

	const handleToggleEnabled = async () => {
		const next = !enabled
		setEnabled(next)

		const ctx = audioContextRef.current
		if (!ctx) return

		if (next && ctx.state === "suspended") {
			try {
				await ctx.resume()
			} catch {}
		}

		if (next) {
			filtersRef.current.forEach((f, i) => {
				f.gain.value = gains[i]
			})
		}

		if (!next) {
			filtersRef.current.forEach((f) => {
				f.gain.value = 0
			})
		}
	}

	const handleGainChange = (i: number, value: number) => {
		const next = [...gains]
		next[i] = value
		setGains(next)

		if (enabled && filtersRef.current[i]) {
			filtersRef.current[i].gain.value = value
		}
	}

	const handleReset = () => {
		const flat = EQ_BANDS.map(() => DEFAULT_GAIN)
		setGains(flat)

		filtersRef.current.forEach((f) => {
			f.gain.value = enabled ? DEFAULT_GAIN : 0
		})
	}

	useEffect(() => {
		if (trackKey == null) return
		//setEnabled(true);

		const flat = EQ_BANDS.map(() => DEFAULT_GAIN)
		setGains(flat)

		filtersRef.current.forEach((f) => {
			f.gain.value = 0
		})
	}, [trackKey])

	return (
		<>
			{/* EQ Icon button */}
			<button
				title="Equalizer"
				onClick={() => setOpen((o) => !o)}
				className="group w-4 h-4 flex items-center justify-center"
				style={{
					background: "transparent",
					border: "none",
					padding: 0,
					margin: 0,
					cursor: "pointer",
				}}
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 20 20"
					className="transition-colors duration-300 fill-[#808080] group-hover:fill-white"
				>
					<rect x="2" y="8" width="3" height="4" rx="1" />
					<rect x="8.5" y="5" width="3" height="10" rx="1" />
					<rect x="15" y="3" width="3" height="14" rx="1" />
				</svg>
			</button>

			{/* EQ window */}
			{open && (
				<div
					ref={panelRef}
					style={{
						position: "absolute",
						bottom: 48,
						right: 16,
						background: "#181818",
						borderRadius: 8,
						boxShadow: "0 2px 8px #0008",
						padding: 16,
						zIndex: 1000,
						minWidth: 260,
						color: "#fff",
					}}
				>
					{/* Header + Spotify Switch */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: 8,
						}}
					>
						<span style={{ fontWeight: 700 }}>Equalizer</span>

						{/* ON/OFF SWITCH */}
						<div
							onClick={handleToggleEnabled}
							style={{
								width: 50,
								height: 26,
								borderRadius: 50,
								background: enabled ? "#1DB954" : "#333",
								position: "relative",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								transition: "background 0.25s",
								padding: "0 6px",
								boxSizing: "border-box",
							}}
						>
							{enabled && (
								<span
									style={{
										color: "white",
										fontSize: 11,
										fontWeight: 700,
										marginRight: "auto",
									}}
								>
									ON
								</span>
							)}
							{!enabled && (
								<span
									style={{
										color: "white",
										fontSize: 10,
										fontWeight: 700,
										marginLeft: "auto",
									}}
								>
									OFF
								</span>
							)}
							<div
								style={{
									width: 22,
									height: 22,
									borderRadius: "50%",
									background: "white",
									position: "absolute",
									right: enabled ? 2 : 26,
									transition: "right 0.25s",
									boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
								}}
							/>
						</div>
					</div>

					{/* Sliders */}
					{EQ_BANDS.map((freq, i) => (
						<div
							key={freq}
							style={{
								display: "flex",
								alignItems: "center",
								margin: "8px 0",
								gap: 8,
							}}
						>
							<span style={{ width: 70, fontSize: 12 }}>{EQ_LABELS[i]}</span>
							<input
								type="range"
								min={-12}
								max={12}
								step={0.5}
								value={gains[i]}
								onChange={(e) => handleGainChange(i, Number(e.target.value))}
								style={{
									flex: 1,
									accentColor: "#1DB954",
								}}
							/>
							<span style={{ width: 40, textAlign: "right", fontSize: 12 }}>
								{gains[i].toFixed(1)}dB
							</span>
						</div>
					))}

					<button
						onClick={handleReset}
						style={{
							marginTop: 10,
							background: "#333",
							color: "#fff",
							border: "none",
							borderRadius: 6,
							padding: "6px 12px",
							cursor: "pointer",
							fontWeight: 600,
						}}
					>
						Reset
					</button>
				</div>
			)}
		</>
	)
}
