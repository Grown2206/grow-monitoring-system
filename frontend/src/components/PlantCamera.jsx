import { useState, useRef } from 'react';
import { Camera, X, Check, Download, Upload } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import useAsyncAction from '../hooks/useAsyncAction';

export default function PlantCamera({ plantId, plantName, onPhotoTaken }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { showAlert } = useAlert();
  const { loading: uploading, execute } = useAsyncAction();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
        audio: false
      });

      setStream(mediaStream);
      setIsOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Fehler beim Zugriff auf Kamera:', error);
      showAlert('Kamera-Zugriff verweigert oder nicht verfügbar', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsOpen(false);
    setPhoto(null);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Konvertiere zu Blob
    canvas.toBlob((blob) => {
      setPhoto({
        blob,
        url: URL.createObjectURL(blob),
        timestamp: new Date().toISOString()
      });
    }, 'image/jpeg', 0.9);

    // Stoppe Stream nach Foto
    stopCamera();
  };

  const savePhoto = async () => {
    if (!photo) return;

    await execute(async () => {
      const formData = new FormData();
      formData.append('photo', photo.blob, `plant-${plantId}-${Date.now()}.jpg`);
      formData.append('plantId', plantId);
      formData.append('timestamp', photo.timestamp);

      // Upload zum Backend (TODO: Backend-Endpoint erstellen)
      const response = await fetch('/api/plants/photo', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const data = await response.json();

      // Callback an Parent
      if (onPhotoTaken) {
        onPhotoTaken(data.url || photo.url);
      }

      setPhoto(null);
    }, 'Foto erfolgreich gespeichert!');
  };

  const downloadPhoto = () => {
    if (!photo) return;

    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `${plantName || 'plant'}-${new Date().toLocaleDateString()}.jpg`;
    link.click();
  };

  return (
    <>
      {/* Kamera-Button */}
      <button
        onClick={startCamera}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        <Camera className="w-4 h-4" />
        Foto aufnehmen
      </button>

      {/* Kamera Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">Pflanzenfoto aufnehmen</h3>
              <button
                onClick={stopCamera}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Preview */}
            <div className="relative bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm text-center">
                  {plantName && `Aufnahme für ${plantName}`}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 flex justify-center gap-4">
              <button
                onClick={stopCamera}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={takePhoto}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <Camera className="w-5 h-5" />
                Aufnehmen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {photo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white">Foto-Vorschau</h3>
              <button
                onClick={() => setPhoto(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview */}
            <div className="bg-black">
              <img
                src={photo.url}
                alt="Plant photo"
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            </div>

            {/* Actions */}
            <div className="p-4 flex justify-center gap-4">
              <button
                onClick={() => setPhoto(null)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Verwerfen
              </button>
              <button
                onClick={downloadPhoto}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={savePhoto}
                disabled={uploading}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Upload className="w-5 h-5 animate-pulse" />
                    Speichert...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Speichern
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Canvas for Photo Capture */}
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}
