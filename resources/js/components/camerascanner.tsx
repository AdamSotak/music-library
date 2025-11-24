import { useRef, useState, useEffect } from "react"
import { Button } from "./ui/button"
import { router } from "@inertiajs/react"
import axios from "axios"

export default function BarcodeScanner() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [scanning, setScanning] = useState(false)
    const [success, setSuccess] = useState(false)
    const [videoReady, setVideoReady] = useState(false)

    const startScanning = async () => {
        setError(null)
        setVideoReady(false)
        console.log("Starting camera...")

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            })

            console.log("Got media stream:", mediaStream)
            console.log("Video tracks:", mediaStream.getVideoTracks())

            setStream(mediaStream)
            setIsScanning(true)
        } catch (err) {
            console.error("Error accessing camera:", err)
            setError("Could not access camera. Please check permissions.")
        }
    }

    const stopScanning = () => {
        console.log("Stopping camera...")
        if (stream) {
            stream.getTracks().forEach((track) => {
                console.log("Stopping track:", track)
                track.stop()
            })
            setStream(null)
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        setIsScanning(false)
        setSuccess(false)
        setVideoReady(false)
    }

    const captureAndScan = async () => {
        if (!videoRef.current || !canvasRef.current || !videoReady) return

        setScanning(true)
        setError(null)
        setSuccess(false)

        const canvas = canvasRef.current
        const video = videoRef.current

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        console.log("Captured image dimensions:", canvas.width, canvas.height)

        const tryScanImage = async (blob: Blob, orientation: string) => {
            const formData = new FormData()
            formData.append("image", blob, "barcode.png")

            const response = await axios.post("/tracks/scan", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            })

            const data = response.data
            console.log(`Scan response (${orientation}):`, data)
            return data
        }

        const tryBothOrientations = async () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.save()
            ctx.scale(-1, 1)
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
            ctx.restore()

            const normalBlob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, "image/png")
            })

            if (normalBlob) {
                console.log("Trying normal orientation, blob size:", normalBlob.size, "bytes")
                const result = await tryScanImage(normalBlob, "normal")
                if (result && result.success && result.track_id) {
                    return result
                }
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            const mirroredBlob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, "image/png")
            })

            if (mirroredBlob) {
                console.log("Trying mirrored orientation, blob size:", mirroredBlob.size, "bytes")
                const result = await tryScanImage(mirroredBlob, "mirrored")
                if (result && result.success && result.track_id) {
                    return result
                }
            }

            return null
        }

        try {
            const result = await tryBothOrientations()

            if (result && result.track_id) {
                setSuccess(true)
                setTimeout(() => {
                    stopScanning()
                    router.visit(`/tracks/${result.track_id}`, {
                        onSuccess: () => {
                            window.dispatchEvent(new CustomEvent("playTrack"))
                        },
                    })
                }, 800)
            } else {
                setError("Could not decode barcode. Try adjusting the angle or distance.")
                setScanning(false)
            }
        } catch (err: any) {
            console.error("Overall scan error:", err)

            if (err.response?.status === 419) {
                setError("Session expired. Please refresh the page.")
            } else if (err.response?.data?.error) {
                setError(err.response.data.error)
            } else {
                setError("Failed to scan barcode. Please try again.")
            }
            setScanning(false)
        }
    }

    useEffect(() => {
        const video = videoRef.current
        if (!video || !stream) return

        console.log("Attaching stream to video element...")

        const handleLoadedMetadata = () => {
            console.log("Video metadata loaded")
            console.log("Video dimensions:", video.videoWidth, video.videoHeight)

            video
                .play()
                .then(() => {
                    console.log("Video playing successfully")
                    setVideoReady(true)
                })
                .catch((err) => {
                    console.error("Error playing video:", err)
                    setError("Failed to start camera preview")
                })
        }

        const handlePlay = () => {
            console.log("Video play event fired")
            setVideoReady(true)
        }

        const handleCanPlay = () => {
            console.log("Video can play")
        }

        const handleError = (e: Event) => {
            console.error("Video error:", e)
            setError("Video playback error")
        }

        video.addEventListener("loadedmetadata", handleLoadedMetadata)
        video.addEventListener("play", handlePlay)
        video.addEventListener("canplay", handleCanPlay)
        video.addEventListener("error", handleError)

        video.srcObject = stream
        console.log("Set srcObject, current readyState:", video.readyState)

        video.load()

        return () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata)
            video.removeEventListener("play", handlePlay)
            video.removeEventListener("canplay", handleCanPlay)
            video.removeEventListener("error", handleError)
        }
    }, [stream])

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            {!isScanning ? (
                <div className="flex flex-col items-center gap-4 w-full">
                    <div className="w-full max-w-2xl aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
                        <svg
                            className="w-24 h-24 text-zinc-600"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M3 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zm6 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4zm6 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4z" />
                        </svg>
                    </div>
                    <Button
                        onClick={startScanning}
                        className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold w-full max-w-xs"
                    >
                        Start Camera
                    </Button>
                    <p className="text-sm text-zinc-400 text-center max-w-md">
                        Scan a music code to instantly play any track
                    </p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 w-full">
                    <div className="relative w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden">
                        {!videoReady && (
                            <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center z-10">
                                <div className="flex flex-col items-center gap-3">
                                    <svg
                                        className="w-8 h-8 animate-spin text-spotify-green"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    <p className="text-zinc-400 text-sm">Loading camera...</p>
                                </div>
                            </div>
                        )}

                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ transform: "scaleX(-1)" }}
                            aria-label="Camera feed for scanning music barcodes"
                        >
                            <track kind="captions" />
                        </video>

                        {videoReady && (
                            <div
                                className={`absolute inset-0 border-4 pointer-events-none transition-colors duration-300 ${success
                                    ? "border-spotify-green"
                                    : scanning
                                        ? "border-yellow-500"
                                        : "border-spotify-green/50"
                                    }`}
                            >
                                <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                                <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-white"></div>

                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-3/4 h-1/2 border-2 border-dashed border-white/50 rounded-lg"></div>
                                </div>

                                {(scanning || success) && (
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 px-6 py-3 rounded-full">
                                        {success ? (
                                            <div className="flex items-center gap-2 text-spotify-green">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                </svg>
                                                <span className="font-semibold">Found! Opening track...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-yellow-500">
                                                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                <span className="font-semibold">Scanning...</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex gap-3 w-full max-w-xs">
                        <Button
                            onClick={captureAndScan}
                            disabled={scanning || success || !videoReady}
                            className="flex-1 bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold disabled:opacity-50"
                        >
                            {!videoReady
                                ? "Loading..."
                                : scanning
                                    ? "Scanning..."
                                    : success
                                        ? "Opening..."
                                        : "Capture & Scan"}
                        </Button>
                        <Button
                            onClick={stopScanning}
                            disabled={scanning}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold disabled:opacity-50"
                        >
                            Cancel
                        </Button>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 w-full max-w-md">
                            <p className="text-red-500 text-sm text-center">{error}</p>
                        </div>
                    )}

                    <p className="text-sm text-zinc-400 text-center max-w-md">
                        {videoReady
                            ? "Position the music code within the frame and tap 'Capture & Scan'"
                            : "Waiting for camera to start..."}
                    </p>
                </div>
            )}
        </div>
    )
}
