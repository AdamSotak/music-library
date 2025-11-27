// import { useEffect, useRef, useState } from "react"
// import { Button } from "./ui/button"
// import { router } from "@inertiajs/react"
// import Quagga from "@ericblade/quagga2"

// export default function BarcodeScanner() {
//     const containerRef = useRef<HTMLDivElement>(null)
//     const [active, setActive] = useState(false)
//     const [error, setError] = useState<string | null>(null)
//     const [scanned, setScanned] = useState<string | null>(null)
//     const [usingRear, setUsingRear] = useState(true)

//     const stopScanner = () => {
//         try { Quagga.stop() } catch { }
//         setActive(false)
//         setError(null)
//         setScanned(null)
//         Quagga.offDetected(onDetected as any)
//         // Ensure Quagga doesn’t leave elements behind
//         if (containerRef.current) {
//             containerRef.current.innerHTML = ""
//         }
//     }

//     const onDetected = (result: any) => {
//         const code = result?.codeResult?.code
//         if (!code || scanned) return
//         setScanned(code)
//         setTimeout(() => {
//             stopScanner()
//             router.visit(`/tracks/${code}`, { onSuccess: () => window.dispatchEvent(new CustomEvent("playTrack")) })
//         }, 150)
//     }

//     const startScanner = async () => {
//         setError(null)
//         setScanned(null)
//         setActive(true)

//         try {
//             await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
//         } catch {
//             setError("Camera permission denied. Allow access and use HTTPS or localhost.")
//             setActive(false)
//             return
//         }

//         if (!containerRef.current) {
//             setError("Scanner view not ready.")
//             setActive(false)
//             return
//         }

//         // Clean container before init
//         containerRef.current.innerHTML = ""

//         Quagga.init(
//             {
//                 inputStream: {
//                     type: "LiveStream",
//                     target: containerRef.current,
//                     area: { top: "0%", right: "0%", left: "0%", bottom: "0%" },
//                     constraints: {
//                         facingMode: usingRear ? "environment" : "user",
//                         width: { ideal: 1280 },
//                         height: { ideal: 720 },
//                         aspectRatio: { ideal: 1.777 },
//                     },
//                 },
//                 decoder: { readers: ["code_128_reader"] },
//                 locate: true,
//                 locator: { patchSize: "medium", halfSample: true },
//             },
//             (err) => {
//                 if (err) {
//                     setError("Scanner initialization failed.")
//                     setActive(false)
//                     return
//                 }
//                 Quagga.onDetected(onDetected as any)
//                 Quagga.start()
//             }
//         )
//     }

//     const toggleCamera = async () => {
//         const next = !usingRear
//         setUsingRear(next)
//         if (!active) return
//         stopScanner()
//         setActive(true)
//         startScanner()
//     }

//     useEffect(() => {
//         return () => { stopScanner() }
//     }, [])

//     return (
//         <div className="flex flex-col items-center gap-4 p-4">
//             <div className="w-full max-w-2xl">
//                 {!active ? (
//                     <div className="flex flex-col items-center gap-4 w-full">
//                         <div className="w-full aspect-video bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
//                             <svg className="w-24 h-24 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
//                                 <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
//                             </svg>
//                         </div>
//                         <div className="flex items-center gap-3 w-full">
//                             <Button onClick={startScanner} className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold flex-1">
//                                 Start Scan
//                             </Button>
//                             <Button onClick={toggleCamera} className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold flex-1">
//                                 {usingRear ? "Use Front Camera" : "Use Rear Camera"}
//                             </Button>
//                         </div>
//                         {error && <p className="text-sm text-red-500 text-center">{error}</p>}
//                     </div>
//                 ) : (
//                     <div className="flex flex-col items-center gap-4 w-full">
//                         <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
//                             <div
//                                 ref={containerRef}
//                                 className="w-full h-full"
//                                 style={{ position: "relative", overflow: "hidden" }}
//                             />
//                             {scanned && (
//                                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded">
//                                     <span className="text-spotify-green text-sm">{scanned}</span>
//                                 </div>
//                             )}
//                         </div>
//                         <div className="flex items-center gap-3 w-full">
//                             <Button onClick={stopScanner} className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold flex-1">
//                                 Stop
//                             </Button>
//                             <Button onClick={toggleCamera} className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold flex-1">
//                                 Switch Camera
//                             </Button>
//                         </div>
//                         {error && (
//                             <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 w-full">
//                                 <p className="text-red-500 text-sm break-all">{error}</p>
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>
//         </div>
//     )
// }