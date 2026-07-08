import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, AlertTriangle, ArrowRight, RefreshCw, XCircle, Info, Smile } from "lucide-react";
import { WasteCategory } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ScanViewProps {
  onAutoRoute: (category: WasteCategory, autoWeight?: number) => void;
  onNavigate: (screen: 'home' | 'scan' | 'add' | 'profile' | 'analytics' | 'history') => void;
}

export default function ScanView({ onAutoRoute, onNavigate }: ScanViewProps) {
  const [sourceSelected, setSourceSelected] = useState<'camera' | 'upload' | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [classificationResult, setClassificationResult] = useState<{
    category: 'human' | 'biodegradable' | 'non-biodegradable';
    subcategory: WasteCategory | null;
    reason: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Trigger permission request and start camera
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      // Prompt user for camera permission
      const constraints = {
        video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      };
      
      // Stop existing tracks if any
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Could not initialize camera stream:", err?.message || err);
      setErrorMessage("Could not access camera. Please ensure permissions are granted or upload an image instead.");
      setSourceSelected(null);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Re-start camera when facingMode changes
  useEffect(() => {
    if (sourceSelected === 'camera') {
      startCamera();
    }
    return () => stopCamera();
  }, [facingMode, sourceSelected]);

  // Handle switching camera
  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Capture Image from Video Stream
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Mirror the image if using front camera
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setImagePreview(dataUrl);
        stopCamera();
        classifyImage(dataUrl);
      }
    } catch (err) {
      console.error("Capture snapshot error:", err);
      setErrorMessage("Failed to capture picture.");
    }
  };

  // Handle local image upload selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      classifyImage(dataUrl);
    };
    reader.onerror = () => {
      setErrorMessage("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Trigger AI classification
  const classifyImage = async (base64Image: string) => {
    setLoading(true);
    setClassificationResult(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || "API server error.");
      }

      const result = await response.json();
      setClassificationResult(result);

      // Auto route into add biomass parameters flow immediately if biodegradable
      if (result.category === "biodegradable") {
        onAutoRoute(result.subcategory || 'Vegetable Waste');
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset scanner state
  const handleReset = () => {
    stopCamera();
    setSourceSelected(null);
    setImagePreview(null);
    setClassificationResult(null);
    setErrorMessage(null);
  };

  return (
    <div id="scan_view" className="space-y-6 pb-24 relative">
      
      {/* Header */}
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-natural-dark">
          AI Bio-Classifier
        </h1>
        <p className="text-sm text-natural-dark/65 mt-1 font-medium">
          Upload a waste image to estimate biogas, electricity, and LPG equivalent using AI.
        </p>
      </div>

      <AnimatePresence mode="wait">
        
        {/* Step 1: Selection Screen */}
        {sourceSelected === null && !imagePreview && (
          <motion.div 
            key="selector"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 gap-4"
          >
            {/* Live Camera Option */}
            <button
              id="select_camera_btn"
              onClick={() => setSourceSelected('camera')}
              className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-natural-border/70 bg-natural-cream p-8 text-center shadow-sm hover:border-natural-primary hover:bg-natural-bg/40 cursor-pointer transition-all"
            >
              <div className="rounded-2xl bg-natural-bg p-4 text-natural-primary mb-4 border border-natural-border/40">
                <Camera className="h-8 w-8" />
              </div>
              <h3 className="font-sans text-base font-bold text-natural-dark">Capture with Camera</h3>
              <p className="text-xs text-natural-dark/50 mt-1.5 max-w-xs font-mono">
                Take a live picture of your waste using your device's camera (supports front/back camera toggling)
              </p>
            </button>

            {/* Gallery Upload Option */}
            <button
              id="select_upload_btn"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-natural-border/70 bg-natural-cream p-8 text-center shadow-sm hover:border-natural-primary hover:bg-natural-bg/40 cursor-pointer transition-all"
            >
              <div className="rounded-2xl bg-natural-bg p-4 text-[#4B6E80] mb-4 border border-natural-border/40">
                <Upload className="h-8 w-8" />
              </div>
              <h3 className="font-sans text-base font-bold text-natural-dark">Upload Image File</h3>
              <p className="text-xs text-natural-dark/50 mt-1.5 max-w-xs font-mono">
                Choose an image from your camera roll or device files to classify
              </p>
            </button>

            {/* Manual Entry Fallback */}
            <div className="text-center pt-2">
              <button
                id="select_manual_link"
                onClick={() => onNavigate('add')}
                className="text-sm font-semibold text-natural-primary hover:text-natural-dark hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Or select waste category manually <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Live Video Stream */}
        {sourceSelected === 'camera' && !imagePreview && (
          <motion.div 
            key="camera-stream"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col rounded-[2rem] bg-black overflow-hidden relative border border-stone-800 shadow-xl"
          >
            {/* Aspect Ratio Viewport */}
            <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              
              {/* Guidance Overlay Box */}
              <div className="absolute inset-0 border-[32px] border-black/40 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-dashed border-white/60 rounded-2xl"></div>
              </div>

              {/* Instructions top */}
              <div className="absolute top-4 left-4 right-4 text-center bg-black/60 backdrop-blur-xs py-1.5 px-3 rounded-full text-white text-[11px] font-medium font-mono">
                Align biomass waste within the central square
              </div>
            </div>

            {/* Camera Controls Panel */}
            <div className="bg-stone-900 p-5 flex items-center justify-between">
              <button
                id="cam_cancel_btn"
                onClick={handleReset}
                className="text-xs font-semibold text-stone-400 hover:text-white px-3 py-2 cursor-pointer font-mono"
              >
                Cancel
              </button>

              {/* Shutter Button */}
              <button
                id="cam_capture_btn"
                onClick={captureSnapshot}
                className="h-16 w-16 rounded-full border-4 border-white bg-natural-primary hover:bg-natural-primary/95 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center text-white"
                title="Capture Frame"
              >
                <div className="h-10 w-10 rounded-full bg-white/30"></div>
              </button>

              {/* Switch Camera (User / Environment) Toggle */}
              <button
                id="cam_toggle_btn"
                onClick={toggleCamera}
                className="rounded-xl bg-stone-800 p-3 text-stone-300 hover:text-white hover:bg-stone-700 cursor-pointer transition-all"
                title="Switch Camera (Front/Back)"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Analysis and Results Page */}
        {imagePreview && (
          <motion.div 
            key="analysis-panel"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Selected Image Banner */}
            <div className="relative rounded-[2rem] overflow-hidden aspect-[4/3] bg-natural-bg border border-natural-border shadow-md">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              {loading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent mb-3"></div>
                  <p className="text-sm font-semibold tracking-wide animate-pulse">Running live AI classification model...</p>
                  <p className="text-xs text-stone-400 mt-1 font-mono">Verifying bio-organic traits</p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-2xl bg-red-50 p-4 border border-red-100 space-y-3">
                <div className="flex gap-2.5 items-start">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-red-900">Analysis Failed</h4>
                    <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
                <button
                  id="error_retry_btn"
                  onClick={handleReset}
                  className="w-full py-2 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 rounded-xl cursor-pointer"
                >
                  Try scanning another image
                </button>
              </div>
            )}

            {/* Success Results Form */}
            {classificationResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                
                {/* 1. REJECT HUMAN */}
                {classificationResult.category === "human" && (
                  <div id="result_human" className="rounded-2xl bg-amber-50 p-5 border border-amber-200">
                    <div className="flex gap-3 items-start">
                      <Smile className="h-6 w-6 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-extrabold text-amber-900">Organic Waste Only Please</h4>
                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                          It looks like we detected a person in this photo. GreenLoop's Bio-Classifier is designed to analyze organic waste, not people. Please take or upload a photo of your kitchen scraps or biomass instead.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        id="human_scan_again"
                        onClick={handleReset}
                        className="flex-1 py-2.5 bg-white border border-amber-300 hover:bg-amber-100/30 text-xs font-bold text-amber-800 rounded-xl cursor-pointer transition-all"
                      >
                        Scan New Photo
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. WARNING NON-BIODEGRADABLE INLINE FALLBACK CARD */}
                {classificationResult.category === "non-biodegradable" && (
                  <div id="result_non_biodegradable" className="rounded-2xl bg-red-50 p-5 border border-red-200">
                    <div className="flex gap-3 items-start">
                      <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-extrabold text-red-900 font-sans">Non-Biodegradable Item Detected</h4>
                        <p className="text-xs text-red-800 mt-1 leading-relaxed">
                          This item cannot be converted into biogas. Please dispose of it through appropriate recycling or waste channels.
                        </p>
                        {classificationResult.reason && (
                          <p className="text-[11px] text-red-500 mt-2 font-medium font-mono">
                            ⚠ Reason: {classificationResult.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        id="non_bio_scan_again"
                        onClick={handleReset}
                        className="flex-1 py-2.5 bg-white border border-red-300 hover:bg-red-100/30 text-xs font-bold text-red-800 rounded-xl cursor-pointer"
                      >
                        Try New Scan
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. CONFIRMED BIODEGRADABLE */}
                {classificationResult.category === "biodegradable" && (
                  <div id="result_biodegradable" className="rounded-[2rem] bg-[#EFF5EE] p-5 border border-[#DCE8D9]">
                    <div className="flex gap-3 items-start">
                      <div className="rounded-full bg-natural-primary p-1.5 text-white shrink-0 mt-0.5">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-natural-dark flex items-center gap-1.5">
                          Biodegradable Waste Detected! 
                          {classificationResult.subcategory && (
                            <span className="text-[11px] bg-natural-bg text-natural-primary font-bold px-2.5 py-0.5 rounded-full border border-natural-border/60">
                              {classificationResult.subcategory}
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-natural-dark/80 mt-2 leading-relaxed">
                          {classificationResult.reason}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-natural-border/60 flex flex-col gap-2">
                      <button
                        id="route_to_add_btn"
                        onClick={() => {
                          // Auto route into add biomass parameters flow
                          onAutoRoute(classificationResult.subcategory || 'Vegetable Waste');
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-natural-primary hover:bg-natural-primary/95 text-white font-bold py-3 text-xs shadow-md shadow-stone-200 transition-all cursor-pointer"
                      >
                        Calculate Energy Yield <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        id="route_scan_another"
                        onClick={handleReset}
                        className="w-full py-2 text-center text-xs font-semibold text-natural-primary hover:underline cursor-pointer font-mono"
                      >
                        Scan another item
                      </button>
                    </div>
                  </div>
                )}

              </motion.div>
            )}

          </motion.div>
        )}

      </AnimatePresence>

      {/* Pop-up Modal for Non-Biodegradable Waste */}
      <AnimatePresence>
        {classificationResult && classificationResult.category === "non-biodegradable" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleReset}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            {/* Modal Card Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-6 max-w-sm w-full border border-stone-100 shadow-2xl relative z-10 text-center space-y-4"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 border border-red-100 shadow-xs">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-sans text-base font-extrabold text-stone-900">
                  Non-Biodegradable Item Detected
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed font-medium">
                  This item cannot be converted into biogas. Please dispose of it through appropriate recycling or waste channels.
                </p>
                {classificationResult.reason && (
                  <p className="text-[11px] text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-100 mt-2 font-mono text-left max-h-24 overflow-y-auto">
                    {classificationResult.reason}
                  </p>
                )}
              </div>
              <button
                type="button"
                id="non_bio_modal_close"
                onClick={handleReset}
                className="w-full py-3 bg-natural-primary hover:bg-natural-primary/95 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Input File - placed at root level to ensure it never unmounts during selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

    </div>
  );
}
