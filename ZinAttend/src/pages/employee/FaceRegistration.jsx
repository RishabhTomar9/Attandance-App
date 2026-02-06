import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { functions } from "../../services/firebase";
import { httpsCallable } from "firebase/functions";
import { Loader2, Camera, CheckCircle, AlertTriangle, ScanFace } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import { useNavigate } from "react-router-dom";

export default function FaceRegistration() {
    const videoRef = useRef();
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [faceDetected, setFaceDetected] = useState(null); // holds descriptor
    const [registering, setRegistering] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const { user, getIdToken } = useAuth();
    const navigate = useNavigate();

    // Load Models
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
                console.error("Model load failed", err);
                setError("Failed to load AI models. Check connection.");
            }
        };
        loadModels();
    }, []);

    // Start Camera
    useEffect(() => {
        if (modelsLoaded) {
            startVideo();
        }
    }, [modelsLoaded]);

    const startVideo = () => {
        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch((err) => setError("Camera access denied."));
    };

    const handleVideoPlay = () => {
        setDetecting(true);
        const interval = setInterval(async () => {
            if (!videoRef.current) return;
            if (faceDetected) return; // Stop if we have a lock

            const detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceDescriptor();

            if (detections) {
                // We got a face!
                // To prevent blurry captures, we could check extraction confidence or do multiple samples.
                // For MVP, if score > 0.8, take it.
                if (detections.detection.score > 0.8) {
                    setFaceDetected(detections.descriptor); // Float32Array
                    setDetecting(false);
                    // Stop video? No, keep showing for user confirmation?
                    // clearInterval(interval); 
                }
            }
        }, 500);
        return () => clearInterval(interval);
    };

    const handleRegister = async () => {
        if (!faceDetected) return;
        setRegistering(true);
        setError("");

        try {
            // Convert Float32Array to normal Array for Firestore
            const embeddingArray = Array.from(faceDetected);

            // Get the current user's ID token for the Express API
            const idToken = await getIdToken();

            // The URL will be your Firebase Functions URL + /api/registerFace
            // Usually: https://us-central1-<project-id>.cloudfunctions.net/api/registerFace
            // For now, we assume the default region.
            const response = await fetch(`https://us-central1-attandance-by-zintrix.cloudfunctions.net/api/registerFace`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ embedding: embeddingArray })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to save biometric data.");
            }

            setSuccess(true);
            setTimeout(() => navigate("/employee"), 3000);
        } catch (err) {
            console.error("Registration failed", err);
            setError(err.message || "Failed to save biometric data.");
            setFaceDetected(null); // Reset
            setDetecting(true); // Retry
        }
        setRegistering(false);
    };

    const handleRetake = () => {
        setFaceDetected(null);
        setDetecting(true);
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-800">Face Registration</h1>
                <p className="text-slate-500">Secure your identity for biometric attendance.</p>
            </div>

            <Card className="overflow-hidden p-0 relative bg-black">
                {/* Camera View */}
                <div className="relative aspect-[4/3] bg-black">
                    {!modelsLoaded ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                            <Loader2 className="animate-spin mb-2" size={32} />
                            <p className="text-sm">Loading AI Models...</p>
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            onPlay={handleVideoPlay}
                            className={`w-full h-full object-cover transform scale-x-[-1] ${success ? 'opacity-50' : ''}`}
                        />
                    )}

                    {/* Overlay UI */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        {faceDetected ? (
                            success ? (
                                <CheckCircle size={64} className="text-emerald-500 animate-bounce" />
                            ) : (
                                <div className="border-4 border-emerald-500 rounded-xl w-48 h-48 animate-pulse shadow-[0_0_50px_rgba(16,185,129,0.5)]"></div>
                            )
                        ) : (
                            modelsLoaded && <div className="border-2 border-white/30 border-dashed rounded-full w-48 h-64"></div>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 bg-white space-y-4">
                    {success ? (
                        <div className="text-center text-emerald-600 font-bold">
                            <p>Registration Complete!</p>
                            <p className="text-xs text-slate-500 font-normal mt-1">Redirecting...</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center">
                                {faceDetected ? (
                                    <p className="text-emerald-600 font-bold flex items-center justify-center gap-2">
                                        <ScanFace /> Face Capture Locked
                                    </p>
                                ) : (
                                    <p className="text-slate-500 text-sm">Position your face in the oval...</p>
                                )}
                                {error && <p className="text-rose-600 text-xs mt-2">{error}</p>}
                            </div>

                            <div className="flex gap-3">
                                {faceDetected ? (
                                    <>
                                        <button
                                            onClick={handleRetake}
                                            disabled={registering}
                                            className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                        >
                                            Retake
                                        </button>
                                        <button
                                            onClick={handleRegister}
                                            disabled={registering}
                                            className="flex-1 py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            {registering ? <Loader2 className="animate-spin" /> : "Save Face ID"}
                                        </button>
                                    </>
                                ) : (
                                    <button disabled className="w-full py-3 text-slate-400 bg-slate-100 rounded-xl cursor-loading font-medium">
                                        Scanning...
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Card>

            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-800 text-xs leading-relaxed">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                    <strong>Privacy Note:</strong> We do not store your photo.
                    Only a mathematical representation (128 random numbers) includes
                    facial distances is saved securely. This cannot be used to recreate your image.
                </p>
            </div>
        </div>
    );
}
