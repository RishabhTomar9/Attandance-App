import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import * as faceapi from "face-api.js";
import { functions } from "../../services/firebase";
import { httpsCallable } from "firebase/functions";
import { Loader2, MapPin, CheckCircle, AlertCircle, RefreshCw, ScanFace, QrCode } from "lucide-react";
import Card from "../../components/ui/Card";

export default function ManagerScanner() {
    // State Machine: 'init' | 'scan-qr' | 'scan-face' | 'verifying' | 'result'
    const [step, setStep] = useState('scan-qr');

    const [qrToken, setQrToken] = useState(null);
    const [faceEmbedding, setFaceEmbedding] = useState(null);

    const [result, setResult] = useState(null); // { message, type, user }
    const [error, setError] = useState("");
    const [location, setLocation] = useState(null);

    // Face AI
    const videoRef = useRef();
    const [modelsLoaded, setModelsLoaded] = useState(false);

    // 1. Init Location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => setError("Location access denied. Cannot verify attendance.")
            );
        } else {
            setError("Geolocation not supported.");
        }
    }, [step]);

    // 2. Load Models (Preload for Step 2)
    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (err) {
                console.error("AI Model error", err);
            }
        };
        loadModels();
    }, []);

    // 3. Init QR Scanner (Only when in 'scan-qr' step)
    useEffect(() => {
        if (step !== 'scan-qr') return;

        const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);

        scanner.render((decodedText) => {
            scanner.clear();
            setQrToken(decodedText);
            setStep('scan-face'); // Move to next step
        }, (err) => { /* ignore */ });

        return () => {
            scanner.clear().catch(e => console.error(e));
        };
    }, [step]);

    // 4. Handle Face Detection (Only when in 'scan-face' step)
    useEffect(() => {
        if (step !== 'scan-face' || !modelsLoaded) return;

        // Start Camera for Face
        navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
            if (videoRef.current) videoRef.current.srcObject = stream;
        });

        // Loop detection
        const interval = setInterval(async () => {
            if (!videoRef.current) return;

            const detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceDescriptor();

            if (detections && detections.detection.score > 0.85) {
                // High confidence face found
                setFaceEmbedding(Array.from(detections.descriptor));

                // Stop Camera
                const stream = videoRef.current.srcObject;
                stream?.getTracks().forEach(track => track.stop());

                // Trigger Submission
                submitAttendance(qrToken, Array.from(detections.descriptor));
            }
        }, 500);

        return () => clearInterval(interval);
    }, [step, modelsLoaded, qrToken]);

    const submitAttendance = async (token, embedding) => {
        if (!location) {
            setError("Waiting for GPS...");
            return;
        }
        setStep('verifying');
        setError("");

        try {
            const markAttendance = httpsCallable(functions, "markAttendance");
            const res = await markAttendance({
                qrToken: token,
                lat: location.lat,
                lng: location.lng,
                wifiSSID: "ZinAttend_Office_WiFi", // Mock
                faceEmbedding: embedding // ADDED: Biometric data
            });
            setResult(res.data);
            setStep('result');
        } catch (err) {
            console.error(err);
            setError(err.message || "Attendance failed");
            setStep('result');
        }
    };

    const reset = () => {
        setQrToken(null);
        setFaceEmbedding(null);
        setResult(null);
        setError("");
        setStep('scan-qr');
    };

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 text-center">Biometric Terminal</h1>

            {/* Status Bar */}
            <div className={`p-3 rounded-lg flex items-center justify-center gap-2 text-sm ${location ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                <MapPin size={16} />
                {location ? "GPS Active" : "Acquiring GPS..."}
            </div>

            <Card className="min-h-[400px] flex flex-col justify-center">

                {/* STEP 1: QR SCAN */}
                {step === 'scan-qr' && (
                    <div className="space-y-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-blue-600 font-bold mb-2">
                            <QrCode /> Step 1: Scan Identity
                        </div>
                        <div id="reader" className="w-full rounded-lg overflow-hidden"></div>
                        <p className="text-xs text-slate-400">Point at employee's app</p>
                    </div>
                )}

                {/* STEP 2: FACE SCAN */}
                {step === 'scan-face' && (
                    <div className="space-y-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-purple-600 font-bold mb-2">
                            <ScanFace className="animate-pulse" /> Step 2: Verify Face
                        </div>
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                            {!modelsLoaded && <div className="absolute inset-0 flex items-center justify-center text-white">Loading AI...</div>}
                            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                            <div className="absolute inset-0 border-2 border-purple-500/50 rounded-lg animate-pulse"></div>
                        </div>
                        <p className="text-xs text-slate-400">Ensure employee face is visible</p>
                    </div>
                )}

                {/* STEP 3: LOADING */}
                {step === 'verifying' && (
                    <div className="flex flex-col items-center justify-center space-y-4 py-12">
                        <Loader2 className="animate-spin text-blue-600" size={64} />
                        <div className="text-center">
                            <h3 className="font-bold text-slate-800">Verifying Biometrics...</h3>
                            <p className="text-xs text-slate-500">Checking Face Match & Geofence</p>
                        </div>
                    </div>
                )}

                {/* STEP 4: RESULT */}
                {step === 'result' && (
                    <div className="text-center py-8 space-y-4">
                        {result ? (
                            <div className="flex flex-col items-center text-emerald-600">
                                <CheckCircle size={64} className="mb-4" />
                                <h2 className="text-xl font-bold">Punch Recorded</h2>
                                <p className="text-slate-600">{result.message}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-rose-600">
                                <AlertCircle size={64} className="mb-4" />
                                <h2 className="text-xl font-bold">Verification Failed</h2>
                                <p className="text-slate-800 font-medium px-4">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={reset}
                            className="bg-slate-900 text-white px-8 py-3 rounded-xl hover:bg-slate-800 flex items-center gap-2 mx-auto shadow-lg"
                        >
                            <RefreshCw size={18} /> Next User
                        </button>
                    </div>
                )}

            </Card>
        </div>
    );
}
