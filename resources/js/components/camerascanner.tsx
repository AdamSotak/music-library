import { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { router } from '@inertiajs/react';

export default function BarcodeScanner() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [success, setSuccess] = useState(false);

    const startScanning = async () => {
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setIsScanning(true);
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Could not access camera. Please check permissions.');
        }
    };

    const stopScanning = () => {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            setStream(null);
        }
        setIsScanning(false);
        setSuccess(false);
    };

    const captureAndScan = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setScanning(true);
        setError(null);
        setSuccess(false);

        const canvas = canvasRef.current;
        const video = videoRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
            if (!blob) {
                setError('Failed to capture image');
                setScanning(false);
                return;
            }

            const formData = new FormData();
            formData.append('image', blob, 'barcode.png');

            try {
                const response = await fetch('/tracks/scan', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                });

                const data = await response.json();

                if (response.ok && data.track_id) {
                    setSuccess(true);
                    setTimeout(() => {
                        stopScanning();
                        router.visit(`/tracks/${data.track_id}`);
                    }, 1000);
                } else {
                    setError(data.error || 'Could not decode barcode. Try again.');
                    setScanning(false);
                }
            } catch (err) {
                console.error('Scan error:', err);
                setError('Failed to scan barcode. Please try again.');
                setScanning(false);
            }
        }, 'image/png');
    };

    // Auto-play video when stream is ready
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.play().catch(err => {
                console.error('Error playing video:', err);
                setError('Failed to start camera preview');
            });
        }
    }, [stream]);

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            {!isScanning ? (
                <div className="flex flex-col items-center gap-4 w-full">
                    <div className="w-full max-w-2xl aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
                        <svg className="w-24 h-24 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
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
                    <div className="relative w-full max-w-2xl">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full rounded-lg bg-black"
                            aria-label="Camera feed for scanning music barcodes"
                        >
                            <track kind="captions" />
                        </video>

                        {/* Scanning overlay */}
                        <div className={`absolute inset-0 border-4 rounded-lg pointer-events-none transition-colors duration-300 ${success ? 'border-spotify-green' :
                            scanning ? 'border-yellow-500' :
                                'border-spotify-green/50'
                            }`}>
                            {/* Corner markers */}
                            <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                            <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-white"></div>

                            {/* Center guide */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3/4 h-1/2 border-2 border-dashed border-white/50 rounded-lg"></div>
                            </div>

                            {/* Status indicator */}
                            {(scanning || success) && (
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 px-6 py-3 rounded-full">
                                    {success ? (
                                        <div className="flex items-center gap-2 text-spotify-green">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                            </svg>
                                            <span className="font-semibold">Found!</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-yellow-500">
                                            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="font-semibold">Scanning...</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex gap-3 w-full max-w-xs">
                        <Button
                            onClick={captureAndScan}
                            disabled={scanning || success}
                            className="flex-1 bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold disabled:opacity-50"
                        >
                            {scanning ? 'Scanning...' : success ? 'Redirecting...' : 'Capture & Scan'}
                        </Button>
                        <Button
                            onClick={stopScanning}
                            variant="outline"
                            disabled={scanning}
                            className="border-white/20 text-white hover:bg-white/10"
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
                        Position the music code within the frame and tap "Capture & Scan"
                    </p>
                </div>
            )}
        </div>
    );
}