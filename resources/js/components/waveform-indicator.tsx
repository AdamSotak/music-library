export function WaveformIndicator() {
	return (
		<div className="flex items-center gap-[2px] h-4">
			<span
				className="w-[3px] h-3 bg-green-500 animate-waveform rounded-sm"
				style={{ animationDelay: "0ms" }}
			></span>
			<span
				className="w-[3px] h-4 bg-green-500 animate-waveform rounded-sm"
				style={{ animationDelay: "150ms" }}
			></span>
			<span
				className="w-[3px] h-2 bg-green-500 animate-waveform rounded-sm"
				style={{ animationDelay: "300ms" }}
			></span>
			<span
				className="w-[3px] h-3 bg-green-500 animate-waveform rounded-sm"
				style={{ animationDelay: "450ms" }}
			></span>
			<span
				className="w-[3px] h-4 bg-green-500 animate-waveform rounded-sm"
				style={{ animationDelay: "600ms" }}
			></span>
		</div>
	)
}
