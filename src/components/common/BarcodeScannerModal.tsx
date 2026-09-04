import React, { useState, useEffect, useRef } from 'react';
import { Scan, X, Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onScan,
  onClose,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    if (isOpen) {
      // Attempt camera access
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' } })
          .then((s) => {
            stream = s;
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              setCameraActive(true);
            }
          })
          .catch((err) => {
            console.warn('Camera access not granted or not available:', err);
            setCameraError('Camera access unavailable. You can type or paste the barcode below.');
          });
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
      setCameraError('');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600">
            <Scan className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Scan Product Barcode</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Camera Viewport */}
        <div className="mt-4 relative bg-slate-950 rounded-xl overflow-hidden aspect-4/3 flex items-center justify-center">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Laser scanner target reticle */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse"></div>
              <div className="absolute border-2 border-blue-400/80 rounded-lg inset-8 pointer-events-none"></div>
            </>
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-slate-500" />
              {cameraError ? (
                <span className="text-amber-400 font-medium">{cameraError}</span>
              ) : (
                <span>Align feed bag barcode within camera view...</span>
              )}
            </div>
          )}
        </div>

        {/* Manual Barcode input */}
        <form onSubmit={handleSubmitManual} className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Barcode / SKU Entry
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. 2003005002 or POUL-LM-002"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              Lookup
            </button>
          </div>
        </form>

        <p className="mt-3 text-xs text-slate-500 text-center">
          Tip: You can also use a handheld USB/Bluetooth barcode scanner directly on the sales screen.
        </p>
      </div>
    </div>
  );
};
