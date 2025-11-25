import { useState } from "react"
import { Button } from "./ui/button"
import { Slider } from "./ui/slider"
import { useAudioEffects } from "@/hooks/useAudioEffects"
import type { Track } from "@/hooks/usePlayer"

interface AudioEffectsProps {
	currentTrack: Track | null
	onProcessedAudio: (buffer: AudioBuffer) => void
	className?: string
}

export function AudioEffects({ currentTrack, onProcessedAudio, className }: AudioEffectsProps) {
	const {
		tempo,
		pitch,
		isProcessing,
		setTempo,
		setPitch,
		resetEffects,
		processAudio,
		loadAudioFile,
	} = useAudioEffects()

	const [tempTempo, setTempTempo] = useState(tempo)
	const [tempPitch, setTempPitch] = useState(pitch)

	// Convert pitch from linear scale to semitones for display
	const pitchToSemitones = (pitch: number) => Math.log2(pitch) * 12
	const semitonesToPitch = (semitones: number) => Math.pow(2, semitones / 12)

	const handleTempoChange = (value: number[]) => {
		setTempTempo(value[0])
	}

	const handlePitchChange = (value: number[]) => {
		const semitones = value[0]
		const pitchValue = semitonesToPitch(semitones)
		setTempPitch(pitchValue)
	}

	const handleApplyEffects = async () => {
		if (!currentTrack) return

		try {
			// Update the actual effect values
			setTempo(tempTempo)
			setPitch(tempPitch)

			// Load and process the audio
			const audioUrl = `/api/audio/stream?q=${encodeURIComponent(currentTrack.name)}`
			const audioBuffer = await loadAudioFile(audioUrl)
			const processedBuffer = await processAudio(audioBuffer)
			
			// Notify parent component with processed audio
			onProcessedAudio(processedBuffer)
		} catch (error) {
			console.error("Failed to apply audio effects:", error)
		}
	}

	const handleReset = () => {
		setTempTempo(1.0)
		setTempPitch(1.0)
		resetEffects()
	}

	const formatTempo = (tempo: number) => `${(tempo * 100).toFixed(0)}%`
	const formatPitch = (pitch: number) => {
		const semitones = pitchToSemitones(pitch)
		const sign = semitones >= 0 ? "+" : ""
		return `${sign}${semitones.toFixed(1)} st`
	}

	if (!currentTrack) return null

	return (
		<div className={`p-4 bg-zinc-800/50 rounded-lg space-y-4 ${className || ""}`}>
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium text-white">Audio Effects</h3>
				<Button
					size="sm"
					variant="outline"
					onClick={handleReset}
					disabled={isProcessing}
					className="text-xs text-white border-white/20 hover:bg-white/10"
				>
					Reset
				</Button>
			</div>

			{/* Tempo Slider */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-sm text-white/70">Tempo</span>
					<span className="text-sm text-white font-mono">
						{formatTempo(tempTempo)}
					</span>
				</div>
				<Slider
					className="w-full"
					min={0.5}
					max={2.0}
					step={0.01}
					value={[tempTempo]}
					onValueChange={handleTempoChange}
					disabled={isProcessing}
				/>
			</div>

			{/* Pitch Slider */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-sm text-white/70">Pitch</span>
					<span className="text-sm text-white font-mono">
						{formatPitch(tempPitch)}
					</span>
				</div>
				<Slider
					className="w-full"
					min={-12}
					max={12}
					step={0.1}
					value={[pitchToSemitones(tempPitch)]}
					onValueChange={handlePitchChange}
					disabled={isProcessing}
				/>
			</div>

			{/* Apply Button */}
			<Button
				className="w-full bg-spotify-green hover:bg-spotify-green/80 text-black font-medium"
				onClick={handleApplyEffects}
				disabled={isProcessing || !currentTrack}
			>
				{isProcessing ? "Processing..." : "Apply Effects"}
			</Button>

			{/* Info Text */}
			<p className="text-xs text-white/50 text-center">
				Adjust tempo and pitch, then click Apply to process the audio
			</p>
		</div>
	)
}