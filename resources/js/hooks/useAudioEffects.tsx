import { useState, useRef, useCallback, useEffect } from "react"
import { RubberBandInterface } from "rubberband-wasm"

interface AudioEffectsState {
	tempo: number
	pitch: number
	isProcessing: boolean
	processedBuffer: AudioBuffer | null
}

export function useAudioEffects() {
	const [effects, setEffects] = useState<AudioEffectsState>({
		tempo: 1.0,
		pitch: 1.0,
		isProcessing: false,
		processedBuffer: null,
	})

	const audioContextRef = useRef<AudioContext | null>(null)
	const rubberBandApiRef = useRef<RubberBandInterface | null>(null)
	const isInitializedRef = useRef(false)

	// Initialize audio context and rubberband
	const initializeAudio = useCallback(async () => {
		if (isInitializedRef.current) return

		try {
			// Initialize AudioContext
			if (!audioContextRef.current) {
				audioContextRef.current = new (
					window.AudioContext || (window as unknown as typeof AudioContext)
				)()
			}

			// Initialize RubberBand WASM
			if (!rubberBandApiRef.current) {
				// Load the WASM module
				const wasm = await WebAssembly.compileStreaming(
					fetch("/rubberband.wasm"),
				)
				rubberBandApiRef.current = await RubberBandInterface.initialize(wasm)
			}

			isInitializedRef.current = true
		} catch (error) {
			console.error("Failed to initialize audio effects:", error)
		}
	}, [])

	// Process audio with effects
	const processAudio = useCallback(
		async (audioBuffer: AudioBuffer, tempo?: number, pitch?: number) => {
			if (!audioContextRef.current || !rubberBandApiRef.current) {
				await initializeAudio()
			}

			if (!audioContextRef.current || !rubberBandApiRef.current) {
				throw new Error("Audio context not initialized")
			}

			setEffects((prev) => ({ ...prev, isProcessing: true }))

			try {
				const rbApi = rubberBandApiRef.current
				const sampleRate = audioBuffer.sampleRate
				const channels = audioBuffer.numberOfChannels

				// Use provided values or fall back to state
				const pitchScale = pitch ?? effects.pitch
				const tempoRatio = 1.0 / (tempo ?? effects.tempo)

				// Get input channel data
				const channelBuffers: Float32Array[] = []
				for (let channel = 0; channel < channels; channel++) {
					channelBuffers.push(audioBuffer.getChannelData(channel))
				}

				// Calculate output size
				const outputSamples = Math.ceil(channelBuffers[0].length * tempoRatio)
				const outputBuffers = channelBuffers.map(
					() => new Float32Array(outputSamples),
				)

				// Create RubberBand state
				const rbState = rbApi.rubberband_new(sampleRate, channels, 0, 1, 1)
				rbApi.rubberband_set_pitch_scale(rbState, pitchScale)
				rbApi.rubberband_set_time_ratio(rbState, tempoRatio)

				const samplesRequired = rbApi.rubberband_get_samples_required(rbState)

				// Allocate memory for channel pointers and data
				const channelArrayPtr = rbApi.malloc(channels * 4)
				const channelDataPtr: number[] = []

				for (let channel = 0; channel < channels; channel++) {
					const bufferPtr = rbApi.malloc(samplesRequired * 4)
					channelDataPtr.push(bufferPtr)
					rbApi.memWritePtr(channelArrayPtr + channel * 4, bufferPtr)
				}

				rbApi.rubberband_set_expected_input_duration(
					rbState,
					channelBuffers[0].length,
				)

				// Study phase
				let read = 0
				while (read < channelBuffers[0].length) {
					for (let i = 0; i < channelBuffers.length; i++) {
						rbApi.memWrite(
							channelDataPtr[i],
							channelBuffers[i].subarray(read, read + samplesRequired),
						)
					}
					const remaining = Math.min(
						samplesRequired,
						channelBuffers[0].length - read,
					)
					read += remaining
					const isFinal = read >= channelBuffers[0].length
					rbApi.rubberband_study(
						rbState,
						channelArrayPtr,
						remaining,
						isFinal ? 1 : 0,
					)
				}

				// Process phase
				read = 0
				let write = 0

				const tryRetrieve = (final = false) => {
					while (true) {
						const available = rbApi.rubberband_available(rbState)
						if (available < 1) break
						if (!final && available < samplesRequired) break

						const recv = rbApi.rubberband_retrieve(
							rbState,
							channelArrayPtr,
							Math.min(samplesRequired, available),
						)
						for (let i = 0; i < channelDataPtr.length; i++) {
							if (write + recv <= outputBuffers[i].length) {
								outputBuffers[i].set(
									rbApi.memReadF32(channelDataPtr[i], recv),
									write,
								)
							}
						}
						write += recv
					}
				}

				while (read < channelBuffers[0].length) {
					for (let i = 0; i < channelBuffers.length; i++) {
						rbApi.memWrite(
							channelDataPtr[i],
							channelBuffers[i].subarray(read, read + samplesRequired),
						)
					}
					const remaining = Math.min(
						samplesRequired,
						channelBuffers[0].length - read,
					)
					read += remaining
					const isFinal = read >= channelBuffers[0].length
					rbApi.rubberband_process(
						rbState,
						channelArrayPtr,
						remaining,
						isFinal ? 1 : 0,
					)
					tryRetrieve(false)
				}
				tryRetrieve(true)

				// Clean up memory
				for (const ptr of channelDataPtr) {
					rbApi.free(ptr)
				}
				rbApi.free(channelArrayPtr)
				rbApi.rubberband_delete(rbState)

				// Create output AudioBuffer
				const outputBuffer = audioContextRef.current.createBuffer(
					channels,
					Math.min(write, outputSamples),
					sampleRate,
				)

				// Copy processed data to output buffer
				for (let channel = 0; channel < channels; channel++) {
					const channelData = outputBuffer.getChannelData(channel)
					const processedData = outputBuffers[channel].subarray(
						0,
						outputBuffer.length,
					)
					channelData.set(processedData)
				}

			setEffects((prev) => ({
				...prev,
				processedBuffer: outputBuffer,
				isProcessing: false,
			}))

			return outputBuffer
		} catch (error) {
			console.error("Error processing audio:", error)
			setEffects((prev) => ({ ...prev, isProcessing: false }))
			throw error
		}
	},
	[initializeAudio],
)	// Load and decode audio file
	const loadAudioFile = useCallback(
		async (audioUrl: string): Promise<AudioBuffer> => {
			if (!audioContextRef.current) {
				await initializeAudio()
			}

			if (!audioContextRef.current) {
				throw new Error("Audio context not initialized")
			}

			try {
				const response = await fetch(audioUrl)
				const arrayBuffer = await response.arrayBuffer()
				const audioBuffer =
					await audioContextRef.current.decodeAudioData(arrayBuffer)
				return audioBuffer
			} catch (error) {
				console.error("Error loading audio file:", error)
				throw error
			}
		},
		[initializeAudio],
	)

	// Update tempo
	const setTempo = useCallback((tempo: number) => {
		setEffects((prev) => ({
			...prev,
			tempo: Math.max(0.5, Math.min(2.0, tempo)),
		}))
	}, [])

	// Update pitch
	const setPitch = useCallback((pitch: number) => {
		setEffects((prev) => ({
			...prev,
			pitch: Math.max(0.5, Math.min(2.0, pitch)),
		}))
	}, [])

	// Reset effects to default
	const resetEffects = useCallback(() => {
		setEffects((prev) => ({
			...prev,
			tempo: 1.0,
			pitch: 1.0,
			processedBuffer: null,
		}))
	}, [])

	// Cleanup
	useEffect(() => {
		return () => {
			// RubberBand WASM doesn't require explicit disposal like this
			rubberBandApiRef.current = null
			if (
				audioContextRef.current &&
				audioContextRef.current.state !== "closed"
			) {
				audioContextRef.current.close()
				audioContextRef.current = null
			}
			isInitializedRef.current = false
		}
	}, [])

	return {
		tempo: effects.tempo,
		pitch: effects.pitch,
		isProcessing: effects.isProcessing,
		processedBuffer: effects.processedBuffer,
		setTempo,
		setPitch,
		resetEffects,
		processAudio,
		loadAudioFile,
		initializeAudio,
	}
}
